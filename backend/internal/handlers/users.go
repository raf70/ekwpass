package handlers

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	repo *repositories.UserRepo
}

func NewUserHandler(repo *repositories.UserRepo) *UserHandler {
	return &UserHandler{repo: repo}
}

func (h *UserHandler) List(c *gin.Context) {
	claims := middleware.GetClaims(c)
	users, err := h.repo.ListByShop(c.Request.Context(), claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

func (h *UserHandler) GetByID(c *gin.Context) {
	claims := middleware.GetClaims(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	user, err := h.repo.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to find user"})
		return
	}
	if user == nil || user.ShopID != claims.ShopID {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

type createUserRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role" binding:"required,oneof=admin technician front_desk"`
}

func (h *UserHandler) Create(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var req createUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existing, _ := h.repo.FindByEmail(c.Request.Context(), req.Email)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "a user with this email already exists"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	user := &models.User{
		ShopID:       claims.ShopID,
		Email:        req.Email,
		PasswordHash: string(hash),
		Name:         req.Name,
		Role:         req.Role,
		IsActive:     true,
	}

	if err := h.repo.Create(c.Request.Context(), user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, user)
}

type updateUserRequest struct {
	Name      string `json:"name" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	Role      string `json:"role" binding:"required,oneof=admin technician front_desk"`
	IsActive  bool   `json:"isActive"`
	UpdatedAt string `json:"updatedAt"`
}

func (h *UserHandler) Update(c *gin.Context) {
	claims := middleware.GetClaims(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	existing, err := h.repo.FindByID(c.Request.Context(), id)
	if err != nil || existing == nil || existing.ShopID != claims.ShopID {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var req updateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prevent deactivating yourself
	if id == claims.UserID && !req.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "you cannot deactivate your own account"})
		return
	}

	// Prevent demoting the last admin
	if existing.Role == "admin" && req.Role != "admin" {
		users, _ := h.repo.ListByShop(c.Request.Context(), claims.ShopID)
		adminCount := 0
		for _, u := range users {
			if u.Role == "admin" && u.IsActive {
				adminCount++
			}
		}
		if adminCount <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cannot remove the last admin"})
			return
		}
	}

	// Check email uniqueness if changed
	if req.Email != existing.Email {
		dup, _ := h.repo.FindByEmail(c.Request.Context(), req.Email)
		if dup != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "a user with this email already exists"})
			return
		}
	}

	expectedAt := existing.UpdatedAt
	if req.UpdatedAt != "" {
		if parsed, err := time.Parse(time.RFC3339Nano, req.UpdatedAt); err == nil {
			expectedAt = parsed
		}
	}

	user := &models.User{
		ID:       id,
		ShopID:   claims.ShopID,
		Name:     req.Name,
		Email:    req.Email,
		Role:     req.Role,
		IsActive: req.IsActive,
	}

	if err := h.repo.Update(c.Request.Context(), user, expectedAt); err != nil {
		if errors.Is(err, repositories.ErrStaleUpdate) {
			c.JSON(http.StatusConflict, gin.H{"error": "Record was modified by another user. Please refresh and try again."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

type resetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6"`
}

func (h *UserHandler) ResetPassword(c *gin.Context) {
	claims := middleware.GetClaims(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	existing, err := h.repo.FindByID(c.Request.Context(), id)
	if err != nil || existing == nil || existing.ShopID != claims.ShopID {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	if err := h.repo.UpdatePassword(c.Request.Context(), id, string(hash)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reset password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password reset successfully"})
}
