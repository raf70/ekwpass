package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type VehicleService struct {
	repo *repositories.VehicleRepo
}

func NewVehicleService(repo *repositories.VehicleRepo) *VehicleService {
	return &VehicleService{repo: repo}
}

func (s *VehicleService) ListByCustomer(ctx context.Context, shopID uuid.UUID, customerID uuid.UUID) ([]models.Vehicle, error) {
	return s.repo.ListByCustomer(ctx, shopID, customerID)
}

func (s *VehicleService) FindByID(ctx context.Context, shopID uuid.UUID, id uuid.UUID) (*models.Vehicle, error) {
	return s.repo.FindByID(ctx, shopID, id)
}

func (s *VehicleService) Create(ctx context.Context, v *models.Vehicle) error {
	return s.repo.Create(ctx, v)
}

func (s *VehicleService) Update(ctx context.Context, v *models.Vehicle) error {
	return s.repo.Update(ctx, v)
}

func (s *VehicleService) Delete(ctx context.Context, shopID uuid.UUID, id uuid.UUID) error {
	return s.repo.Delete(ctx, shopID, id)
}
