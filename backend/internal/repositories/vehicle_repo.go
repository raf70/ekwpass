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

type VehicleRepo struct {
	pool *pgxpool.Pool
}

func NewVehicleRepo(pool *pgxpool.Pool) *VehicleRepo {
	return &VehicleRepo{pool: pool}
}

const vehicleSelectCols = `id, shop_id, customer_id,
	COALESCE(make, ''), COALESCE(model, ''), COALESCE(year, 0),
	COALESCE(vin, ''), COALESCE(production_date, ''), COALESCE(odometer, 0),
	COALESCE(plate, ''), COALESCE(color, ''), last_service_date,
	COALESCE(reminder_interval_days, 0), COALESCE(car_plan, ''),
	COALESCE(engine, ''), COALESCE(safety_expiry, ''), COALESCE(comments, ''),
	created_at, updated_at`

func scanVehicle(scanner interface{ Scan(dest ...any) error }) (models.Vehicle, error) {
	var v models.Vehicle
	err := scanner.Scan(
		&v.ID, &v.ShopID, &v.CustomerID,
		&v.Make, &v.Model, &v.Year,
		&v.VIN, &v.ProductionDate, &v.Odometer,
		&v.Plate, &v.Color, &v.LastServiceDate,
		&v.ReminderIntervalDays, &v.CarPlan,
		&v.Engine, &v.SafetyExpiry, &v.Comments,
		&v.CreatedAt, &v.UpdatedAt,
	)
	return v, err
}

func (r *VehicleRepo) ListByCustomer(ctx context.Context, shopID uuid.UUID, customerID uuid.UUID) ([]models.Vehicle, error) {
	query := fmt.Sprintf(`SELECT %s FROM vehicles
		WHERE shop_id = $1 AND customer_id = $2
		ORDER BY created_at DESC`, vehicleSelectCols)

	rows, err := r.pool.Query(ctx, query, shopID, customerID)
	if err != nil {
		return nil, fmt.Errorf("list vehicles by customer: %w", err)
	}
	defer rows.Close()

	var vehicles []models.Vehicle
	for rows.Next() {
		v, err := scanVehicle(rows)
		if err != nil {
			return nil, fmt.Errorf("scan vehicle: %w", err)
		}
		vehicles = append(vehicles, v)
	}

	return vehicles, nil
}

func (r *VehicleRepo) FindByID(ctx context.Context, shopID uuid.UUID, id uuid.UUID) (*models.Vehicle, error) {
	query := fmt.Sprintf(`SELECT %s FROM vehicles WHERE id = $1 AND shop_id = $2`, vehicleSelectCols)

	v, err := scanVehicle(r.pool.QueryRow(ctx, query, id, shopID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find vehicle by id: %w", err)
	}
	return &v, nil
}

func (r *VehicleRepo) Create(ctx context.Context, v *models.Vehicle) error {
	v.ID = uuid.New()
	now := time.Now()
	v.CreatedAt = now
	v.UpdatedAt = now

	query := `INSERT INTO vehicles (
		id, shop_id, customer_id, make, model, year, vin, production_date,
		odometer, plate, color, last_service_date, reminder_interval_days,
		car_plan, engine, safety_expiry, comments, created_at, updated_at
	) VALUES (
		$1, $2, $3, $4, $5, $6, $7, $8,
		$9, $10, $11, $12, $13,
		$14, $15, $16, $17, $18, $19
	)`

	_, err := r.pool.Exec(ctx, query,
		v.ID, v.ShopID, v.CustomerID, v.Make, v.Model, v.Year, v.VIN, v.ProductionDate,
		v.Odometer, v.Plate, v.Color, v.LastServiceDate, v.ReminderIntervalDays,
		v.CarPlan, v.Engine, v.SafetyExpiry, v.Comments, v.CreatedAt, v.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create vehicle: %w", err)
	}
	return nil
}

func (r *VehicleRepo) Update(ctx context.Context, v *models.Vehicle) error {
	v.UpdatedAt = time.Now()

	query := `UPDATE vehicles SET
		customer_id = $1, make = $2, model = $3, year = $4, vin = $5,
		production_date = $6, odometer = $7, plate = $8, color = $9,
		last_service_date = $10, reminder_interval_days = $11, car_plan = $12,
		engine = $13, safety_expiry = $14, comments = $15, updated_at = $16
		WHERE id = $17 AND shop_id = $18`

	_, err := r.pool.Exec(ctx, query,
		v.CustomerID, v.Make, v.Model, v.Year, v.VIN,
		v.ProductionDate, v.Odometer, v.Plate, v.Color,
		v.LastServiceDate, v.ReminderIntervalDays, v.CarPlan,
		v.Engine, v.SafetyExpiry, v.Comments, v.UpdatedAt,
		v.ID, v.ShopID,
	)
	if err != nil {
		return fmt.Errorf("update vehicle: %w", err)
	}
	return nil
}

func (r *VehicleRepo) Delete(ctx context.Context, shopID uuid.UUID, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM vehicles WHERE id = $1 AND shop_id = $2`, id, shopID)
	if err != nil {
		return fmt.Errorf("delete vehicle: %w", err)
	}
	return nil
}
