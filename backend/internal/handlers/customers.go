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

type CustomerHandler struct {
	service *services.CustomerService
}

func NewCustomerHandler(service *services.CustomerService) *CustomerHandler {
	return &CustomerHandler{service: service}
}

func (h *CustomerHandler) List(c *gin.Context) {
	claims := middleware.GetClaims(c)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	search := c.Query("search")

	params := models.PaginationParams{
		Page:     page,
		PageSize: pageSize,
		Search:   search,
	}

	customers, total, err := h.service.List(c.Request.Context(), claims.ShopID, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list customers"})
		return
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data:       customers,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

func (h *CustomerHandler) GetByID(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid customer id"})
		return
	}

	customer, err := h.service.FindByID(c.Request.Context(), claims.ShopID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get customer"})
		return
	}
	if customer == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "customer not found"})
		return
	}

	c.JSON(http.StatusOK, customer)
}

func (h *CustomerHandler) Create(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var customer models.Customer
	if err := c.ShouldBindJSON(&customer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	customer.ShopID = claims.ShopID

	if err := h.service.Create(c.Request.Context(), &customer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create customer"})
		return
	}

	c.JSON(http.StatusCreated, customer)
}

func (h *CustomerHandler) Update(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid customer id"})
		return
	}

	var customer models.Customer
	if err := c.ShouldBindJSON(&customer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	customer.ID = id
	customer.ShopID = claims.ShopID

	if err := h.service.Update(c.Request.Context(), &customer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update customer"})
		return
	}

	c.JSON(http.StatusOK, customer)
}

func (h *CustomerHandler) Delete(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid customer id"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), claims.ShopID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete customer"})
		return
	}

	c.Status(http.StatusNoContent)
}
