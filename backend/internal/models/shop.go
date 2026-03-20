package models

import (
	"time"

	"github.com/google/uuid"
)

type Shop struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	Address    string    `json:"address"`
	City       string    `json:"city"`
	Province   string    `json:"province"`
	PostalCode string    `json:"postalCode"`
	Phone      string    `json:"phone"`
	GSTNumber  string    `json:"gstNumber"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}
