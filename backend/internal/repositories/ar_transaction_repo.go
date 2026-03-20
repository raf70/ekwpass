package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rkulczycki/ekwpass/internal/models"
)

type ARTransactionRepo struct {
	pool *pgxpool.Pool
}

func NewARTransactionRepo(pool *pgxpool.Pool) *ARTransactionRepo {
	return &ARTransactionRepo{pool: pool}
}

const arSelectCols = `
	id, shop_id, customer_id, date,
	COALESCE(description, ''),
	cr_dr, COALESCE(amount, 0),
	created_at`

func scanARTransaction(s interface{ Scan(dest ...any) error }) (models.ARTransaction, error) {
	var t models.ARTransaction
	err := s.Scan(
		&t.ID, &t.ShopID, &t.CustomerID, &t.Date,
		&t.Description,
		&t.CrDr, &t.Amount,
		&t.CreatedAt,
	)
	return t, err
}

func (r *ARTransactionRepo) ListByCustomer(ctx context.Context, shopID, customerID uuid.UUID) ([]models.ARTransaction, error) {
	query := fmt.Sprintf(
		`SELECT %s FROM ar_transactions
		 WHERE shop_id = $1 AND customer_id = $2
		 ORDER BY date DESC, created_at DESC`, arSelectCols)

	rows, err := r.pool.Query(ctx, query, shopID, customerID)
	if err != nil {
		return nil, fmt.Errorf("list AR transactions: %w", err)
	}
	defer rows.Close()

	var txns []models.ARTransaction
	for rows.Next() {
		t, err := scanARTransaction(rows)
		if err != nil {
			return nil, fmt.Errorf("scan AR transaction: %w", err)
		}
		txns = append(txns, t)
	}
	return txns, nil
}

func (r *ARTransactionRepo) Create(ctx context.Context, t *models.ARTransaction) error {
	t.ID = uuid.New()
	t.CreatedAt = time.Now()

	_, err := r.pool.Exec(ctx,
		`INSERT INTO ar_transactions (id, shop_id, customer_id, date, description, cr_dr, amount, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		t.ID, t.ShopID, t.CustomerID, t.Date,
		t.Description, t.CrDr, t.Amount, t.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("create AR transaction: %w", err)
	}
	return nil
}

func (r *ARTransactionRepo) UpdateCustomerBalance(ctx context.Context, shopID, customerID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE customers SET
			ar_balance = COALESCE((
				SELECT SUM(CASE WHEN cr_dr = 'DR' THEN amount ELSE -amount END)
				FROM ar_transactions WHERE shop_id = $1 AND customer_id = $2
			), 0),
			updated_at = NOW()
		WHERE id = $2 AND shop_id = $1`,
		shopID, customerID,
	)
	if err != nil {
		return fmt.Errorf("update customer AR balance: %w", err)
	}
	return nil
}
