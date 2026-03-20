package models

import (
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID          uuid.UUID  `json:"id"`
	ShopID      uuid.UUID  `json:"shopId"`
	UserID      *uuid.UUID `json:"userId"`
	Code        string     `json:"code"`
	Date        time.Time  `json:"date"`
	Time        string     `json:"time"`
	Info        string     `json:"info"`
	Description string     `json:"description"`
	Amount1     float64    `json:"amount1"`
	Amount2     float64    `json:"amount2"`
	PSTAmount   float64    `json:"pstAmount"`
	GSTAmount   float64    `json:"gstAmount"`
	TotalTax    float64    `json:"totalTax"`
	TaxCode     string     `json:"taxCode"`
	CreatedAt   time.Time  `json:"createdAt"`
}
