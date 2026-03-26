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

type SupplierRepo struct {
	pool *pgxpool.Pool
}

func NewSupplierRepo(pool *pgxpool.Pool) *SupplierRepo {
	return &SupplierRepo{pool: pool}
}

const supplierSelectCols = `
	id, shop_id, COALESCE(code, ''), COALESCE(name, ''),
	COALESCE(address1, ''), COALESCE(address2, ''),
	COALESCE(city, ''), COALESCE(province, ''), COALESCE(postal_code, ''),
	COALESCE(country, ''),
	COALESCE(phone1, ''), COALESCE(phone2, ''),
	COALESCE(gst_number, ''),
	COALESCE(remark1, ''), COALESCE(remark2, ''),
	COALESCE(balance, 0), COALESCE(opening_balance, 0),
	COALESCE(is_active, true), COALESCE(pst_gst_flag, ''),
	created_at, updated_at`

func scanSupplier(s interface{ Scan(dest ...any) error }) (models.Supplier, error) {
	var sup models.Supplier
	err := s.Scan(
		&sup.ID, &sup.ShopID, &sup.Code, &sup.Name,
		&sup.Address1, &sup.Address2,
		&sup.City, &sup.Province, &sup.PostalCode,
		&sup.Country,
		&sup.Phone1, &sup.Phone2,
		&sup.GSTNumber,
		&sup.Remark1, &sup.Remark2,
		&sup.Balance, &sup.OpeningBalance,
		&sup.IsActive, &sup.PSTGSTFlag,
		&sup.CreatedAt, &sup.UpdatedAt,
	)
	return sup, err
}

func (r *SupplierRepo) List(ctx context.Context, shopID uuid.UUID, params models.PaginationParams) ([]models.Supplier, int64, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 {
		params.PageSize = 20
	}

	search := "%" + params.Search + "%"

	var total int64
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM suppliers
		 WHERE shop_id = $1
		   AND (COALESCE(code,'') ILIKE $2 OR COALESCE(name,'') ILIKE $2 OR COALESCE(city,'') ILIKE $2)`,
		shopID, search,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count suppliers: %w", err)
	}

	offset := (params.Page - 1) * params.PageSize
	query := fmt.Sprintf(
		`SELECT %s FROM suppliers
		 WHERE shop_id = $1
		   AND (COALESCE(code,'') ILIKE $2 OR COALESCE(name,'') ILIKE $2 OR COALESCE(city,'') ILIKE $2)
		 ORDER BY code ASC
		 LIMIT $3 OFFSET $4`, supplierSelectCols)

	rows, err := r.pool.Query(ctx, query, shopID, search, params.PageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list suppliers: %w", err)
	}
	defer rows.Close()

	var suppliers []models.Supplier
	for rows.Next() {
		sup, err := scanSupplier(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan supplier: %w", err)
		}
		suppliers = append(suppliers, sup)
	}
	return suppliers, total, nil
}

func (r *SupplierRepo) FindByID(ctx context.Context, shopID, id uuid.UUID) (*models.Supplier, error) {
	query := fmt.Sprintf(`SELECT %s FROM suppliers WHERE id = $1 AND shop_id = $2`, supplierSelectCols)
	sup, err := scanSupplier(r.pool.QueryRow(ctx, query, id, shopID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find supplier: %w", err)
	}
	return &sup, nil
}

func (r *SupplierRepo) Create(ctx context.Context, sup *models.Supplier) error {
	sup.ID = uuid.New()
	now := time.Now()
	sup.CreatedAt = now
	sup.UpdatedAt = now

	_, err := r.pool.Exec(ctx,
		`INSERT INTO suppliers (
			id, shop_id, code, name,
			address1, address2, city, province, postal_code, country,
			phone1, phone2, gst_number,
			remark1, remark2,
			balance, opening_balance, is_active, pst_gst_flag,
			created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
		)`,
		sup.ID, sup.ShopID, sup.Code, sup.Name,
		sup.Address1, sup.Address2, sup.City, sup.Province, sup.PostalCode, sup.Country,
		sup.Phone1, sup.Phone2, sup.GSTNumber,
		sup.Remark1, sup.Remark2,
		sup.Balance, sup.OpeningBalance, sup.IsActive, sup.PSTGSTFlag,
		sup.CreatedAt, sup.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create supplier: %w", err)
	}
	return nil
}

func (r *SupplierRepo) Update(ctx context.Context, sup *models.Supplier) error {
	expectedAt := sup.UpdatedAt
	sup.UpdatedAt = time.Now()

	tag, err := r.pool.Exec(ctx,
		`UPDATE suppliers SET
			code = $3, name = $4,
			address1 = $5, address2 = $6, city = $7, province = $8,
			postal_code = $9, country = $10,
			phone1 = $11, phone2 = $12, gst_number = $13,
			remark1 = $14, remark2 = $15,
			balance = $16, opening_balance = $17,
			is_active = $18, pst_gst_flag = $19,
			updated_at = $20
		WHERE id = $1 AND shop_id = $2 AND updated_at = $21`,
		sup.ID, sup.ShopID,
		sup.Code, sup.Name,
		sup.Address1, sup.Address2, sup.City, sup.Province,
		sup.PostalCode, sup.Country,
		sup.Phone1, sup.Phone2, sup.GSTNumber,
		sup.Remark1, sup.Remark2,
		sup.Balance, sup.OpeningBalance,
		sup.IsActive, sup.PSTGSTFlag,
		sup.UpdatedAt,
		expectedAt,
	)
	if err != nil {
		return fmt.Errorf("update supplier: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrStaleUpdate
	}
	return nil
}

func (r *SupplierRepo) Delete(ctx context.Context, shopID, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM suppliers WHERE id = $1 AND shop_id = $2`, id, shopID)
	if err != nil {
		return fmt.Errorf("delete supplier: %w", err)
	}
	return nil
}
