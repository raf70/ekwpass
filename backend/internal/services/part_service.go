package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type PartService struct {
	repo *repositories.PartRepo
}

func NewPartService(repo *repositories.PartRepo) *PartService {
	return &PartService{repo: repo}
}

func (s *PartService) List(ctx context.Context, shopID uuid.UUID, params models.PaginationParams) ([]models.Part, int64, error) {
	return s.repo.List(ctx, shopID, params)
}

func (s *PartService) Search(ctx context.Context, shopID uuid.UUID, code, description string, limit int) ([]models.Part, error) {
	return s.repo.Search(ctx, shopID, code, description, limit)
}

func (s *PartService) FindByID(ctx context.Context, shopID, id uuid.UUID) (*models.Part, error) {
	return s.repo.FindByID(ctx, shopID, id)
}

func (s *PartService) Create(ctx context.Context, p *models.Part) error {
	return s.repo.Create(ctx, p)
}

func (s *PartService) Update(ctx context.Context, p *models.Part) error {
	return s.repo.Update(ctx, p)
}

func (s *PartService) ListBySupplier(ctx context.Context, shopID, supplierID uuid.UUID) ([]models.Part, error) {
	return s.repo.ListBySupplier(ctx, shopID, supplierID)
}

func (s *PartService) Delete(ctx context.Context, shopID, id uuid.UUID) error {
	return s.repo.Delete(ctx, shopID, id)
}
