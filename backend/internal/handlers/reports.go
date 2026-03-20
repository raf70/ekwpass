package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rkulczycki/ekwpass/internal/middleware"
)

type ReportsHandler struct {
	pool *pgxpool.Pool
}

func NewReportsHandler(pool *pgxpool.Pool) *ReportsHandler {
	return &ReportsHandler{pool: pool}
}

type CustomerReportRow struct {
	Name            string  `json:"name"`
	Phone           string  `json:"phone"`
	City            string  `json:"city"`
	ARCurrent       float64 `json:"arCurrent"`
	AR30            float64 `json:"ar30"`
	AR60            float64 `json:"ar60"`
	AR90            float64 `json:"ar90"`
	ARBalance       float64 `json:"arBalance"`
	YTDSales        float64 `json:"ytdSales"`
	LastServiceDate *string `json:"lastServiceDate"`
}

func (h *ReportsHandler) CustomerReport(c *gin.Context) {
	claims := middleware.GetClaims(c)
	arOnly := c.Query("arOnly") == "true"

	query := `
		SELECT
			COALESCE(name, ''), COALESCE(phone, ''), COALESCE(city, ''),
			COALESCE(ar_current, 0), COALESCE(ar_30, 0), COALESCE(ar_60, 0), COALESCE(ar_90, 0),
			COALESCE(ar_balance, 0), COALESCE(ytd_sales, 0),
			last_service_date::text
		FROM customers
		WHERE shop_id = $1`
	if arOnly {
		query += ` AND ar_balance != 0`
	}
	query += ` ORDER BY name`

	rows, err := h.pool.Query(c.Request.Context(), query, claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query customers"})
		return
	}
	defer rows.Close()

	var results []CustomerReportRow
	for rows.Next() {
		var r CustomerReportRow
		if err := rows.Scan(
			&r.Name, &r.Phone, &r.City,
			&r.ARCurrent, &r.AR30, &r.AR60, &r.AR90,
			&r.ARBalance, &r.YTDSales,
			&r.LastServiceDate,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan row"})
			return
		}
		results = append(results, r)
	}

	c.JSON(http.StatusOK, results)
}

type WorkOrderReportRow struct {
	InvoiceNumber string  `json:"invoiceNumber"`
	Date          string  `json:"date"`
	Status        string  `json:"status"`
	CustomerName  string  `json:"customerName"`
	VehicleDesc   string  `json:"vehicleDesc"`
	VehiclePlate  string  `json:"vehiclePlate"`
	JobsTotal     float64 `json:"jobsTotal"`
	PartsTotal    float64 `json:"partsTotal"`
	TotalTax      float64 `json:"totalTax"`
	GrandTotal    float64 `json:"grandTotal"`
}

func (h *ReportsHandler) WorkOrderReport(c *gin.Context) {
	claims := middleware.GetClaims(c)
	status := c.Query("status")
	from := c.Query("from")
	to := c.Query("to")

	query := `
		SELECT
			invoice_number,
			date::text,
			status,
			COALESCE(customer_name, ''),
			TRIM(COALESCE(vehicle_year::text, '') || ' ' || COALESCE(vehicle_make, '') || ' ' || COALESCE(vehicle_model, '')),
			COALESCE(vehicle_plate, ''),
			COALESCE(jobs_taxable, 0) + COALESCE(jobs_nontaxable, 0),
			COALESCE(parts_taxable, 0) + COALESCE(parts_nontaxable, 0),
			COALESCE(total_tax, 0),
			COALESCE(jobs_taxable, 0) + COALESCE(jobs_nontaxable, 0) +
			COALESCE(parts_taxable, 0) + COALESCE(parts_nontaxable, 0) +
			COALESCE(shop_supplies_amt, 0) + COALESCE(total_tax, 0)
		FROM work_orders
		WHERE shop_id = $1`

	args := []any{claims.ShopID}
	argN := 2

	if status != "" {
		query += ` AND status = $` + itoa(argN)
		args = append(args, status)
		argN++
	}
	if from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			query += ` AND date >= $` + itoa(argN)
			args = append(args, t)
			argN++
		}
	}
	if to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			query += ` AND date <= $` + itoa(argN)
			args = append(args, t)
			argN++
		}
	}
	query += ` ORDER BY date DESC, invoice_number DESC`

	rows, err := h.pool.Query(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query work orders"})
		return
	}
	defer rows.Close()

	var results []WorkOrderReportRow
	for rows.Next() {
		var r WorkOrderReportRow
		if err := rows.Scan(
			&r.InvoiceNumber, &r.Date, &r.Status, &r.CustomerName,
			&r.VehicleDesc, &r.VehiclePlate,
			&r.JobsTotal, &r.PartsTotal, &r.TotalTax, &r.GrandTotal,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan row"})
			return
		}
		results = append(results, r)
	}

	c.JSON(http.StatusOK, results)
}

type SummaryReportRow struct {
	TotalOrders     int     `json:"totalOrders"`
	OpenOrders      int     `json:"openOrders"`
	ClosedOrders    int     `json:"closedOrders"`
	VoidedOrders    int     `json:"voidedOrders"`
	JobsTaxable     float64 `json:"jobsTaxable"`
	JobsNontaxable  float64 `json:"jobsNontaxable"`
	PartsTaxable    float64 `json:"partsTaxable"`
	PartsNontaxable float64 `json:"partsNontaxable"`
	ShopSupplies    float64 `json:"shopSupplies"`
	TotalPST        float64 `json:"totalPst"`
	TotalGST        float64 `json:"totalGst"`
	TotalTax        float64 `json:"totalTax"`
	GrandTotal      float64 `json:"grandTotal"`
}

func (h *ReportsHandler) SummaryReport(c *gin.Context) {
	claims := middleware.GetClaims(c)
	from := c.Query("from")
	to := c.Query("to")

	query := `
		SELECT
			COUNT(*)::int,
			COUNT(*) FILTER (WHERE status = 'open')::int,
			COUNT(*) FILTER (WHERE status = 'closed')::int,
			COUNT(*) FILTER (WHERE status = 'voided')::int,
			COALESCE(SUM(jobs_taxable), 0),
			COALESCE(SUM(jobs_nontaxable), 0),
			COALESCE(SUM(parts_taxable), 0),
			COALESCE(SUM(parts_nontaxable), 0),
			COALESCE(SUM(shop_supplies_amt), 0),
			COALESCE(SUM(pst_amount), 0),
			COALESCE(SUM(gst_amount), 0),
			COALESCE(SUM(total_tax), 0),
			COALESCE(SUM(jobs_taxable + jobs_nontaxable + parts_taxable + parts_nontaxable + shop_supplies_amt + total_tax), 0)
		FROM work_orders
		WHERE shop_id = $1`

	args := []any{claims.ShopID}
	argN := 2

	if from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			query += ` AND date >= $` + itoa(argN)
			args = append(args, t)
			argN++
		}
	}
	if to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			query += ` AND date <= $` + itoa(argN)
			args = append(args, t)
			argN++
		}
	}

	var r SummaryReportRow
	err := h.pool.QueryRow(c.Request.Context(), query, args...).Scan(
		&r.TotalOrders, &r.OpenOrders, &r.ClosedOrders, &r.VoidedOrders,
		&r.JobsTaxable, &r.JobsNontaxable,
		&r.PartsTaxable, &r.PartsNontaxable,
		&r.ShopSupplies,
		&r.TotalPST, &r.TotalGST, &r.TotalTax,
		&r.GrandTotal,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query summary"})
		return
	}

	c.JSON(http.StatusOK, r)
}

func itoa(n int) string {
	return strconv.Itoa(n)
}
