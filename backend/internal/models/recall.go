package models

import (
	"time"

	"github.com/google/uuid"
)

type Recall struct {
	ID            uuid.UUID  `json:"id"`
	ShopID        uuid.UUID  `json:"shopId"`
	CustomerID    uuid.UUID  `json:"customerId"`
	VehicleID     *uuid.UUID `json:"vehicleId"`
	RecallDate    time.Time  `json:"recallDate"`
	RecallType    string     `json:"recallType"`
	Odometer      int        `json:"odometer"`
	InvoiceNumber string     `json:"invoiceNumber"`
	InvoiceAmount float64    `json:"invoiceAmount"`
	InvoiceDate   *time.Time `json:"invoiceDate"`
	Attention1    string     `json:"attention1"`
	Attention2    string     `json:"attention2"`
	Attention3    string     `json:"attention3"`
	Attention4    string     `json:"attention4"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}
