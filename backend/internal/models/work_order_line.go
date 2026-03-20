package models

import (
	"time"

	"github.com/google/uuid"
)

type WorkOrderLine struct {
	ID              uuid.UUID  `json:"id"`
	WorkOrderID     uuid.UUID  `json:"workOrderId"`
	LineType        string     `json:"lineType"`
	Sequence        int        `json:"sequence"`
	SubType         string     `json:"subType"`
	LineNumber      int        `json:"lineNumber"`
	Qty             float64    `json:"qty"`
	PartCode        string     `json:"partCode"`
	Description     string     `json:"description"`
	Price           float64    `json:"price"`
	Cost            float64    `json:"cost"`
	IsTaxable       bool       `json:"isTaxable"`
	TaxCode         string     `json:"taxCode"`
	CoreCharge      float64    `json:"coreCharge"`
	IsReturn        bool       `json:"isReturn"`
	TechnicianID    *uuid.UUID `json:"technicianId"`
	Department      int        `json:"department"`
	Hours           float64    `json:"hours"`
	SupplierID      *uuid.UUID `json:"supplierId"`
	SupplierInvoice string     `json:"supplierInvoice"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}
