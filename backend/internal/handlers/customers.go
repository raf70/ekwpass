package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
	"github.com/rkulczycki/ekwpass/internal/services"
)

type CustomerHandler struct {
	service *services.CustomerService
	arRepo  *repositories.ARTransactionRepo
}

func NewCustomerHandler(service *services.CustomerService, arRepo *repositories.ARTransactionRepo) *CustomerHandler {
	return &CustomerHandler{service: service, arRepo: arRepo}
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

func (h *CustomerHandler) ListARTransactions(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid customer id"})
		return
	}

	txns, err := h.arRepo.ListByCustomer(c.Request.Context(), claims.ShopID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list AR transactions"})
		return
	}

	if txns == nil {
		txns = []models.ARTransaction{}
	}
	c.JSON(http.StatusOK, txns)
}

type CreateARTransactionRequest struct {
	Date        string  `json:"date" binding:"required"`
	Description string  `json:"description" binding:"required"`
	CrDr        string  `json:"crDr" binding:"required"`
	Amount      float64 `json:"amount" binding:"required"`
}

func (h *CustomerHandler) CreateARTransaction(c *gin.Context) {
	claims := middleware.GetClaims(c)

	customerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid customer id"})
		return
	}

	var req CreateARTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if req.CrDr != "CR" && req.CrDr != "DR" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "crDr must be CR or DR"})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format, use YYYY-MM-DD"})
		return
	}

	txn := models.ARTransaction{
		ShopID:      claims.ShopID,
		CustomerID:  customerID,
		Date:        date,
		Description: req.Description,
		CrDr:        req.CrDr,
		Amount:      req.Amount,
	}

	ctx := c.Request.Context()
	if err := h.arRepo.Create(ctx, &txn); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create AR transaction"})
		return
	}

	h.arRepo.UpdateCustomerBalance(ctx, claims.ShopID, customerID)

	c.JSON(http.StatusCreated, txn)
}
