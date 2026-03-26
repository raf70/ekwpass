package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
	"github.com/rkulczycki/ekwpass/internal/services"
)

type VehicleHandler struct {
	service *services.VehicleService
}

func NewVehicleHandler(service *services.VehicleService) *VehicleHandler {
	return &VehicleHandler{service: service}
}

func (h *VehicleHandler) ListByCustomer(c *gin.Context) {
	claims := middleware.GetClaims(c)

	customerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid customer id"})
		return
	}

	vehicles, err := h.service.ListByCustomer(c.Request.Context(), claims.ShopID, customerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list vehicles"})
		return
	}

	c.JSON(http.StatusOK, vehicles)
}

func (h *VehicleHandler) GetByID(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vehicle id"})
		return
	}

	vehicle, err := h.service.FindByID(c.Request.Context(), claims.ShopID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get vehicle"})
		return
	}
	if vehicle == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vehicle not found"})
		return
	}

	c.JSON(http.StatusOK, vehicle)
}

func (h *VehicleHandler) Create(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var vehicle models.Vehicle
	if err := c.ShouldBindJSON(&vehicle); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	vehicle.ShopID = claims.ShopID

	if err := h.service.Create(c.Request.Context(), &vehicle); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create vehicle"})
		return
	}

	c.JSON(http.StatusCreated, vehicle)
}

func (h *VehicleHandler) Update(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vehicle id"})
		return
	}

	var vehicle models.Vehicle
	if err := c.ShouldBindJSON(&vehicle); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	vehicle.ID = id
	vehicle.ShopID = claims.ShopID

	if err := h.service.Update(c.Request.Context(), &vehicle); err != nil {
		if errors.Is(err, repositories.ErrStaleUpdate) {
			c.JSON(http.StatusConflict, gin.H{"error": "Record was modified by another user. Please refresh and try again."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update vehicle"})
		return
	}

	c.JSON(http.StatusOK, vehicle)
}

func (h *VehicleHandler) Delete(c *gin.Context) {
	claims := middleware.GetClaims(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vehicle id"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), claims.ShopID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete vehicle"})
		return
	}

	c.Status(http.StatusNoContent)
}
