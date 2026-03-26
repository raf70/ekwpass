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

type PartRepo struct {
	pool *pgxpool.Pool
}

func NewPartRepo(pool *pgxpool.Pool) *PartRepo {
	return &PartRepo{pool: pool}
}

const partSelectCols = `
	id, shop_id, COALESCE(code, ''), COALESCE(manufacturer, ''),
	COALESCE(alt_code_a, ''), COALESCE(alt_mfgr_a, ''),
	COALESCE(alt_code_b, ''), COALESCE(alt_mfgr_b, ''),
	supplier_id, COALESCE(description, ''),
	COALESCE(department, 0), COALESCE(location, ''),
	COALESCE(qty_on_hand, 0), last_updated, last_sold,
	COALESCE(turnover, 0), COALESCE(ytd_sales, 0), COALESCE(sales_90d, 0),
	COALESCE(reorder_qty, 0), COALESCE(reorder_amount, 0),
	COALESCE(avg_price, 0), COALESCE(sell_price, 0), COALESCE(core_value, 0),
	COALESCE(list_price, 0), COALESCE(wholesale_price, 0),
	COALESCE(discount1, 0), COALESCE(discount2, 0), COALESCE(discount3, 0),
	COALESCE(no_update, false),
	created_at, updated_at`

func scanPart(s interface{ Scan(dest ...any) error }) (models.Part, error) {
	var p models.Part
	err := s.Scan(
		&p.ID, &p.ShopID, &p.Code, &p.Manufacturer,
		&p.AltCodeA, &p.AltMfgrA,
		&p.AltCodeB, &p.AltMfgrB,
		&p.SupplierID, &p.Description,
		&p.Department, &p.Location,
		&p.QtyOnHand, &p.LastUpdated, &p.LastSold,
		&p.Turnover, &p.YTDSales, &p.Sales90D,
		&p.ReorderQty, &p.ReorderAmount,
		&p.AvgPrice, &p.SellPrice, &p.CoreValue,
		&p.ListPrice, &p.WholesalePrice,
		&p.Discount1, &p.Discount2, &p.Discount3,
		&p.NoUpdate,
		&p.CreatedAt, &p.UpdatedAt,
	)
	return p, err
}

