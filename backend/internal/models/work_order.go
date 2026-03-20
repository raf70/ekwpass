package models

import (
	"time"

	"github.com/google/uuid"
)

type WorkOrder struct {
	ID                     uuid.UUID  `json:"id"`
	ShopID                 uuid.UUID  `json:"shopId"`
	InvoiceNumber          string     `json:"invoiceNumber"`
	CustomerID             *uuid.UUID `json:"customerId"`
	VehicleID              *uuid.UUID `json:"vehicleId"`
	Status                 string     `json:"status"`
	Date                   time.Time  `json:"date"`
	Time                   string     `json:"time"`
	CustomerName           string     `json:"customerName"`
	CustomerPhone          string     `json:"customerPhone"`
	CustomerPhoneSecondary string     `json:"customerPhoneSecondary"`
	VehicleMake            string     `json:"vehicleMake"`
	VehicleModel           string     `json:"vehicleModel"`
	VehicleYear            int        `json:"vehicleYear"`
	VehicleVIN             string     `json:"vehicleVin"`
	VehicleOdometer        int        `json:"vehicleOdometer"`
	VehiclePlate           string     `json:"vehiclePlate"`
	VehicleColor           string     `json:"vehicleColor"`
	JobsCount              int        `json:"jobsCount"`
	JobsTaxable            float64    `json:"jobsTaxable"`
	JobsNontaxable         float64    `json:"jobsNontaxable"`
	JobsDiscountPct        float64    `json:"jobsDiscountPct"`
	JobsDiscountAmt        float64    `json:"jobsDiscountAmt"`
	PartsCount             int        `json:"partsCount"`
	PartsTaxable           float64    `json:"partsTaxable"`
	PartsNontaxable        float64    `json:"partsNontaxable"`
	PartsDiscountPct       float64    `json:"partsDiscountPct"`
	PartsDiscountAmt       float64    `json:"partsDiscountAmt"`
	SupplierPartsAmt       float64    `json:"supplierPartsAmt"`
	InventoryPartsAmt      float64    `json:"inventoryPartsAmt"`
	ShopSuppliesAmt        float64    `json:"shopSuppliesAmt"`
	ShopSuppliesTaxable    bool       `json:"shopSuppliesTaxable"`
	ShopSuppliesRate       float64    `json:"shopSuppliesRate"`
	DocRate                float64    `json:"docRate"`
	PSTExempt              bool       `json:"pstExempt"`
	GSTExempt              bool       `json:"gstExempt"`
	PSTAmount              float64    `json:"pstAmount"`
	GSTAmount              float64    `json:"gstAmount"`
	TotalTax               float64    `json:"totalTax"`
	Remark1                string     `json:"remark1"`
	Remark2                string     `json:"remark2"`
	Remark3                string     `json:"remark3"`
	CreatedAt              time.Time  `json:"createdAt"`
	UpdatedAt              time.Time  `json:"updatedAt"`
}

type WorkOrderTechnician struct {
	ID          uuid.UUID  `json:"id"`
	WorkOrderID uuid.UUID  `json:"workOrderId"`
	UserID      *uuid.UUID `json:"userId"`
	TechNumber  int        `json:"techNumber"`
	Rate        float64    `json:"rate"`
	Hours       float64    `json:"hours"`
}
