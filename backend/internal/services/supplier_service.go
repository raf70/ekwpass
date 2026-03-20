package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type SupplierService struct {
	repo *repositories.SupplierRepo
}

func NewSupplierService(repo *repositories.SupplierRepo) *SupplierService {
	return &SupplierService{repo: repo}
}

func (s *SupplierService) List(ctx context.Context, shopID uuid.UUID, params models.PaginationParams) ([]models.Supplier, int64, error) {
	return s.repo.List(ctx, shopID, params)
}

func (s *SupplierService) FindByID(ctx context.Context, shopID, id uuid.UUID) (*models.Supplier, error) {
	return s.repo.FindByID(ctx, shopID, id)
}

func (s *SupplierService) Create(ctx context.Context, sup *models.Supplier) error {
	return s.repo.Create(ctx, sup)
}

func (s *SupplierService) Update(ctx context.Context, sup *models.Supplier) error {
	return s.repo.Update(ctx, sup)
}

func (s *SupplierService) Delete(ctx context.Context, shopID, id uuid.UUID) error {
	return s.repo.Delete(ctx, shopID, id)
}
