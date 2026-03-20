package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type SettingsHandler struct {
	repo *repositories.ShopSettingsRepo
}

func NewSettingsHandler(repo *repositories.ShopSettingsRepo) *SettingsHandler {
	return &SettingsHandler{repo: repo}
}

func (h *SettingsHandler) Get(c *gin.Context) {
	claims := middleware.GetClaims(c)

	s, err := h.repo.FindByShop(c.Request.Context(), claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load settings"})
		return
	}

	c.JSON(http.StatusOK, s)
}

func (h *SettingsHandler) Update(c *gin.Context) {
	claims := middleware.GetClaims(c)

	var s models.ShopSettings
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	s.ShopID = claims.ShopID

	if err := h.repo.Update(c.Request.Context(), &s); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update settings"})
		return
	}

	updated, err := h.repo.FindByShop(c.Request.Context(), claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reload settings"})
		return
	}

	c.JSON(http.StatusOK, updated)
}
