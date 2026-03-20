package models

import (
	"time"

	"github.com/google/uuid"
)

type Sale struct {
	ID              uuid.UUID  `json:"id"`
	ShopID          uuid.UUID  `json:"shopId"`
	SaleNumber      string     `json:"saleNumber"`
	CustomerID      *uuid.UUID `json:"customerId"`
	Status          string     `json:"status"`
	SaleType        string     `json:"saleType"`
	SaleInfo        string     `json:"saleInfo"`
	Date            time.Time  `json:"date"`
	Time            string     `json:"time"`
	Qty             float64    `json:"qty"`
	Description     string     `json:"description"`
	Department      int        `json:"department"`
	Amount          float64    `json:"amount"`
	IsTaxable       bool       `json:"isTaxable"`
	PaymentType     string     `json:"paymentType"`
	SupplierID      *uuid.UUID `json:"supplierId"`
	SupplierInvoice string     `json:"supplierInvoice"`
	PartCode        string     `json:"partCode"`
	Cost            float64    `json:"cost"`
	ListPrice       float64    `json:"listPrice"`
	TechnicianID    *uuid.UUID `json:"technicianId"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}
