package models

import (
	"time"

	"github.com/google/uuid"
)

type Customer struct {
	ID              uuid.UUID  `json:"id"`
	ShopID          uuid.UUID  `json:"shopId"`
	Phone           string     `json:"phone"`
	PhoneSecondary  string     `json:"phoneSecondary"`
	Name            string     `json:"name"`
	Street          string     `json:"street"`
	City            string     `json:"city"`
	Province        string     `json:"province"`
	PostalCode      string     `json:"postalCode"`
	Attention       string     `json:"attention"`
	CreditLimit     float64    `json:"creditLimit"`
	PSTExempt       bool       `json:"pstExempt"`
	PSTNumber       string     `json:"pstNumber"`
	GSTExempt       bool       `json:"gstExempt"`
	GSTNumber       string     `json:"gstNumber"`
	IsWholesale     bool       `json:"isWholesale"`
	PriceClass      int        `json:"priceClass"`
	Remarks         string     `json:"remarks"`
	Gender          string     `json:"gender"`
	Category1       string     `json:"category1"`
	Category2       string     `json:"category2"`
	YTDSales        float64    `json:"ytdSales"`
	YTDGST          float64    `json:"ytdGst"`
	LastServiceDate *time.Time `json:"lastServiceDate"`
	ARBalance       float64    `json:"arBalance"`
	ARCurrent       float64    `json:"arCurrent"`
	AR30            float64    `json:"ar30"`
	AR60            float64    `json:"ar60"`
	AR90            float64    `json:"ar90"`
	ARStmtBalance   float64    `json:"arStmtBalance"`
	ARStmtFlag      bool       `json:"arStmtFlag"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}
