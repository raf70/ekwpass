package repositories

import (
	"context"
	"fmt"
	"math"
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
	id, shop_id, customer_id, work_order_id, date,
	COALESCE(description, ''),
	cr_dr, COALESCE(amount, 0),
	created_at`

func scanARTransaction(s interface{ Scan(dest ...any) error }) (models.ARTransaction, error) {
	var t models.ARTransaction
	err := s.Scan(
		&t.ID, &t.ShopID, &t.CustomerID, &t.WorkOrderID, &t.Date,
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
		`INSERT INTO ar_transactions (id, shop_id, customer_id, work_order_id, date, description, cr_dr, amount, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		t.ID, t.ShopID, t.CustomerID, t.WorkOrderID, t.Date,
		t.Description, t.CrDr, t.Amount, t.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("create AR transaction: %w", err)
	}
	return nil
}

func (r *ARTransactionRepo) DeleteByWorkOrder(ctx context.Context, shopID, workOrderID uuid.UUID) (uuid.UUID, error) {
	var customerID uuid.UUID
	err := r.pool.QueryRow(ctx,
		`DELETE FROM ar_transactions
		 WHERE shop_id = $1 AND work_order_id = $2
		 RETURNING customer_id`,
		shopID, workOrderID,
	).Scan(&customerID)
	if err != nil {
		return uuid.Nil, err
	}
	return customerID, nil
}

func (r *ARTransactionRepo) ProcessAging(ctx context.Context, shopID uuid.UUID) (int, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT customer_id, cr_dr,
			CASE
				WHEN cr_dr = 'CR' THEN 'payment'
				WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN 'current'
				WHEN date >= CURRENT_DATE - INTERVAL '60 days' THEN '30'
				WHEN date >= CURRENT_DATE - INTERVAL '90 days' THEN '60'
				ELSE '90'
			END AS bucket,
			SUM(amount) AS total
		FROM ar_transactions
		WHERE shop_id = $1
		GROUP BY customer_id, cr_dr,
			CASE
				WHEN cr_dr = 'CR' THEN 'payment'
				WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN 'current'
				WHEN date >= CURRENT_DATE - INTERVAL '60 days' THEN '30'
				WHEN date >= CURRENT_DATE - INTERVAL '90 days' THEN '60'
				ELSE '90'
			END
		ORDER BY customer_id`, shopID)
	if err != nil {
		return 0, fmt.Errorf("query aging buckets: %w", err)
	}
	defer rows.Close()

	type buckets struct{ current, d30, d60, d90, payments float64 }
	customers := make(map[uuid.UUID]*buckets)

	for rows.Next() {
		var custID uuid.UUID
		var crdr, bucket string
		var total float64
		if err := rows.Scan(&custID, &crdr, &bucket, &total); err != nil {
			return 0, fmt.Errorf("scan aging row: %w", err)
		}
		b, ok := customers[custID]
		if !ok {
			b = &buckets{}
			customers[custID] = b
		}
		switch bucket {
		case "current":
			b.current += total
		case "30":
			b.d30 += total
		case "60":
			b.d60 += total
		case "90":
			b.d90 += total
		case "payment":
			b.payments += total
		}
	}

	for custID, b := range customers {
		rem := b.payments
		// Apply payments to oldest buckets first (FIFO)
		if rem > 0 && b.d90 > 0 {
			applied := min(rem, b.d90)
			b.d90 -= applied
			rem -= applied
		}
		if rem > 0 && b.d60 > 0 {
			applied := min(rem, b.d60)
			b.d60 -= applied
			rem -= applied
		}
		if rem > 0 && b.d30 > 0 {
			applied := min(rem, b.d30)
			b.d30 -= applied
			rem -= applied
		}
		if rem > 0 && b.current > 0 {
			applied := min(rem, b.current)
			b.current -= applied
		}

		_, err := r.pool.Exec(ctx, `
			UPDATE customers SET
				ar_current = $3, ar_30 = $4, ar_60 = $5, ar_90 = $6,
				updated_at = NOW()
			WHERE id = $2 AND shop_id = $1`,
			shopID, custID,
			b.current, b.d30, b.d60, b.d90,
		)
		if err != nil {
			return 0, fmt.Errorf("update aging for customer %s: %w", custID, err)
		}
	}

	return len(customers), nil
}

func (r *ARTransactionRepo) ApplyInterest(ctx context.Context, shopID uuid.UUID) (int, error) {
	var rate float64
	err := r.pool.QueryRow(ctx,
		`SELECT COALESCE(ar_interest_rate, 0) FROM shop_settings WHERE shop_id = $1`,
		shopID,
	).Scan(&rate)
	if err != nil {
		return 0, fmt.Errorf("read interest rate: %w", err)
	}
	if rate <= 0 {
		return 0, nil
	}

	rows, err := r.pool.Query(ctx,
		`SELECT id, COALESCE(ar_30, 0), COALESCE(ar_60, 0), COALESCE(ar_90, 0)
		 FROM customers
		 WHERE shop_id = $1 AND (COALESCE(ar_30, 0) + COALESCE(ar_60, 0) + COALESCE(ar_90, 0)) > 0`,
		shopID,
	)
	if err != nil {
		return 0, fmt.Errorf("query overdue customers: %w", err)
	}
	defer rows.Close()

	type overdue struct {
		id  uuid.UUID
		amt float64
	}
	var customers []overdue
	for rows.Next() {
		var custID uuid.UUID
		var d30, d60, d90 float64
		if err := rows.Scan(&custID, &d30, &d60, &d90); err != nil {
			return 0, fmt.Errorf("scan overdue row: %w", err)
		}
		total := d30 + d60 + d90
		if total > 0 {
			customers = append(customers, overdue{id: custID, amt: total})
		}
	}

	pct := rate / 100.0
	count := 0
	now := time.Now()

	for _, c := range customers {
		interest := math.Round(c.amt*pct*100) / 100
		if interest < 0.01 {
			continue
		}

		txn := &models.ARTransaction{
			ShopID:      shopID,
			CustomerID:  c.id,
			Date:        now,
			Description: fmt.Sprintf("Interest %.2f%% on overdue", rate),
			CrDr:        "DR",
			Amount:      interest,
		}
		if err := r.Create(ctx, txn); err != nil {
			return count, fmt.Errorf("create interest txn for %s: %w", c.id, err)
		}
		if err := r.UpdateCustomerBalance(ctx, shopID, c.id); err != nil {
			return count, fmt.Errorf("update balance for %s: %w", c.id, err)
		}
		count++
	}

	return count, nil
}

func (r *ARTransactionRepo) MarkStatements(ctx context.Context, shopID uuid.UUID) (int, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE customers SET
			ar_stmt_balance = ar_balance,
			ar_stmt_flag = true,
			updated_at = NOW()
		WHERE shop_id = $1 AND ar_balance != 0`,
		shopID,
	)
	if err != nil {
		return 0, fmt.Errorf("mark statements: %w", err)
	}
	return int(tag.RowsAffected()), nil
}

func (r *ARTransactionRepo) MarkStatement(ctx context.Context, shopID, customerID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE customers SET
			ar_stmt_balance = ar_balance,
			ar_stmt_flag = true,
			updated_at = NOW()
		WHERE id = $1 AND shop_id = $2`,
		customerID, shopID,
	)
	if err != nil {
		return fmt.Errorf("mark statement: %w", err)
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
