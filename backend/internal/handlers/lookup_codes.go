package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type LookupCodeHandler struct {
	repo *repositories.LookupCodeRepo
}

func NewLookupCodeHandler(repo *repositories.LookupCodeRepo) *LookupCodeHandler {
	return &LookupCodeHandler{repo: repo}
}

func (h *LookupCodeHandler) Categories(c *gin.Context) {
	claims := middleware.GetClaims(c)
	cats, err := h.repo.ListCategories(c.Request.Context(), claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list categories"})
		return
	}
	c.JSON(http.StatusOK, cats)
}

func (h *LookupCodeHandler) List(c *gin.Context) {
	claims := middleware.GetClaims(c)

	tableID := c.Query("tableId")
	if tableID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tableId query parameter is required"})
		return
	}

	codes, err := h.repo.ListByTableID(c.Request.Context(), claims.ShopID, tableID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list lookup codes"})
		return
	}

	c.JSON(http.StatusOK, codes)
}

func (h *LookupCodeHandler) Create(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var code models.LookupCode
	if err := c.ShouldBindJSON(&code); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	code.ShopID = claims.ShopID
	if err := h.repo.Create(c.Request.Context(), &code); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create lookup code"})
		return
	}

	c.JSON(http.StatusCreated, code)
}

func (h *LookupCodeHandler) Update(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var code models.LookupCode
	if err := c.ShouldBindJSON(&code); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	code.ID = id
	code.ShopID = claims.ShopID
	if err := h.repo.Update(c.Request.Context(), &code); err != nil {
		if errors.Is(err, repositories.ErrStaleUpdate) {
			c.JSON(http.StatusConflict, gin.H{"error": "Record was modified by another user. Please refresh and try again."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update lookup code"})
		return
	}

	c.JSON(http.StatusOK, code)
}

func (h *LookupCodeHandler) Delete(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.repo.Delete(c.Request.Context(), claims.ShopID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete lookup code"})
		return
	}

	c.Status(http.StatusNoContent)
}
