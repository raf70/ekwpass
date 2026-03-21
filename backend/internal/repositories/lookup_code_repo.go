package repositories

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rkulczycki/ekwpass/internal/models"
)

type LookupCodeRepo struct {
	pool *pgxpool.Pool
}

func NewLookupCodeRepo(pool *pgxpool.Pool) *LookupCodeRepo {
	return &LookupCodeRepo{pool: pool}
}

func (r *LookupCodeRepo) ListByTableID(ctx context.Context, shopID uuid.UUID, tableID string) ([]models.LookupCode, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, shop_id, table_id, key_value, description, department,
		        hours, rate, sales, cost, amount, flag, created_at, updated_at
		 FROM lookup_codes
		 WHERE shop_id = $1 AND table_id = $2
		 ORDER BY key_value`,
		shopID, tableID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var codes []models.LookupCode
	for rows.Next() {
		var c models.LookupCode
		if err := rows.Scan(
			&c.ID, &c.ShopID, &c.TableID, &c.KeyValue, &c.Description,
			&c.Department, &c.Hours, &c.Rate, &c.Sales, &c.Cost,
			&c.Amount, &c.Flag, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		codes = append(codes, c)
	}
	return codes, rows.Err()
}
