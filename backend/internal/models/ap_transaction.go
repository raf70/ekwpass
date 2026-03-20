package models

import (
	"time"

	"github.com/google/uuid"
)

type APTransaction struct {
	ID            uuid.UUID `json:"id"`
	ShopID        uuid.UUID `json:"shopId"`
	SupplierID    uuid.UUID `json:"supplierId"`
	InvoiceNumber string    `json:"invoiceNumber"`
	Date          time.Time `json:"date"`
	Type          string    `json:"type"`
	Comment       string    `json:"comment"`
	CrDr          string    `json:"crDr"`
	Amount        float64   `json:"amount"`
	GSTAmount     float64   `json:"gstAmount"`
	CreatedAt     time.Time `json:"createdAt"`
}
