package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rkulczycki/ekwpass/internal/models"
)

type WorkOrderLineRepo struct {
	pool *pgxpool.Pool
}

func NewWorkOrderLineRepo(pool *pgxpool.Pool) *WorkOrderLineRepo {
	return &WorkOrderLineRepo{pool: pool}
}

func (r *WorkOrderLineRepo) ListByWorkOrder(ctx context.Context, workOrderID uuid.UUID) ([]models.WorkOrderLine, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT
			id, work_order_id, line_type, sequence,
			COALESCE(sub_type, ''), COALESCE(line_number, 0),
			COALESCE(qty, 0), COALESCE(part_code, ''), COALESCE(description, ''),
			COALESCE(price, 0), COALESCE(cost, 0),
			COALESCE(is_taxable, true), COALESCE(tax_code, ''),
			COALESCE(core_charge, 0), COALESCE(is_return, false),
			technician_id, COALESCE(department, 0), COALESCE(hours, 0),
			supplier_id, COALESCE(supplier_invoice, ''),
			created_at, updated_at
		FROM work_order_lines
		WHERE work_order_id = $1
		ORDER BY line_type, sequence`, workOrderID)
	if err != nil {
		return nil, fmt.Errorf("list wo lines: %w", err)
	}
	defer rows.Close()

	var lines []models.WorkOrderLine
	for rows.Next() {
		var l models.WorkOrderLine
		if err := rows.Scan(
			&l.ID, &l.WorkOrderID, &l.LineType, &l.Sequence,
			&l.SubType, &l.LineNumber,
			&l.Qty, &l.PartCode, &l.Description,
			&l.Price, &l.Cost,
			&l.IsTaxable, &l.TaxCode,
			&l.CoreCharge, &l.IsReturn,
			&l.TechnicianID, &l.Department, &l.Hours,
			&l.SupplierID, &l.SupplierInvoice,
			&l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan wo line: %w", err)
		}
		lines = append(lines, l)
	}
	return lines, nil
}

func (r *WorkOrderLineRepo) Create(ctx context.Context, line *models.WorkOrderLine) error {
	line.ID = uuid.New()
	now := time.Now()
	line.CreatedAt = now
	line.UpdatedAt = now

	// Auto-assign next sequence number
	var maxSeq int
	_ = r.pool.QueryRow(ctx,
		`SELECT COALESCE(MAX(sequence), 0) FROM work_order_lines
		 WHERE work_order_id = $1 AND line_type = $2`,
		line.WorkOrderID, line.LineType,
	).Scan(&maxSeq)
	line.Sequence = maxSeq + 1

	_, err := r.pool.Exec(ctx,
		`INSERT INTO work_order_lines (
			id, work_order_id, line_type, sequence,
			qty, part_code, description, price, cost,
			is_taxable, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		line.ID, line.WorkOrderID, line.LineType, line.Sequence,
		line.Qty, line.PartCode, line.Description, line.Price, line.Cost,
		line.IsTaxable, line.CreatedAt, line.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create wo line: %w", err)
	}
	return nil
}

func (r *WorkOrderLineRepo) Delete(ctx context.Context, lineID uuid.UUID) (uuid.UUID, error) {
	var woID uuid.UUID
	err := r.pool.QueryRow(ctx,
		`DELETE FROM work_order_lines WHERE id = $1 RETURNING work_order_id`,
		lineID,
	).Scan(&woID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("delete wo line: %w", err)
	}
	return woID, nil
}

// RecalcTotals recomputes parts/jobs counts and amounts on the parent work order.
func (r *WorkOrderLineRepo) RecalcTotals(ctx context.Context, shopID, workOrderID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE work_orders SET
			parts_count  = COALESCE((SELECT COUNT(*)::int FROM work_order_lines WHERE work_order_id = $1 AND line_type = 'part'), 0),
			parts_taxable = COALESCE((SELECT SUM(qty * price) FROM work_order_lines WHERE work_order_id = $1 AND line_type = 'part' AND is_taxable = true), 0),
			parts_nontaxable = COALESCE((SELECT SUM(qty * price) FROM work_order_lines WHERE work_order_id = $1 AND line_type = 'part' AND is_taxable = false), 0),
			jobs_count   = COALESCE((SELECT COUNT(*)::int FROM work_order_lines WHERE work_order_id = $1 AND line_type = 'job'), 0),
			jobs_taxable = COALESCE((SELECT SUM(qty * price) FROM work_order_lines WHERE work_order_id = $1 AND line_type = 'job' AND is_taxable = true), 0),
			jobs_nontaxable = COALESCE((SELECT SUM(qty * price) FROM work_order_lines WHERE work_order_id = $1 AND line_type = 'job' AND is_taxable = false), 0),
			pst_amount = 0,
			gst_amount = COALESCE((
				SELECT SUM(wol.qty * wol.price) * 0.13
				FROM work_order_lines wol
				WHERE wol.work_order_id = $1 AND wol.is_taxable = true
			), 0) * CASE WHEN (SELECT gst_exempt FROM work_orders WHERE id = $1) THEN 0 ELSE 1 END,
			total_tax = COALESCE((
				SELECT SUM(wol.qty * wol.price) * 0.13
				FROM work_order_lines wol
				WHERE wol.work_order_id = $1 AND wol.is_taxable = true
			), 0) * CASE WHEN (SELECT gst_exempt FROM work_orders WHERE id = $1) THEN 0 ELSE 1 END,
			updated_at = NOW()
		WHERE id = $1 AND shop_id = $2`,
		workOrderID, shopID,
	)
	if err != nil {
		return fmt.Errorf("recalc wo totals: %w", err)
	}
	return nil
}
