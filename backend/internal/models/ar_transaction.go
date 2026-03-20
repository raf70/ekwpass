package models

import (
	"time"

	"github.com/google/uuid"
)

type ARTransaction struct {
	ID          uuid.UUID `json:"id"`
	ShopID      uuid.UUID `json:"shopId"`
	CustomerID  uuid.UUID `json:"customerId"`
	Date        time.Time `json:"date"`
	Description string    `json:"description"`
	CrDr        string    `json:"crDr"`
	Amount      float64   `json:"amount"`
	CreatedAt   time.Time `json:"createdAt"`
}
