package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/services"
)

type SaleHandler struct {
	service *services.SaleService
}

func NewSaleHandler(service *services.SaleService) *SaleHandler {
	return &SaleHandler{service: service}
}

func (h *SaleHandler) List(c *gin.Context) {
	claims := middleware.GetClaims(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	search := c.Query("search")
	status := c.Query("status")

	params := models.PaginationParams{Page: page, PageSize: pageSize, Search: search}

	sales, total, err := h.service.List(c.Request.Context(), claims.ShopID, params, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list sales"})
		return
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data:       sales,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

func (h *SaleHandler) GetByID(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sale id"})
		return
	}

	sale, err := h.service.FindByID(c.Request.Context(), claims.ShopID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get sale"})
		return
	}
	if sale == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sale not found"})
		return
	}

	c.JSON(http.StatusOK, sale)
}

func (h *SaleHandler) Create(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var sale models.Sale
	if err := c.ShouldBindJSON(&sale); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sale.ShopID = claims.ShopID
	if sale.Date.IsZero() {
		sale.Date = time.Now()
	}

	if err := h.service.Create(c.Request.Context(), &sale); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create sale"})
		return
	}

	c.JSON(http.StatusCreated, sale)
}

func (h *SaleHandler) Update(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sale id"})
		return
	}

	var sale models.Sale
	if err := c.ShouldBindJSON(&sale); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sale.ID = id
	sale.ShopID = claims.ShopID

	if err := h.service.Update(c.Request.Context(), &sale); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update sale"})
		return
	}

	c.JSON(http.StatusOK, sale)
}

func (h *SaleHandler) Delete(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sale id"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), claims.ShopID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete sale"})
		return
	}

	c.Status(http.StatusNoContent)
}
