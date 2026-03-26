package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
	"github.com/rkulczycki/ekwpass/internal/services"
)

type SupplierHandler struct {
	service     *services.SupplierService
	partService *services.PartService
	apRepo      *repositories.APTransactionRepo
}

func NewSupplierHandler(service *services.SupplierService, partService *services.PartService, apRepo *repositories.APTransactionRepo) *SupplierHandler {
	return &SupplierHandler{service: service, partService: partService, apRepo: apRepo}
}

func (h *SupplierHandler) List(c *gin.Context) {
	claims := middleware.GetClaims(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	search := c.Query("search")

	params := models.PaginationParams{Page: page, PageSize: pageSize, Search: search}

	suppliers, total, err := h.service.List(c.Request.Context(), claims.ShopID, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list suppliers"})
		return
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data:       suppliers,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

func (h *SupplierHandler) GetByID(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid supplier id"})
		return
	}

	supplier, err := h.service.FindByID(c.Request.Context(), claims.ShopID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get supplier"})
		return
	}
	if supplier == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "supplier not found"})
		return
	}

	c.JSON(http.StatusOK, supplier)
}

func (h *SupplierHandler) Create(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var supplier models.Supplier
	if err := c.ShouldBindJSON(&supplier); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	supplier.ShopID = claims.ShopID

	if err := h.service.Create(c.Request.Context(), &supplier); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create supplier"})
		return
	}

	c.JSON(http.StatusCreated, supplier)
}

func (h *SupplierHandler) Update(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid supplier id"})
		return
	}

	var supplier models.Supplier
	if err := c.ShouldBindJSON(&supplier); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	supplier.ID = id
	supplier.ShopID = claims.ShopID

	if err := h.service.Update(c.Request.Context(), &supplier); err != nil {
		if errors.Is(err, repositories.ErrStaleUpdate) {
			c.JSON(http.StatusConflict, gin.H{"error": "Record was modified by another user. Please refresh and try again."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update supplier"})
		return
	}

	c.JSON(http.StatusOK, supplier)
}

func (h *SupplierHandler) Delete(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid supplier id"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), claims.ShopID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete supplier"})
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *SupplierHandler) ListParts(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid supplier id"})
		return
	}

	parts, err := h.partService.ListBySupplier(c.Request.Context(), claims.ShopID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list supplier parts"})
		return
	}

	if parts == nil {
		parts = []models.Part{}
	}
	c.JSON(http.StatusOK, parts)
}

func (h *SupplierHandler) ListAPTransactions(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid supplier id"})
		return
	}

	txns, err := h.apRepo.ListBySupplier(c.Request.Context(), claims.ShopID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list AP transactions"})
		return
	}

	if txns == nil {
		txns = []models.APTransaction{}
	}
	c.JSON(http.StatusOK, txns)
}
