package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type SaleService struct {
	repo *repositories.SaleRepo
}

func NewSaleService(repo *repositories.SaleRepo) *SaleService {
	return &SaleService{repo: repo}
}

func (s *SaleService) List(ctx context.Context, shopID uuid.UUID, params models.PaginationParams, status string) ([]models.Sale, int64, error) {
	return s.repo.List(ctx, shopID, params, status)
}

func (s *SaleService) FindByID(ctx context.Context, shopID, id uuid.UUID) (*models.Sale, error) {
	return s.repo.FindByID(ctx, shopID, id)
}

func (s *SaleService) Create(ctx context.Context, sale *models.Sale) error {
	if sale.Status == "" {
		sale.Status = "closed"
	}
	return s.repo.Create(ctx, sale)
}

func (s *SaleService) Update(ctx context.Context, sale *models.Sale) error {
	return s.repo.Update(ctx, sale)
}

func (s *SaleService) Delete(ctx context.Context, shopID, id uuid.UUID) error {
	return s.repo.Delete(ctx, shopID, id)
}
