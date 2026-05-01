package handlers

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type ReportsHandler struct {
	pool   *pgxpool.Pool
	arRepo *repositories.ARTransactionRepo
}

func NewReportsHandler(pool *pgxpool.Pool, arRepo *repositories.ARTransactionRepo) *ReportsHandler {
	return &ReportsHandler{pool: pool, arRepo: arRepo}
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

func (h *ReportsHandler) CustomerReportExport(c *gin.Context) {
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

	filename := "customer_report_" + time.Now().Format("2006-01-02") + ".csv"
	headers := []string{"Name", "Phone", "City", "AR_Current", "AR_30", "AR_60", "AR_90", "AR_Balance", "YTD_Sales", "Last_Service_Date"}

	csvRows := make([][]string, 0, len(results))
	for _, r := range results {
		last := ""
		if r.LastServiceDate != nil {
			last = *r.LastServiceDate
		}
		csvRows = append(csvRows, []string{
			r.Name, r.Phone, r.City,
			formatF64(r.ARCurrent), formatF64(r.AR30), formatF64(r.AR60), formatF64(r.AR90),
			formatF64(r.ARBalance), formatF64(r.YTDSales),
			last,
		})
	}

	writeCSV(c, filename, headers, csvRows)
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

func (h *ReportsHandler) WorkOrderReportExport(c *gin.Context) {
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

	filename := "work_order_report_" + time.Now().Format("2006-01-02") + ".csv"
	headers := []string{"Invoice_Number", "Date", "Status", "Customer", "Vehicle_Description", "Vehicle_Plate", "Jobs_Total", "Parts_Total", "Total_Tax", "Grand_Total"}

	csvRows := make([][]string, 0, len(results))
	for _, r := range results {
		csvRows = append(csvRows, []string{
			r.InvoiceNumber, r.Date, r.Status, r.CustomerName, r.VehicleDesc, r.VehiclePlate,
			formatF64(r.JobsTotal), formatF64(r.PartsTotal), formatF64(r.TotalTax), formatF64(r.GrandTotal),
		})
	}

	writeCSV(c, filename, headers, csvRows)
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

func (h *ReportsHandler) SummaryReportExport(c *gin.Context) {
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

	filename := "summary_report_" + time.Now().Format("2006-01-02") + ".csv"
	headers := []string{"Total_Orders", "Open_Orders", "Closed_Orders", "Voided_Orders", "Jobs_Taxable", "Jobs_NonTaxable", "Parts_Taxable", "Parts_NonTaxable", "Shop_Supplies", "Total_PST", "Total_GST", "Total_Tax", "Grand_Total"}

	csvRows := [][]string{{
		itoa(r.TotalOrders), itoa(r.OpenOrders), itoa(r.ClosedOrders), itoa(r.VoidedOrders),
		formatF64(r.JobsTaxable), formatF64(r.JobsNontaxable),
		formatF64(r.PartsTaxable), formatF64(r.PartsNontaxable),
		formatF64(r.ShopSupplies),
		formatF64(r.TotalPST), formatF64(r.TotalGST), formatF64(r.TotalTax),
		formatF64(r.GrandTotal),
	}}

	writeCSV(c, filename, headers, csvRows)
}

type ARAgingRow struct {
	CustomerID   string  `json:"customerId"`
	CustomerName string  `json:"customerName"`
	Phone        string  `json:"phone"`
	City         string  `json:"city"`
	Current      float64 `json:"current"`
	Days30       float64 `json:"days30"`
	Days60       float64 `json:"days60"`
	Days90       float64 `json:"days90"`
	Total        float64 `json:"total"`
}

type ARAgingSummary struct {
	Rows         []ARAgingRow `json:"rows"`
	TotalCurrent float64      `json:"totalCurrent"`
	Total30      float64      `json:"total30"`
	Total60      float64      `json:"total60"`
	Total90      float64      `json:"total90"`
	GrandTotal   float64      `json:"grandTotal"`
	CustomerCount int         `json:"customerCount"`
}

func (h *ReportsHandler) ARAgingReport(c *gin.Context) {
	claims := middleware.GetClaims(c)

	query := `
		SELECT
			id::text,
			COALESCE(name, ''), COALESCE(phone, ''), COALESCE(city, ''),
			COALESCE(ar_current, 0), COALESCE(ar_30, 0),
			COALESCE(ar_60, 0), COALESCE(ar_90, 0),
			COALESCE(ar_balance, 0)
		FROM customers
		WHERE shop_id = $1 AND ar_balance != 0
		ORDER BY ar_balance DESC`

	rows, err := h.pool.Query(c.Request.Context(), query, claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query AR aging"})
		return
	}
	defer rows.Close()

	summary := ARAgingSummary{}
	for rows.Next() {
		var r ARAgingRow
		if err := rows.Scan(
			&r.CustomerID,
			&r.CustomerName, &r.Phone, &r.City,
			&r.Current, &r.Days30, &r.Days60, &r.Days90,
			&r.Total,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan row"})
			return
		}
		summary.Rows = append(summary.Rows, r)
		summary.TotalCurrent += r.Current
		summary.Total30 += r.Days30
		summary.Total60 += r.Days60
		summary.Total90 += r.Days90
		summary.GrandTotal += r.Total
	}

	if summary.Rows == nil {
		summary.Rows = []ARAgingRow{}
	}
	summary.CustomerCount = len(summary.Rows)

	c.JSON(http.StatusOK, summary)
}

func (h *ReportsHandler) ARAgingReportExport(c *gin.Context) {
	claims := middleware.GetClaims(c)

	query := `
		SELECT
			id::text,
			COALESCE(name, ''), COALESCE(phone, ''), COALESCE(city, ''),
			COALESCE(ar_current, 0), COALESCE(ar_30, 0),
			COALESCE(ar_60, 0), COALESCE(ar_90, 0),
			COALESCE(ar_balance, 0)
		FROM customers
		WHERE shop_id = $1 AND ar_balance != 0
		ORDER BY ar_balance DESC`

	rows, err := h.pool.Query(c.Request.Context(), query, claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query AR aging"})
		return
	}
	defer rows.Close()

	summary := ARAgingSummary{}
	for rows.Next() {
		var r ARAgingRow
		if err := rows.Scan(
			&r.CustomerID,
			&r.CustomerName, &r.Phone, &r.City,
			&r.Current, &r.Days30, &r.Days60, &r.Days90,
			&r.Total,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan row"})
			return
		}
		summary.Rows = append(summary.Rows, r)
		summary.TotalCurrent += r.Current
		summary.Total30 += r.Days30
		summary.Total60 += r.Days60
		summary.Total90 += r.Days90
		summary.GrandTotal += r.Total
	}

	if summary.Rows == nil {
		summary.Rows = []ARAgingRow{}
	}
	summary.CustomerCount = len(summary.Rows)

	filename := "ar_aging_report_" + time.Now().Format("2006-01-02") + ".csv"
	headers := []string{"Customer_ID", "Customer_Name", "Phone", "City", "Current", "Days_30", "Days_60", "Days_90", "Total"}

	csvRows := make([][]string, 0, len(summary.Rows)+1)
	for _, r := range summary.Rows {
		csvRows = append(csvRows, []string{
			r.CustomerID, r.CustomerName, r.Phone, r.City,
			formatF64(r.Current),
			formatF64(r.Days30),
			formatF64(r.Days60),
			formatF64(r.Days90),
			formatF64(r.Total),
		})
	}

	// Totals row for quick copy/paste to Excel.
	csvRows = append(csvRows, []string{
		"", "TOTALS", "", "",
		formatF64(summary.TotalCurrent),
		formatF64(summary.Total30),
		formatF64(summary.Total60),
		formatF64(summary.Total90),
		formatF64(summary.GrandTotal),
	})

	writeCSV(c, filename, headers, csvRows)
}

func (h *ReportsHandler) ProcessAging(c *gin.Context) {
	claims := middleware.GetClaims(c)

	count, err := h.arRepo.ProcessAging(c.Request.Context(), claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process aging"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"customersProcessed": count})
}

func (h *ReportsHandler) ApplyInterest(c *gin.Context) {
	claims := middleware.GetClaims(c)

	count, err := h.arRepo.ApplyInterest(c.Request.Context(), claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to apply interest"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"customersCharged": count})
}

func (h *ReportsHandler) GenerateStatements(c *gin.Context) {
	claims := middleware.GetClaims(c)

	count, err := h.arRepo.MarkStatements(c.Request.Context(), claims.ShopID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate statements"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"statementsGenerated": count})
}

func itoa(n int) string {
	return strconv.Itoa(n)
}

func formatF64(n float64) string {
	return strconv.FormatFloat(n, 'f', -1, 64)
}

func writeCSV(c *gin.Context, filename string, headers []string, rows [][]string) {
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")

	w := csv.NewWriter(c.Writer)
	if err := w.Write(headers); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write csv"})
		return
	}
	for _, row := range rows {
		if err := w.Write(row); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write csv"})
			return
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write csv"})
		return
	}
}
