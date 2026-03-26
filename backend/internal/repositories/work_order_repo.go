package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rkulczycki/ekwpass/internal/models"
)

type WorkOrderRepo struct {
	pool *pgxpool.Pool
}

func NewWorkOrderRepo(pool *pgxpool.Pool) *WorkOrderRepo {
	return &WorkOrderRepo{pool: pool}
}

const woSelectCols = `
	id, shop_id, invoice_number, customer_id, vehicle_id, status,
	date, COALESCE(time::text, ''),
	COALESCE(customer_name, ''), COALESCE(customer_phone, ''), COALESCE(customer_phone_secondary, ''),
	COALESCE(vehicle_make, ''), COALESCE(vehicle_model, ''), COALESCE(vehicle_year, 0),
	COALESCE(vehicle_vin, ''), COALESCE(vehicle_odometer, 0), COALESCE(vehicle_plate, ''), COALESCE(vehicle_color, ''),
	COALESCE(jobs_count, 0), COALESCE(jobs_taxable, 0), COALESCE(jobs_nontaxable, 0),
	COALESCE(jobs_discount_pct, 0), COALESCE(jobs_discount_amt, 0),
	COALESCE(parts_count, 0), COALESCE(parts_taxable, 0), COALESCE(parts_nontaxable, 0),
	COALESCE(parts_discount_pct, 0), COALESCE(parts_discount_amt, 0),
	COALESCE(supplier_parts_amt, 0), COALESCE(inventory_parts_amt, 0),
	COALESCE(shop_supplies_amt, 0), COALESCE(shop_supplies_taxable, false), COALESCE(shop_supplies_rate, 0),
	COALESCE(doc_rate, 0),
	COALESCE(pst_exempt, false), COALESCE(gst_exempt, false),
	COALESCE(pst_amount, 0), COALESCE(gst_amount, 0), COALESCE(total_tax, 0),
	COALESCE(remark1, ''), COALESCE(remark2, ''), COALESCE(remark3, ''),
	created_at, updated_at`

func scanWorkOrder(s interface{ Scan(dest ...any) error }) (models.WorkOrder, error) {
	var wo models.WorkOrder
	err := s.Scan(
		&wo.ID, &wo.ShopID, &wo.InvoiceNumber, &wo.CustomerID, &wo.VehicleID, &wo.Status,
		&wo.Date, &wo.Time,
		&wo.CustomerName, &wo.CustomerPhone, &wo.CustomerPhoneSecondary,
		&wo.VehicleMake, &wo.VehicleModel, &wo.VehicleYear,
		&wo.VehicleVIN, &wo.VehicleOdometer, &wo.VehiclePlate, &wo.VehicleColor,
		&wo.JobsCount, &wo.JobsTaxable, &wo.JobsNontaxable,
		&wo.JobsDiscountPct, &wo.JobsDiscountAmt,
		&wo.PartsCount, &wo.PartsTaxable, &wo.PartsNontaxable,
		&wo.PartsDiscountPct, &wo.PartsDiscountAmt,
		&wo.SupplierPartsAmt, &wo.InventoryPartsAmt,
		&wo.ShopSuppliesAmt, &wo.ShopSuppliesTaxable, &wo.ShopSuppliesRate,
		&wo.DocRate,
		&wo.PSTExempt, &wo.GSTExempt,
		&wo.PSTAmount, &wo.GSTAmount, &wo.TotalTax,
		&wo.Remark1, &wo.Remark2, &wo.Remark3,
		&wo.CreatedAt, &wo.UpdatedAt,
	)
	return wo, err
}

