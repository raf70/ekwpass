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

type ShopRepo struct {
	pool *pgxpool.Pool
}

func NewShopRepo(pool *pgxpool.Pool) *ShopRepo {
	return &ShopRepo{pool: pool}
}

func (r *ShopRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.Shop, error) {
	query := `SELECT id, name, COALESCE(address, ''), COALESCE(city, ''),
		COALESCE(province, ''), COALESCE(postal_code, ''), COALESCE(phone, ''),
		COALESCE(gst_number, ''), created_at, updated_at
		FROM shops WHERE id = $1`

	var s models.Shop
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Name, &s.Address, &s.City,
		&s.Province, &s.PostalCode, &s.Phone,
		&s.GSTNumber, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find shop by id: %w", err)
	}
	return &s, nil
}

func (r *ShopRepo) Create(ctx context.Context, shop *models.Shop) error {
	shop.ID = uuid.New()
	now := time.Now()
	shop.CreatedAt = now
	shop.UpdatedAt = now

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	shopQuery := `INSERT INTO shops (id, name, address, city, province, postal_code, phone, gst_number, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	_, err = tx.Exec(ctx, shopQuery,
		shop.ID, shop.Name, shop.Address, shop.City, shop.Province,
		shop.PostalCode, shop.Phone, shop.GSTNumber, shop.CreatedAt, shop.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert shop: %w", err)
	}

	settingsQuery := `INSERT INTO shop_settings (id, shop_id) VALUES ($1, $2)`
	_, err = tx.Exec(ctx, settingsQuery, uuid.New(), shop.ID)
	if err != nil {
		return fmt.Errorf("insert shop settings: %w", err)
	}

	return tx.Commit(ctx)
}
