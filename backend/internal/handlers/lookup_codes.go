package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type LookupCodeHandler struct {
	repo *repositories.LookupCodeRepo
}

func NewLookupCodeHandler(repo *repositories.LookupCodeRepo) *LookupCodeHandler {
	return &LookupCodeHandler{repo: repo}
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
