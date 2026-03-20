package models

import (
	"time"

	"github.com/google/uuid"
)

type Part struct {
	ID             uuid.UUID  `json:"id"`
	ShopID         uuid.UUID  `json:"shopId"`
	Code           string     `json:"code"`
	Manufacturer   string     `json:"manufacturer"`
	AltCodeA       string     `json:"altCodeA"`
	AltMfgrA       string     `json:"altMfgrA"`
	AltCodeB       string     `json:"altCodeB"`
	AltMfgrB       string     `json:"altMfgrB"`
	SupplierID     *uuid.UUID `json:"supplierId"`
	Description    string     `json:"description"`
	Department     int        `json:"department"`
	Location       string     `json:"location"`
	QtyOnHand      float64    `json:"qtyOnHand"`
	LastUpdated    *time.Time `json:"lastUpdated"`
	LastSold       *time.Time `json:"lastSold"`
	Turnover       int        `json:"turnover"`
	YTDSales       float64    `json:"ytdSales"`
	Sales90D       float64    `json:"sales90d"`
	ReorderQty     int        `json:"reorderQty"`
	ReorderAmount  float64    `json:"reorderAmount"`
	AvgPrice       float64    `json:"avgPrice"`
	SellPrice      float64    `json:"sellPrice"`
	CoreValue      float64    `json:"coreValue"`
	ListPrice      float64    `json:"listPrice"`
	WholesalePrice float64    `json:"wholesalePrice"`
	Discount1      float64    `json:"discount1"`
	Discount2      float64    `json:"discount2"`
	Discount3      float64    `json:"discount3"`
	NoUpdate       bool       `json:"noUpdate"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}
