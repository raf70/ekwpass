package models

import (
	"time"

	"github.com/google/uuid"
)

type ShopSettings struct {
	ID                   uuid.UUID `json:"id"`
	ShopID               uuid.UUID `json:"shopId"`
	NextInvoiceNumber    int       `json:"nextInvoiceNumber"`
	NextSaleNumber       int       `json:"nextSaleNumber"`
	NextRefNumber        int       `json:"nextRefNumber"`
	SystemMonth          int       `json:"systemMonth"`
	ShopSuppliesRate     float64   `json:"shopSuppliesRate"`
	ShopSuppliesTaxable  bool      `json:"shopSuppliesTaxable"`
	DocRate              float64   `json:"docRate"`
	ShopRate             float64   `json:"shopRate"`
	GSTNumber            string    `json:"gstNumber"`
	UseHST               bool      `json:"useHst"`
	FederalTaxRate       float64   `json:"federalTaxRate"`
	ProvincialTaxRate    float64   `json:"provincialTaxRate"`
	ARInterestRate       float64   `json:"arInterestRate"`
	ARDelayProcessing    bool      `json:"arDelayProcessing"`
	SupplierProcessing   bool      `json:"supplierProcessing"`
	CoreAddOn            bool      `json:"coreAddOn"`
	DefaultCity          string    `json:"defaultCity"`
	DefaultProvince      string    `json:"defaultProvince"`
	DefaultComment       string    `json:"defaultComment"`
	ReminderIntervalDays int       `json:"reminderIntervalDays"`
	PrintTechDetail      bool      `json:"printTechDetail"`
	PrintInvoiceHours    bool      `json:"printInvoiceHours"`
	PrintInvoiceSupplier bool      `json:"printInvoiceSupplier"`
	PaymentType1         string    `json:"paymentType1"`
	PaymentType2         string    `json:"paymentType2"`
	PaymentType3         string    `json:"paymentType3"`
	PaymentType4         string    `json:"paymentType4"`
	PaymentType5         string    `json:"paymentType5"`
	SkipLines            int       `json:"skipLines"`
	UpdatedAt            time.Time `json:"updatedAt"`
}