func (r *PartRepo) List(ctx context.Context, shopID uuid.UUID, params models.PaginationParams) ([]models.Part, int64, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 {
		params.PageSize = 20
	}

	search := "%" + params.Search + "%"

	var total int64
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM parts
		 WHERE shop_id = $1
		   AND (COALESCE(code,'') ILIKE $2 OR COALESCE(description,'') ILIKE $2 OR COALESCE(manufacturer,'') ILIKE $2)`,
		shopID, search,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count parts: %w", err)
	}

	offset := (params.Page - 1) * params.PageSize
	query := fmt.Sprintf(
		`SELECT %s FROM parts
		 WHERE shop_id = $1
		   AND (COALESCE(code,'') ILIKE $2 OR COALESCE(description,'') ILIKE $2 OR COALESCE(manufacturer,'') ILIKE $2)
		 ORDER BY code ASC
		 LIMIT $3 OFFSET $4`, partSelectCols)

	rows, err := r.pool.Query(ctx, query, shopID, search, params.PageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list parts: %w", err)
	}
	defer rows.Close()

	var parts []models.Part
	for rows.Next() {
		p, err := scanPart(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan part: %w", err)
		}
		parts = append(parts, p)
	}
	return parts, total, nil
}

func (r *PartRepo) Search(ctx context.Context, shopID uuid.UUID, code, description string, limit int) ([]models.Part, error) {
	if limit < 1 || limit > 20 {
		limit = 10
	}

	var where string
	var args []any
	args = append(args, shopID)

	if code != "" {
		args = append(args, code+"%")
		where = fmt.Sprintf("AND COALESCE(code,'') ILIKE $%d", len(args))
	} else if description != "" {
		args = append(args, "%"+description+"%")
		where = fmt.Sprintf("AND COALESCE(description,'') ILIKE $%d", len(args))
	} else {
		return nil, nil
	}

	args = append(args, limit)
	query := fmt.Sprintf(
		`SELECT %s FROM parts WHERE shop_id = $1 %s ORDER BY code ASC LIMIT $%d`,
		partSelectCols, where, len(args))

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("search parts: %w", err)
	}
	defer rows.Close()

	var parts []models.Part
	for rows.Next() {
		p, err := scanPart(rows)
		if err != nil {
			return nil, fmt.Errorf("scan part: %w", err)
		}
		parts = append(parts, p)
	}
	return parts, nil
}

func (r *PartRepo) FindByID(ctx context.Context, shopID, id uuid.UUID) (*models.Part, error) {
	query := fmt.Sprintf(`SELECT %s FROM parts WHERE id = $1 AND shop_id = $2`, partSelectCols)
	p, err := scanPart(r.pool.QueryRow(ctx, query, id, shopID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find part: %w", err)
	}
	return &p, nil
}

func (r *PartRepo) Create(ctx context.Context, p *models.Part) error {
	p.ID = uuid.New()
	now := time.Now()
	p.CreatedAt = now
	p.UpdatedAt = now

	_, err := r.pool.Exec(ctx,
		`INSERT INTO parts (
			id, shop_id, code, manufacturer,
			alt_code_a, alt_mfgr_a, alt_code_b, alt_mfgr_b,
			supplier_id, description, department, location,
			qty_on_hand, sell_price, list_price, wholesale_price,
			avg_price, core_value,
			reorder_qty, reorder_amount,
			discount1, discount2, discount3,
			no_update, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
			$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
		)`,
		p.ID, p.ShopID, p.Code, p.Manufacturer,
		p.AltCodeA, p.AltMfgrA, p.AltCodeB, p.AltMfgrB,
		p.SupplierID, p.Description, p.Department, p.Location,
		p.QtyOnHand, p.SellPrice, p.ListPrice, p.WholesalePrice,
		p.AvgPrice, p.CoreValue,
		p.ReorderQty, p.ReorderAmount,
		p.Discount1, p.Discount2, p.Discount3,
		p.NoUpdate, p.CreatedAt, p.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create part: %w", err)
	}
	return nil
}

func (r *PartRepo) Update(ctx context.Context, p *models.Part) error {
	expectedAt := p.UpdatedAt
	p.UpdatedAt = time.Now()

	tag, err := r.pool.Exec(ctx,
		`UPDATE parts SET
			code = $3, manufacturer = $4,
			alt_code_a = $5, alt_mfgr_a = $6, alt_code_b = $7, alt_mfgr_b = $8,
			supplier_id = $9, description = $10, department = $11, location = $12,
			qty_on_hand = $13, sell_price = $14, list_price = $15, wholesale_price = $16,
			avg_price = $17, core_value = $18,
			reorder_qty = $19, reorder_amount = $20,
			discount1 = $21, discount2 = $22, discount3 = $23,
			no_update = $24, updated_at = $25
		WHERE id = $1 AND shop_id = $2 AND updated_at = $26`,
		p.ID, p.ShopID,
		p.Code, p.Manufacturer,
		p.AltCodeA, p.AltMfgrA, p.AltCodeB, p.AltMfgrB,
		p.SupplierID, p.Description, p.Department, p.Location,
		p.QtyOnHand, p.SellPrice, p.ListPrice, p.WholesalePrice,
		p.AvgPrice, p.CoreValue,
		p.ReorderQty, p.ReorderAmount,
		p.Discount1, p.Discount2, p.Discount3,
		p.NoUpdate, p.UpdatedAt,
		expectedAt,
	)
	if err != nil {
		return fmt.Errorf("update part: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrStaleUpdate
	}
	return nil
}

func (r *PartRepo) ListBySupplier(ctx context.Context, shopID, supplierID uuid.UUID) ([]models.Part, error) {
	query := fmt.Sprintf(
		`SELECT %s FROM parts
		 WHERE shop_id = $1 AND supplier_id = $2
		 ORDER BY code ASC`, partSelectCols)

	rows, err := r.pool.Query(ctx, query, shopID, supplierID)
	if err != nil {
		return nil, fmt.Errorf("list parts by supplier: %w", err)
	}
	defer rows.Close()

	var parts []models.Part
	for rows.Next() {
		p, err := scanPart(rows)
		if err != nil {
			return nil, fmt.Errorf("scan part: %w", err)
		}
		parts = append(parts, p)
	}
	return parts, nil
}

func (r *PartRepo) Delete(ctx context.Context, shopID, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM parts WHERE id = $1 AND shop_id = $2`, id, shopID)
	if err != nil {
		return fmt.Errorf("delete part: %w", err)
	}
	return nil
}
