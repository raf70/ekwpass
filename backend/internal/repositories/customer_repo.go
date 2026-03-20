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

type CustomerRepo struct {
	pool *pgxpool.Pool
}

func NewCustomerRepo(pool *pgxpool.Pool) *CustomerRepo {
	return &CustomerRepo{pool: pool}
}

const customerSelectCols = `id, shop_id, COALESCE(phone, ''), COALESCE(phone_secondary, ''), name,
	COALESCE(street, ''), COALESCE(city, ''), COALESCE(province, ''), COALESCE(postal_code, ''),
	COALESCE(attention, ''), COALESCE(credit_limit, 0), COALESCE(pst_exempt, false),
	COALESCE(pst_number, ''), COALESCE(gst_exempt, false), COALESCE(gst_number, ''),
	COALESCE(is_wholesale, false), COALESCE(price_class, 0), COALESCE(remarks, ''),
	COALESCE(gender, ''), COALESCE(category1, ''), COALESCE(category2, ''),
	COALESCE(ytd_sales, 0), COALESCE(ytd_gst, 0), last_service_date,
	COALESCE(ar_balance, 0), COALESCE(ar_current, 0), COALESCE(ar_30, 0),
	COALESCE(ar_60, 0), COALESCE(ar_90, 0), COALESCE(ar_stmt_balance, 0),
	COALESCE(ar_stmt_flag, false), created_at, updated_at`

func scanCustomer(scanner interface{ Scan(dest ...any) error }) (models.Customer, error) {
	var c models.Customer
	err := scanner.Scan(
		&c.ID, &c.ShopID, &c.Phone, &c.PhoneSecondary, &c.Name,
		&c.Street, &c.City, &c.Province, &c.PostalCode,
		&c.Attention, &c.CreditLimit, &c.PSTExempt,
		&c.PSTNumber, &c.GSTExempt, &c.GSTNumber,
		&c.IsWholesale, &c.PriceClass, &c.Remarks,
		&c.Gender, &c.Category1, &c.Category2,
		&c.YTDSales, &c.YTDGST, &c.LastServiceDate,
		&c.ARBalance, &c.ARCurrent, &c.AR30,
		&c.AR60, &c.AR90, &c.ARStmtBalance,
		&c.ARStmtFlag, &c.CreatedAt, &c.UpdatedAt,
	)
	return c, err
}

func (r *CustomerRepo) List(ctx context.Context, shopID uuid.UUID, params models.PaginationParams) ([]models.Customer, int64, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 {
		params.PageSize = 20
	}

	search := "%" + params.Search + "%"

	var total int64
	countQuery := `SELECT COUNT(*) FROM customers
		WHERE shop_id = $1 AND (name ILIKE $2 OR COALESCE(phone, '') ILIKE $2)`
	err := r.pool.QueryRow(ctx, countQuery, shopID, search).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count customers: %w", err)
	}

	offset := (params.Page - 1) * params.PageSize
	query := fmt.Sprintf(`SELECT %s FROM customers
		WHERE shop_id = $1 AND (name ILIKE $2 OR COALESCE(phone, '') ILIKE $2)
		ORDER BY name ASC LIMIT $3 OFFSET $4`, customerSelectCols)

	rows, err := r.pool.Query(ctx, query, shopID, search, params.PageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list customers: %w", err)
	}
	defer rows.Close()

	var customers []models.Customer
	for rows.Next() {
		c, err := scanCustomer(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan customer: %w", err)
		}
		customers = append(customers, c)
	}

	return customers, total, nil
}

func (r *CustomerRepo) FindByID(ctx context.Context, shopID uuid.UUID, id uuid.UUID) (*models.Customer, error) {
	query := fmt.Sprintf(`SELECT %s FROM customers WHERE id = $1 AND shop_id = $2`, customerSelectCols)

	c, err := scanCustomer(r.pool.QueryRow(ctx, query, id, shopID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find customer by id: %w", err)
	}
	return &c, nil
}

func (r *CustomerRepo) Create(ctx context.Context, c *models.Customer) error {
	c.ID = uuid.New()
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now

	query := `INSERT INTO customers (
		id, shop_id, phone, phone_secondary, name, street, city, province, postal_code,
		attention, credit_limit, pst_exempt, pst_number, gst_exempt, gst_number,
		is_wholesale, price_class, remarks, gender, category1, category2,
		ytd_sales, ytd_gst, last_service_date, ar_balance, ar_current, ar_30,
		ar_60, ar_90, ar_stmt_balance, ar_stmt_flag, created_at, updated_at
	) VALUES (
		$1, $2, $3, $4, $5, $6, $7, $8, $9,
		$10, $11, $12, $13, $14, $15,
		$16, $17, $18, $19, $20, $21,
		$22, $23, $24, $25, $26, $27,
		$28, $29, $30, $31, $32, $33
	)`

	_, err := r.pool.Exec(ctx, query,
		c.ID, c.ShopID, c.Phone, c.PhoneSecondary, c.Name, c.Street, c.City, c.Province, c.PostalCode,
		c.Attention, c.CreditLimit, c.PSTExempt, c.PSTNumber, c.GSTExempt, c.GSTNumber,
		c.IsWholesale, c.PriceClass, c.Remarks, c.Gender, c.Category1, c.Category2,
		c.YTDSales, c.YTDGST, c.LastServiceDate, c.ARBalance, c.ARCurrent, c.AR30,
		c.AR60, c.AR90, c.ARStmtBalance, c.ARStmtFlag, c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create customer: %w", err)
	}
	return nil
}

func (r *CustomerRepo) Update(ctx context.Context, c *models.Customer) error {
	c.UpdatedAt = time.Now()

	query := `UPDATE customers SET
		phone = $1, phone_secondary = $2, name = $3, street = $4, city = $5,
		province = $6, postal_code = $7, attention = $8, credit_limit = $9,
		pst_exempt = $10, pst_number = $11, gst_exempt = $12, gst_number = $13,
		is_wholesale = $14, price_class = $15, remarks = $16, gender = $17,
		category1 = $18, category2 = $19, ytd_sales = $20, ytd_gst = $21,
		last_service_date = $22, ar_balance = $23, ar_current = $24, ar_30 = $25,
		ar_60 = $26, ar_90 = $27, ar_stmt_balance = $28, ar_stmt_flag = $29,
		updated_at = $30
		WHERE id = $31 AND shop_id = $32`

	_, err := r.pool.Exec(ctx, query,
		c.Phone, c.PhoneSecondary, c.Name, c.Street, c.City,
		c.Province, c.PostalCode, c.Attention, c.CreditLimit,
		c.PSTExempt, c.PSTNumber, c.GSTExempt, c.GSTNumber,
		c.IsWholesale, c.PriceClass, c.Remarks, c.Gender,
		c.Category1, c.Category2, c.YTDSales, c.YTDGST,
		c.LastServiceDate, c.ARBalance, c.ARCurrent, c.AR30,
		c.AR60, c.AR90, c.ARStmtBalance, c.ARStmtFlag,
		c.UpdatedAt, c.ID, c.ShopID,
	)
	if err != nil {
		return fmt.Errorf("update customer: %w", err)
	}
	return nil
}

func (r *CustomerRepo) Delete(ctx context.Context, shopID uuid.UUID, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM customers WHERE id = $1 AND shop_id = $2`, id, shopID)
	if err != nil {
		return fmt.Errorf("delete customer: %w", err)
	}
	return nil
}
