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

func (r *UserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT id, shop_id, email, password_hash, name, role, is_active, created_at, updated_at
		FROM users WHERE email = $1`

	var u models.User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.ShopID, &u.Email, &u.PasswordHash, &u.Name,
		&u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find user by email: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	query := `SELECT id, shop_id, email, password_hash, name, role, is_active, created_at, updated_at
		FROM users WHERE id = $1`

	var u models.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.ShopID, &u.Email, &u.PasswordHash, &u.Name,
		&u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find user by id: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) Create(ctx context.Context, user *models.User) error {
	user.ID = uuid.New()
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	query := `INSERT INTO users (id, shop_id, email, password_hash, name, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := r.pool.Exec(ctx, query,
		user.ID, user.ShopID, user.Email, user.PasswordHash, user.Name,
		user.Role, user.IsActive, user.CreatedAt, user.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create user: %w", err)
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
