package models

import (
	"time"

	"github.com/google/uuid"
)

type LookupCode struct {
	ID          uuid.UUID `json:"id"`
	ShopID      uuid.UUID `json:"shopId"`
	TableID     string    `json:"tableId"`
	KeyValue    int       `json:"keyValue"`
	Description string    `json:"description"`
	Department  int       `json:"department"`
	Hours       float64   `json:"hours"`
	Rate        float64   `json:"rate"`
	Sales       float64   `json:"sales"`
	Cost        float64   `json:"cost"`
	Amount      float64   `json:"amount"`
	Flag        string    `json:"flag"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
