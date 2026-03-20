package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type WorkOrderService struct {
	repo *repositories.WorkOrderRepo
}

func NewWorkOrderService(repo *repositories.WorkOrderRepo) *WorkOrderService {
	return &WorkOrderService{repo: repo}
}

func (s *WorkOrderService) List(ctx context.Context, shopID uuid.UUID, params models.PaginationParams, status string) ([]models.WorkOrder, int64, error) {
	return s.repo.List(ctx, shopID, params, status)
}

func (s *WorkOrderService) FindByID(ctx context.Context, shopID, id uuid.UUID) (*models.WorkOrder, error) {
	return s.repo.FindByID(ctx, shopID, id)
}

func (s *WorkOrderService) Update(ctx context.Context, wo *models.WorkOrder) error {
	return s.repo.Update(ctx, wo)
}

func (s *WorkOrderService) Create(ctx context.Context, wo *models.WorkOrder) error {
	invNo, err := s.repo.NextInvoiceNumber(ctx, wo.ShopID)
	if err != nil {
		return err
	}
	wo.InvoiceNumber = invNo
	wo.Status = "open"
	return s.repo.Create(ctx, wo)
}
