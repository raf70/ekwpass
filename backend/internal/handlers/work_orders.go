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

type WorkOrderHandler struct {
	service *services.WorkOrderService
}

func NewWorkOrderHandler(service *services.WorkOrderService) *WorkOrderHandler {
	return &WorkOrderHandler{service: service}
}

func (h *WorkOrderHandler) List(c *gin.Context) {
	claims := middleware.GetClaims(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	search := c.Query("search")
	status := c.Query("status")

	params := models.PaginationParams{
		Page:     page,
		PageSize: pageSize,
		Search:   search,
	}

	orders, total, err := h.service.List(c.Request.Context(), claims.ShopID, params, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list work orders"})
		return
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data:       orders,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

func (h *WorkOrderHandler) GetByID(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order id"})
		return
	}

	wo, err := h.service.FindByID(c.Request.Context(), claims.ShopID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get work order"})
		return
	}
	if wo == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "work order not found"})
		return
	}

	c.JSON(http.StatusOK, wo)
}

func (h *WorkOrderHandler) Create(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var wo models.WorkOrder
	if err := c.ShouldBindJSON(&wo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	wo.ShopID = claims.ShopID
	if wo.Date.IsZero() {
		wo.Date = time.Now()
	}

	if err := h.service.Create(c.Request.Context(), &wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create work order"})
		return
	}

	c.JSON(http.StatusCreated, wo)
}

func (h *WorkOrderHandler) Update(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order id"})
		return
	}

	var wo models.WorkOrder
	if err := c.ShouldBindJSON(&wo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	wo.ID = id
	wo.ShopID = claims.ShopID

	if err := h.service.Update(c.Request.Context(), &wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update work order"})
		return
	}

	c.JSON(http.StatusOK, wo)
}
