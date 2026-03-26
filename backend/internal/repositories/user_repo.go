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

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

const userSelectCols = `id, shop_id, email, password_hash, name, role, is_active, created_at, updated_at`

func scanUser(s interface{ Scan(dest ...any) error }) (*models.User, error) {
	var u models.User
	err := s.Scan(
		&u.ID, &u.ShopID, &u.Email, &u.PasswordHash, &u.Name,
		&u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	u, err := scanUser(r.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s FROM users WHERE email = $1`, userSelectCols), email))
	if err != nil {
		return nil, fmt.Errorf("find user by email: %w", err)
	}
	return u, nil
}

func (r *UserRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	u, err := scanUser(r.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT %s FROM users WHERE id = $1`, userSelectCols), id))
	if err != nil {
		return nil, fmt.Errorf("find user by id: %w", err)
	}
	return u, nil
}

func (r *UserRepo) ListByShop(ctx context.Context, shopID uuid.UUID) ([]models.User, error) {
	rows, err := r.pool.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM users WHERE shop_id = $1 ORDER BY name`, userSelectCols),
		shopID)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		if u != nil {
			users = append(users, *u)
		}
	}
	return users, rows.Err()
}

func (r *UserRepo) Create(ctx context.Context, user *models.User) error {
	user.ID = uuid.New()
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	_, err := r.pool.Exec(ctx,
		`INSERT INTO users (id, shop_id, email, password_hash, name, role, is_active, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		user.ID, user.ShopID, user.Email, user.PasswordHash, user.Name,
		user.Role, user.IsActive, user.CreatedAt, user.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

func (r *UserRepo) Update(ctx context.Context, user *models.User) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET name = $3, email = $4, role = $5, is_active = $6, updated_at = NOW()
		 WHERE id = $1 AND shop_id = $2`,
		user.ID, user.ShopID, user.Name, user.Email, user.Role, user.IsActive,
	)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	return nil
}

func (r *UserRepo) UpdatePassword(ctx context.Context, id uuid.UUID, hash string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, id, hash)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

func (r *UserRepo) CountAll(ctx context.Context) (int64, error) {
	var count int64
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count users: %w", err)
	}
	return count, nil
}

func (r *UserRepo) CountByShop(ctx context.Context, shopID uuid.UUID) (int64, error) {
	var count int64
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM users WHERE shop_id = $1`, shopID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count users by shop: %w", err)
	}
	return count, nil
}
