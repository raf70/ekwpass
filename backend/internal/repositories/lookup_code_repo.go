package repositories

import (
	"context"
	"fmt"

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

const lcSelectCols = `id, shop_id, table_id, key_value, description, department,
	hours, rate, sales, cost, amount, flag, created_at, updated_at`

func scanLookupCode(s interface{ Scan(dest ...any) error }) (models.LookupCode, error) {
	var c models.LookupCode
	err := s.Scan(
		&c.ID, &c.ShopID, &c.TableID, &c.KeyValue, &c.Description,
		&c.Department, &c.Hours, &c.Rate, &c.Sales, &c.Cost,
		&c.Amount, &c.Flag, &c.CreatedAt, &c.UpdatedAt,
	)
	return c, err
}

func (r *LookupCodeRepo) ListCategories(ctx context.Context, shopID uuid.UUID) ([]map[string]interface{}, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT table_id, COUNT(*) as cnt
		 FROM lookup_codes WHERE shop_id = $1
		 GROUP BY table_id ORDER BY table_id`, shopID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cats []map[string]interface{}
	for rows.Next() {
		var tid string
		var cnt int
		if err := rows.Scan(&tid, &cnt); err != nil {
			return nil, err
		}
		cats = append(cats, map[string]interface{}{"tableId": tid, "count": cnt})
	}
	return cats, rows.Err()
}

func (r *LookupCodeRepo) ListByTableID(ctx context.Context, shopID uuid.UUID, tableID string) ([]models.LookupCode, error) {
	rows, err := r.pool.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM lookup_codes
		 WHERE shop_id = $1 AND table_id = $2
		 ORDER BY key_value`, lcSelectCols),
		shopID, tableID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var codes []models.LookupCode
	for rows.Next() {
		c, err := scanLookupCode(rows)
		if err != nil {
			return nil, err
		}
		codes = append(codes, c)
	}
	return codes, rows.Err()
}

func (r *LookupCodeRepo) Create(ctx context.Context, c *models.LookupCode) error {
	c.ID = uuid.New()
	return r.pool.QueryRow(ctx,
		fmt.Sprintf(`INSERT INTO lookup_codes
			(id, shop_id, table_id, key_value, description, department, hours, rate, sales, cost, amount, flag)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		 RETURNING %s`, lcSelectCols),
		c.ID, c.ShopID, c.TableID, c.KeyValue, c.Description, c.Department,
		c.Hours, c.Rate, c.Sales, c.Cost, c.Amount, c.Flag,
	).Scan(
		&c.ID, &c.ShopID, &c.TableID, &c.KeyValue, &c.Description,
		&c.Department, &c.Hours, &c.Rate, &c.Sales, &c.Cost,
		&c.Amount, &c.Flag, &c.CreatedAt, &c.UpdatedAt,
	)
}

func (r *LookupCodeRepo) Update(ctx context.Context, c *models.LookupCode) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE lookup_codes SET
			description = $3, department = $4, hours = $5, rate = $6,
			sales = $7, cost = $8, amount = $9, flag = $10
		 WHERE id = $1 AND shop_id = $2`,
		c.ID, c.ShopID,
		c.Description, c.Department, c.Hours, c.Rate,
		c.Sales, c.Cost, c.Amount, c.Flag,
	)
	return err
}

func (r *LookupCodeRepo) Delete(ctx context.Context, shopID, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM lookup_codes WHERE id = $1 AND shop_id = $2`, id, shopID)
	return err
}
