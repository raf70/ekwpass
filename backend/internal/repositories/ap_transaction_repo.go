package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rkulczycki/ekwpass/internal/models"
)

type APTransactionRepo struct {
	pool *pgxpool.Pool
}

func NewAPTransactionRepo(pool *pgxpool.Pool) *APTransactionRepo {
	return &APTransactionRepo{pool: pool}
}

const apSelectCols = `
	id, shop_id, supplier_id,
	COALESCE(invoice_number, ''), date,
	COALESCE(type, ''), COALESCE(comment, ''),
	cr_dr, COALESCE(amount, 0), COALESCE(gst_amount, 0),
	created_at`

func scanAPTransaction(s interface{ Scan(dest ...any) error }) (models.APTransaction, error) {
	var t models.APTransaction
	err := s.Scan(
		&t.ID, &t.ShopID, &t.SupplierID,
		&t.InvoiceNumber, &t.Date,
		&t.Type, &t.Comment,
		&t.CrDr, &t.Amount, &t.GSTAmount,
		&t.CreatedAt,
	)
	return t, err
}

func (r *APTransactionRepo) ListBySupplier(ctx context.Context, shopID, supplierID uuid.UUID) ([]models.APTransaction, error) {
	query := fmt.Sprintf(
		`SELECT %s FROM ap_transactions
		 WHERE shop_id = $1 AND supplier_id = $2
		 ORDER BY date DESC, created_at DESC`, apSelectCols)

	rows, err := r.pool.Query(ctx, query, shopID, supplierID)
	if err != nil {
		return nil, fmt.Errorf("list AP transactions: %w", err)
	}
	defer rows.Close()

	var txns []models.APTransaction
	for rows.Next() {
		t, err := scanAPTransaction(rows)
		if err != nil {
			return nil, fmt.Errorf("scan AP transaction: %w", err)
		}
		txns = append(txns, t)
	}
	return txns, nil
}
