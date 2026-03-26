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

type SaleRepo struct {
	pool *pgxpool.Pool
}

func NewSaleRepo(pool *pgxpool.Pool) *SaleRepo {
	return &SaleRepo{pool: pool}
}

const saleSelectCols = `
	id, shop_id, sale_number, customer_id, status,
	COALESCE(sale_type, ''), COALESCE(sale_info, ''),
	date, COALESCE(time::text, ''),
	COALESCE(qty, 0), COALESCE(description, ''),
	COALESCE(department, 0), COALESCE(amount, 0),
	COALESCE(is_taxable, true), COALESCE(payment_type, ''),
	supplier_id, COALESCE(supplier_invoice, ''),
	COALESCE(part_code, ''), COALESCE(cost, 0), COALESCE(list_price, 0),
	technician_id,
	created_at, updated_at`

func scanSale(s interface{ Scan(dest ...any) error }) (models.Sale, error) {
	var sale models.Sale
	err := s.Scan(
		&sale.ID, &sale.ShopID, &sale.SaleNumber, &sale.CustomerID, &sale.Status,
		&sale.SaleType, &sale.SaleInfo,
		&sale.Date, &sale.Time,
		&sale.Qty, &sale.Description,
		&sale.Department, &sale.Amount,
		&sale.IsTaxable, &sale.PaymentType,
		&sale.SupplierID, &sale.SupplierInvoice,
		&sale.PartCode, &sale.Cost, &sale.ListPrice,
		&sale.TechnicianID,
		&sale.CreatedAt, &sale.UpdatedAt,
	)
	return sale, err
}

func (r *SaleRepo) List(ctx context.Context, shopID uuid.UUID, params models.PaginationParams, status string) ([]models.Sale, int64, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 {
		params.PageSize = 20
	}

	search := "%" + params.Search + "%"

	var total int64
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM sales
		 WHERE shop_id = $1
		   AND (sale_number ILIKE $2 OR COALESCE(description, '') ILIKE $2 OR COALESCE(part_code, '') ILIKE $2)
		   AND ($3 = '' OR status = $3)`,
		shopID, search, status,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count sales: %w", err)
	}

	offset := (params.Page - 1) * params.PageSize
	query := fmt.Sprintf(
		`SELECT %s FROM sales
		 WHERE shop_id = $1
		   AND (sale_number ILIKE $2 OR COALESCE(description, '') ILIKE $2 OR COALESCE(part_code, '') ILIKE $2)
		   AND ($3 = '' OR status = $3)
		 ORDER BY date DESC, created_at DESC
		 LIMIT $4 OFFSET $5`, saleSelectCols)

	rows, err := r.pool.Query(ctx, query, shopID, search, status, params.PageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list sales: %w", err)
	}
	defer rows.Close()

	var sales []models.Sale
	for rows.Next() {
		sale, err := scanSale(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan sale: %w", err)
		}
		sales = append(sales, sale)
	}
	return sales, total, nil
}

func (r *SaleRepo) FindByID(ctx context.Context, shopID, id uuid.UUID) (*models.Sale, error) {
	query := fmt.Sprintf(`SELECT %s FROM sales WHERE id = $1 AND shop_id = $2`, saleSelectCols)
	sale, err := scanSale(r.pool.QueryRow(ctx, query, id, shopID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find sale: %w", err)
	}
	return &sale, nil
}

func (r *SaleRepo) Create(ctx context.Context, sale *models.Sale) error {
	sale.ID = uuid.New()
	now := time.Now()
	sale.CreatedAt = now
	sale.UpdatedAt = now

	saleNo, err := r.nextSaleNumber(ctx, sale.ShopID)
	if err != nil {
		return err
	}
	sale.SaleNumber = saleNo

	_, err = r.pool.Exec(ctx,
		`INSERT INTO sales (
			id, shop_id, sale_number, customer_id, status,
			sale_type, sale_info, date,
			qty, description, department, amount,
			is_taxable, payment_type,
			supplier_id, supplier_invoice, part_code, cost, list_price,
			technician_id, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
		)`,
		sale.ID, sale.ShopID, sale.SaleNumber, sale.CustomerID, sale.Status,
		sale.SaleType, sale.SaleInfo, sale.Date,
		sale.Qty, sale.Description, sale.Department, sale.Amount,
		sale.IsTaxable, sale.PaymentType,
		sale.SupplierID, sale.SupplierInvoice, sale.PartCode, sale.Cost, sale.ListPrice,
		sale.TechnicianID, sale.CreatedAt, sale.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create sale: %w", err)
	}
	return nil
}

func (r *SaleRepo) Update(ctx context.Context, sale *models.Sale) error {
	expectedAt := sale.UpdatedAt
	sale.UpdatedAt = time.Now()

	tag, err := r.pool.Exec(ctx,
		`UPDATE sales SET
			customer_id = $3, status = $4,
			sale_type = $5, sale_info = $6, date = $7,
			qty = $8, description = $9, department = $10, amount = $11,
			is_taxable = $12, payment_type = $13,
			supplier_id = $14, supplier_invoice = $15,
			part_code = $16, cost = $17, list_price = $18,
			technician_id = $19, updated_at = $20
		WHERE id = $1 AND shop_id = $2 AND updated_at = $21`,
		sale.ID, sale.ShopID,
		sale.CustomerID, sale.Status,
		sale.SaleType, sale.SaleInfo, sale.Date,
		sale.Qty, sale.Description, sale.Department, sale.Amount,
		sale.IsTaxable, sale.PaymentType,
		sale.SupplierID, sale.SupplierInvoice,
		sale.PartCode, sale.Cost, sale.ListPrice,
		sale.TechnicianID, sale.UpdatedAt,
		expectedAt,
	)
	if err != nil {
		return fmt.Errorf("update sale: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrStaleUpdate
	}
	return nil
}

func (r *SaleRepo) Delete(ctx context.Context, shopID, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM sales WHERE id = $1 AND shop_id = $2`, id, shopID)
	if err != nil {
		return fmt.Errorf("delete sale: %w", err)
	}
	return nil
}

func (r *SaleRepo) nextSaleNumber(ctx context.Context, shopID uuid.UUID) (string, error) {
	var num int
	err := r.pool.QueryRow(ctx,
		`UPDATE shop_settings
		 SET next_sale_number = next_sale_number + 1
		 WHERE shop_id = $1
		 RETURNING next_sale_number - 1`,
		shopID,
	).Scan(&num)
	if err != nil {
		return "", fmt.Errorf("next sale number: %w", err)
	}
	return fmt.Sprintf("%07d", num), nil
}
