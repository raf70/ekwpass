package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type CustomerService struct {
	repo *repositories.CustomerRepo
}

func NewCustomerService(repo *repositories.CustomerRepo) *CustomerService {
	return &CustomerService{repo: repo}
}

func (s *CustomerService) List(ctx context.Context, shopID uuid.UUID, params models.PaginationParams) ([]models.Customer, int64, error) {
	return s.repo.List(ctx, shopID, params)
}

func (s *CustomerService) FindByID(ctx context.Context, shopID uuid.UUID, id uuid.UUID) (*models.Customer, error) {
	return s.repo.FindByID(ctx, shopID, id)
}

func (s *CustomerService) Create(ctx context.Context, c *models.Customer) error {
	return s.repo.Create(ctx, c)
}

func (s *CustomerService) Update(ctx context.Context, c *models.Customer) error {
	return s.repo.Update(ctx, c)
}

func (s *CustomerService) Delete(ctx context.Context, shopID uuid.UUID, id uuid.UUID) error {
	return s.repo.Delete(ctx, shopID, id)
}
