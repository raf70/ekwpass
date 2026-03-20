package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/services"
)

type PartHandler struct {
	service *services.PartService
}

func NewPartHandler(service *services.PartService) *PartHandler {
	return &PartHandler{service: service}
}

func (h *PartHandler) List(c *gin.Context) {
	claims := middleware.GetClaims(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	search := c.Query("search")

	params := models.PaginationParams{Page: page, PageSize: pageSize, Search: search}

	parts, total, err := h.service.List(c.Request.Context(), claims.ShopID, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list parts"})
		return
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data:       parts,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

func (h *PartHandler) Search(c *gin.Context) {
	claims := middleware.GetClaims(c)

	code := c.Query("code")
	description := c.Query("description")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	parts, err := h.service.Search(c.Request.Context(), claims.ShopID, code, description, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to search parts"})
		return
	}

	if parts == nil {
		parts = []models.Part{}
	}
	c.JSON(http.StatusOK, parts)
}

func (h *PartHandler) GetByID(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid part id"})
		return
	}

	part, err := h.service.FindByID(c.Request.Context(), claims.ShopID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get part"})
		return
	}
	if part == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "part not found"})
		return
	}

	c.JSON(http.StatusOK, part)
}

func (h *PartHandler) Create(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var part models.Part
	if err := c.ShouldBindJSON(&part); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	part.ShopID = claims.ShopID

	if err := h.service.Create(c.Request.Context(), &part); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create part"})
		return
	}

	c.JSON(http.StatusCreated, part)
}

func (h *PartHandler) Update(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid part id"})
		return
	}

	var part models.Part
	if err := c.ShouldBindJSON(&part); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	part.ID = id
	part.ShopID = claims.ShopID

	if err := h.service.Update(c.Request.Context(), &part); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update part"})
		return
	}

	c.JSON(http.StatusOK, part)
}

func (h *PartHandler) Delete(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid part id"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), claims.ShopID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete part"})
		return
	}

	c.Status(http.StatusNoContent)
}
