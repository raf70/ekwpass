package models

import (
	"time"

	"github.com/google/uuid"
)

type Supplier struct {
	ID             uuid.UUID `json:"id"`
	ShopID         uuid.UUID `json:"shopId"`
	Code           string    `json:"code"`
	Name           string    `json:"name"`
	Address1       string    `json:"address1"`
	Address2       string    `json:"address2"`
	City           string    `json:"city"`
	Province       string    `json:"province"`
	PostalCode     string    `json:"postalCode"`
	Country        string    `json:"country"`
	Phone1         string    `json:"phone1"`
	Phone2         string    `json:"phone2"`
	GSTNumber      string    `json:"gstNumber"`
	Remark1        string    `json:"remark1"`
	Remark2        string    `json:"remark2"`
	Balance        float64   `json:"balance"`
	OpeningBalance float64   `json:"openingBalance"`
	IsActive       bool      `json:"isActive"`
	PSTGSTFlag     string    `json:"pstGstFlag"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}
