package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
)

type WorkOrderService struct {
	repo         *repositories.WorkOrderRepo
	customerRepo *repositories.CustomerRepo
	arRepo       *repositories.ARTransactionRepo
}

func NewWorkOrderService(repo *repositories.WorkOrderRepo, customerRepo *repositories.CustomerRepo, arRepo *repositories.ARTransactionRepo) *WorkOrderService {
	return &WorkOrderService{repo: repo, customerRepo: customerRepo, arRepo: arRepo}
}

func (s *WorkOrderService) List(ctx context.Context, shopID uuid.UUID, params models.PaginationParams, status string) ([]models.WorkOrder, int64, error) {
	return s.repo.List(ctx, shopID, params, status)
}

func (s *WorkOrderService) FindByID(ctx context.Context, shopID, id uuid.UUID) (*models.WorkOrder, error) {
	return s.repo.FindByID(ctx, shopID, id)
}

func (s *WorkOrderService) Update(ctx context.Context, wo *models.WorkOrder) error {
	old, err := s.repo.FindByID(ctx, wo.ShopID, wo.ID)
	if err != nil {
		return err
	}
	if old == nil {
		return fmt.Errorf("work order not found")
	}

	if err := s.repo.Update(ctx, wo); err != nil {
		return err
	}

	if old.Status != "closed" && wo.Status == "closed" {
		s.postARCharge(ctx, wo)
	} else if old.Status == "closed" && wo.Status != "closed" {
		s.reverseARCharge(ctx, wo.ShopID, wo.ID)
	}

	return nil
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

func (s *WorkOrderService) postARCharge(ctx context.Context, wo *models.WorkOrder) {
	if wo.CustomerID == nil {
		return
	}

	cust, err := s.customerRepo.FindByID(ctx, wo.ShopID, *wo.CustomerID)
	if err != nil || cust == nil || cust.CreditLimit <= 0 {
		return
	}

	total := wo.JobsTaxable + wo.JobsNontaxable +
		wo.PartsTaxable + wo.PartsNontaxable +
		wo.ShopSuppliesAmt + wo.TotalTax
	if total <= 0 {
		return
	}

	txn := models.ARTransaction{
		ShopID:      wo.ShopID,
		CustomerID:  *wo.CustomerID,
		WorkOrderID: &wo.ID,
		Date:        time.Now(),
		Description: fmt.Sprintf("Invoice #%s", wo.InvoiceNumber),
		CrDr:        "DR",
		Amount:      total,
	}
	if err := s.arRepo.Create(ctx, &txn); err != nil {
		log.Printf("auto-post AR for WO %s: %v", wo.InvoiceNumber, err)
		return
	}
	if err := s.arRepo.UpdateCustomerBalance(ctx, wo.ShopID, *wo.CustomerID); err != nil {
		log.Printf("update AR balance after WO %s: %v", wo.InvoiceNumber, err)
	}
}

func (s *WorkOrderService) reverseARCharge(ctx context.Context, shopID, workOrderID uuid.UUID) {
	customerID, err := s.arRepo.DeleteByWorkOrder(ctx, shopID, workOrderID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return
		}
		log.Printf("reverse AR for WO %s: %v", workOrderID, err)
		return
	}
	if err := s.arRepo.UpdateCustomerBalance(ctx, shopID, customerID); err != nil {
		log.Printf("update AR balance after reverse WO %s: %v", workOrderID, err)
	}
}
