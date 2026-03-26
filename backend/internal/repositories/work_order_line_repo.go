package repositories

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rkulczycki/ekwpass/internal/models"
)

type dbQuerier interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

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

func (r *WorkOrderLineRepo) createLine(ctx context.Context, q dbQuerier, line *models.WorkOrderLine) error {
	line.ID = uuid.New()
	now := time.Now()
	line.CreatedAt = now
	line.UpdatedAt = now

	var maxSeq int
	_ = q.QueryRow(ctx,
		`SELECT COALESCE(MAX(sequence), 0) FROM work_order_lines
		 WHERE work_order_id = $1 AND line_type = $2`,
		line.WorkOrderID, line.LineType,
	).Scan(&maxSeq)
	line.Sequence = maxSeq + 1

	_, err := q.Exec(ctx,
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

func (r *WorkOrderLineRepo) Create(ctx context.Context, line *models.WorkOrderLine) error {
	return r.createLine(ctx, r.pool, line)
}

func (r *WorkOrderLineRepo) deleteLine(ctx context.Context, q dbQuerier, lineID uuid.UUID) (uuid.UUID, error) {
	var woID uuid.UUID
	err := q.QueryRow(ctx,
		`DELETE FROM work_order_lines WHERE id = $1 RETURNING work_order_id`,
		lineID,
	).Scan(&woID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("delete wo line: %w", err)
	}
	return woID, nil
}

func (r *WorkOrderLineRepo) Delete(ctx context.Context, lineID uuid.UUID) (uuid.UUID, error) {
	return r.deleteLine(ctx, r.pool, lineID)
}

// CreateAndRecalc atomically creates a line and recalculates work order totals
// using a transaction with row-level locking on the parent work order.
func (r *WorkOrderLineRepo) CreateAndRecalc(ctx context.Context, shopID uuid.UUID, line *models.WorkOrderLine) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `SELECT 1 FROM work_orders WHERE id = $1 FOR UPDATE`, line.WorkOrderID); err != nil {
		return fmt.Errorf("lock work order: %w", err)
	}

	if err := r.createLine(ctx, tx, line); err != nil {
		return err
	}

	if err := r.recalcTotals(ctx, tx, shopID, line.WorkOrderID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// DeleteAndRecalc atomically deletes a line and recalculates work order totals
// using a transaction with row-level locking on the parent work order.
func (r *WorkOrderLineRepo) DeleteAndRecalc(ctx context.Context, shopID, lineID uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	woID, err := r.deleteLine(ctx, tx, lineID)
	if err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `SELECT 1 FROM work_orders WHERE id = $1 FOR UPDATE`, woID); err != nil {
		return fmt.Errorf("lock work order: %w", err)
	}

	if err := r.recalcTotals(ctx, tx, shopID, woID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func cents(v float64) float64 {
	return math.Round(v*100) / 100
}

// RecalcTotals recomputes parts/jobs counts, shop supplies, discounts, and
// taxes on the parent work order using current shop_settings rates.
func (r *WorkOrderLineRepo) RecalcTotals(ctx context.Context, shopID, workOrderID uuid.UUID) error {
	return r.recalcTotals(ctx, r.pool, shopID, workOrderID)
}

func (r *WorkOrderLineRepo) recalcTotals(ctx context.Context, q dbQuerier, shopID, workOrderID uuid.UUID) error {
	var partsCount, jobsCount int
	var partsTaxable, partsNontaxable, jobsTaxable, jobsNontaxable float64
	err := q.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE line_type = 'part'),
			COALESCE(SUM(qty * price) FILTER (WHERE line_type = 'part' AND is_taxable), 0),
			COALESCE(SUM(qty * price) FILTER (WHERE line_type = 'part' AND NOT is_taxable), 0),
			COUNT(*) FILTER (WHERE line_type = 'job'),
			COALESCE(SUM(qty * price) FILTER (WHERE line_type = 'job' AND is_taxable), 0),
			COALESCE(SUM(qty * price) FILTER (WHERE line_type = 'job' AND NOT is_taxable), 0)
		FROM work_order_lines WHERE work_order_id = $1`,
		workOrderID,
	).Scan(&partsCount, &partsTaxable, &partsNontaxable, &jobsCount, &jobsTaxable, &jobsNontaxable)
	if err != nil {
		return fmt.Errorf("aggregate wo lines: %w", err)
	}

	var ssRate float64
	var ssTaxable, useHST bool
	var docRate, fedRate, provRate float64
	err = q.QueryRow(ctx, `
		SELECT COALESCE(shop_supplies_rate, 0), COALESCE(shop_supplies_taxable, false),
		       COALESCE(doc_rate, 0),
		       COALESCE(federal_tax_rate, 0), COALESCE(provincial_tax_rate, 0),
		       COALESCE(use_hst, false)
		FROM shop_settings WHERE shop_id = $1`, shopID,
	).Scan(&ssRate, &ssTaxable, &docRate, &fedRate, &provRate, &useHST)
	if err != nil {
		return fmt.Errorf("read shop settings for recalc: %w", err)
	}

	var jobsDiscPct, partsDiscPct float64
	var pstExempt, gstExempt bool
	err = q.QueryRow(ctx, `
		SELECT COALESCE(jobs_discount_pct, 0), COALESCE(parts_discount_pct, 0),
		       COALESCE(pst_exempt, false), COALESCE(gst_exempt, false)
		FROM work_orders WHERE id = $1`, workOrderID,
	).Scan(&jobsDiscPct, &partsDiscPct, &pstExempt, &gstExempt)
	if err != nil {
		return fmt.Errorf("read wo for recalc: %w", err)
	}

	jobsDiscAmt := cents((jobsTaxable + jobsNontaxable) * jobsDiscPct / 100)
	partsDiscAmt := cents((partsTaxable + partsNontaxable) * partsDiscPct / 100)

	totalParts := partsTaxable + partsNontaxable
	shopSuppliesAmt := cents(totalParts * ssRate / 100)

	taxBase := jobsTaxable*(1-jobsDiscPct/100) + partsTaxable*(1-partsDiscPct/100)
	if ssTaxable {
		taxBase += shopSuppliesAmt
	}

	var gstAmt, pstAmt float64
	if useHST {
		if !gstExempt {
			gstAmt = cents(taxBase * fedRate / 100)
		}
	} else {
		if !gstExempt {
			gstAmt = cents(taxBase * fedRate / 100)
		}
		if !pstExempt {
			pstAmt = cents(taxBase * provRate / 100)
		}
	}
	totalTax := cents(gstAmt + pstAmt)

	_, err = q.Exec(ctx, `
		UPDATE work_orders SET
			parts_count = $3, parts_taxable = $4, parts_nontaxable = $5,
			parts_discount_amt = $6,
			jobs_count = $7, jobs_taxable = $8, jobs_nontaxable = $9,
			jobs_discount_amt = $10,
			shop_supplies_rate = $11, shop_supplies_taxable = $12, shop_supplies_amt = $13,
			doc_rate = $14,
			gst_amount = $15, pst_amount = $16, total_tax = $17,
			updated_at = NOW()
		WHERE id = $1 AND shop_id = $2`,
		workOrderID, shopID,
		partsCount, partsTaxable, partsNontaxable, partsDiscAmt,
		jobsCount, jobsTaxable, jobsNontaxable, jobsDiscAmt,
		ssRate, ssTaxable, shopSuppliesAmt,
		docRate,
		gstAmt, pstAmt, totalTax,
	)
	if err != nil {
		return fmt.Errorf("update wo totals: %w", err)
	}
	return nil
}
