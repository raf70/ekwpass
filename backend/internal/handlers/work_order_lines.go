package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type WorkOrderLineHandler struct {
	lineRepo *repositories.WorkOrderLineRepo
}

func NewWorkOrderLineHandler(lineRepo *repositories.WorkOrderLineRepo) *WorkOrderLineHandler {
	return &WorkOrderLineHandler{lineRepo: lineRepo}
}

func (h *WorkOrderLineHandler) List(c *gin.Context) {
	woID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order id"})
		return
	}

	lines, err := h.lineRepo.ListByWorkOrder(c.Request.Context(), woID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list lines"})
		return
	}

	c.JSON(http.StatusOK, lines)
}

func (h *WorkOrderLineHandler) Create(c *gin.Context) {
	claims := middleware.GetClaims(c)

	woID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order id"})
		return
	}

	var line models.WorkOrderLine
	if err := c.ShouldBindJSON(&line); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	line.WorkOrderID = woID
	if line.LineType == "" {
		line.LineType = "part"
	}

	if err := h.lineRepo.CreateAndRecalc(c.Request.Context(), claims.ShopID, &line); err != nil {
		log.Printf("ERROR create wo line + recalc: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create line"})
		return
	}

	c.JSON(http.StatusCreated, line)
}

func (h *WorkOrderLineHandler) Delete(c *gin.Context) {
	claims := middleware.GetClaims(c)

	lineID, err := uuid.Parse(c.Param("lineId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid line id"})
		return
	}

	if err := h.lineRepo.DeleteAndRecalc(c.Request.Context(), claims.ShopID, lineID); err != nil {
		log.Printf("ERROR delete wo line + recalc: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete line"})
		return
	}

	c.Status(http.StatusNoContent)
}
