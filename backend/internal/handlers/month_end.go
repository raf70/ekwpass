package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type MonthEndHandler struct {
	pool         *pgxpool.Pool
	arRepo       *repositories.ARTransactionRepo
	settingsRepo *repositories.ShopSettingsRepo
}

func NewMonthEndHandler(pool *pgxpool.Pool, arRepo *repositories.ARTransactionRepo, settingsRepo *repositories.ShopSettingsRepo) *MonthEndHandler {
	return &MonthEndHandler{pool: pool, arRepo: arRepo, settingsRepo: settingsRepo}
}

var monthNames = []string{
	"", "January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
}

func (h *MonthEndHandler) Preview(c *gin.Context) {
	claims := middleware.GetClaims(c)
	ctx := c.Request.Context()

	settings, err := h.settingsRepo.FindByShop(ctx, claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load settings"})
		return
	}

	var totalARCustomers int
	err = h.pool.QueryRow(ctx,
		`SELECT COUNT(DISTINCT id) FROM customers WHERE shop_id = $1 AND ar_balance != 0`,
		claims.ShopID,
	).Scan(&totalARCustomers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count AR customers"})
		return
	}

	var overdueCustomers int
	err = h.pool.QueryRow(ctx,
		`SELECT COUNT(DISTINCT id) FROM customers
		 WHERE shop_id = $1 AND (COALESCE(ar_30, 0) + COALESCE(ar_60, 0) + COALESCE(ar_90, 0)) > 0`,
		claims.ShopID,
	).Scan(&overdueCustomers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count overdue customers"})
		return
	}

	monthName := ""
	if settings.SystemMonth >= 1 && settings.SystemMonth <= 12 {
		monthName = monthNames[settings.SystemMonth]
	}

	c.JSON(http.StatusOK, gin.H{
		"systemMonth":        settings.SystemMonth,
		"monthName":          monthName,
		"arInterestRate":     settings.ARInterestRate,
		"arDelayProcessing":  settings.ARDelayProcessing,
		"totalARCustomers":   totalARCustomers,
		"overdueCustomers":   overdueCustomers,
	})
}

func (h *MonthEndHandler) Process(c *gin.Context) {
	claims := middleware.GetClaims(c)
	ctx := c.Request.Context()

	agingCount, err := h.arRepo.ProcessAging(ctx, claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "aging processing failed", "step": "aging"})
		return
	}

	interestCount, err := h.arRepo.ApplyInterest(ctx, claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "interest processing failed", "step": "interest"})
		return
	}

	stmtCount, err := h.arRepo.MarkStatements(ctx, claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "statement generation failed", "step": "statements"})
		return
	}

	newMonth, err := h.settingsRepo.AdvanceSystemMonth(ctx, claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to advance system month", "step": "advance"})
		return
	}

	newMonthName := ""
	if newMonth >= 1 && newMonth <= 12 {
		newMonthName = monthNames[newMonth]
	}

	c.JSON(http.StatusOK, gin.H{
		"agingProcessed":      agingCount,
		"interestCharged":     interestCount,
		"statementsGenerated": stmtCount,
		"newMonth":            newMonth,
		"newMonthName":        newMonthName,
	})
}