func (r *WorkOrderRepo) List(ctx context.Context, shopID uuid.UUID, params models.PaginationParams, status string) ([]models.WorkOrder, int64, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 {
		params.PageSize = 20
	}

	search := "%" + params.Search + "%"

	var total int64
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM work_orders
		 WHERE shop_id = $1
		   AND (invoice_number ILIKE $2 OR COALESCE(customer_name, '') ILIKE $2)
		   AND ($3 = '' OR status = $3)`,
		shopID, search, status,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count work orders: %w", err)
	}

	offset := (params.Page - 1) * params.PageSize
	query := fmt.Sprintf(
		`SELECT %s FROM work_orders
		 WHERE shop_id = $1
		   AND (invoice_number ILIKE $2 OR COALESCE(customer_name, '') ILIKE $2)
		   AND ($3 = '' OR status = $3)
		 ORDER BY date DESC, created_at DESC
		 LIMIT $4 OFFSET $5`, woSelectCols)

	rows, err := r.pool.Query(ctx, query, shopID, search, status, params.PageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list work orders: %w", err)
	}
	defer rows.Close()

	var orders []models.WorkOrder
	for rows.Next() {
		wo, err := scanWorkOrder(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan work order: %w", err)
		}
		orders = append(orders, wo)
	}
	return orders, total, nil
}

func (r *WorkOrderRepo) FindByID(ctx context.Context, shopID, id uuid.UUID) (*models.WorkOrder, error) {
	query := fmt.Sprintf(`SELECT %s FROM work_orders WHERE id = $1 AND shop_id = $2`, woSelectCols)
	wo, err := scanWorkOrder(r.pool.QueryRow(ctx, query, id, shopID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find work order: %w", err)
	}
	return &wo, nil
}

func (r *WorkOrderRepo) Create(ctx context.Context, wo *models.WorkOrder) error {
	wo.ID = uuid.New()
	now := time.Now()
	wo.CreatedAt = now
	wo.UpdatedAt = now

	_, err := r.pool.Exec(ctx,
		`INSERT INTO work_orders (
			id, shop_id, invoice_number, customer_id, vehicle_id, status, date,
			customer_name, customer_phone, customer_phone_secondary,
			vehicle_make, vehicle_model, vehicle_year, vehicle_vin,
			vehicle_odometer, vehicle_plate, vehicle_color,
			pst_exempt, gst_exempt,
			remark1, remark2, remark3,
			created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,
			$8,$9,$10,
			$11,$12,$13,$14,
			$15,$16,$17,
			$18,$19,
			$20,$21,$22,
			$23,$24
		)`,
		wo.ID, wo.ShopID, wo.InvoiceNumber, wo.CustomerID, wo.VehicleID, wo.Status, wo.Date,
		wo.CustomerName, wo.CustomerPhone, wo.CustomerPhoneSecondary,
		wo.VehicleMake, wo.VehicleModel, wo.VehicleYear, wo.VehicleVIN,
		wo.VehicleOdometer, wo.VehiclePlate, wo.VehicleColor,
		wo.PSTExempt, wo.GSTExempt,
		wo.Remark1, wo.Remark2, wo.Remark3,
		wo.CreatedAt, wo.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create work order: %w", err)
	}
	return nil
}

func (r *WorkOrderRepo) Update(ctx context.Context, wo *models.WorkOrder) error {
	expectedAt := wo.UpdatedAt
	wo.UpdatedAt = time.Now()

	tag, err := r.pool.Exec(ctx,
		`UPDATE work_orders SET
			status = $3,
			date = $4,
			customer_id = $5,
			vehicle_id = $6,
			customer_name = $7,
			customer_phone = $8,
			customer_phone_secondary = $9,
			vehicle_make = $10,
			vehicle_model = $11,
			vehicle_year = $12,
			vehicle_vin = $13,
			vehicle_odometer = $14,
			vehicle_plate = $15,
			vehicle_color = $16,
			pst_exempt = $17,
			gst_exempt = $18,
			remark1 = $19,
			remark2 = $20,
			remark3 = $21,
			updated_at = $22
		WHERE id = $1 AND shop_id = $2 AND updated_at = $23`,
		wo.ID, wo.ShopID,
		wo.Status, wo.Date,
		wo.CustomerID, wo.VehicleID,
		wo.CustomerName, wo.CustomerPhone, wo.CustomerPhoneSecondary,
		wo.VehicleMake, wo.VehicleModel, wo.VehicleYear, wo.VehicleVIN,
		wo.VehicleOdometer, wo.VehiclePlate, wo.VehicleColor,
		wo.PSTExempt, wo.GSTExempt,
		wo.Remark1, wo.Remark2, wo.Remark3,
		wo.UpdatedAt,
		expectedAt,
	)
	if err != nil {
		return fmt.Errorf("update work order: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrStaleUpdate
	}
	return nil
}

func (r *WorkOrderRepo) NextInvoiceNumber(ctx context.Context, shopID uuid.UUID) (string, error) {
	var num int
	err := r.pool.QueryRow(ctx,
		`UPDATE shop_settings
		 SET next_invoice_number = next_invoice_number + 1
		 WHERE shop_id = $1
		 RETURNING next_invoice_number - 1`,
		shopID,
	).Scan(&num)
	if err != nil {
		return "", fmt.Errorf("next invoice number: %w", err)
	}
	return fmt.Sprintf("%07d", num), nil
}
