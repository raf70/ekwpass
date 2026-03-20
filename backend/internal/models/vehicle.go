package models

import (
	"time"

	"github.com/google/uuid"
)

type Vehicle struct {
	ID                   uuid.UUID  `json:"id"`
	ShopID               uuid.UUID  `json:"shopId"`
	CustomerID           uuid.UUID  `json:"customerId"`
	Make                 string     `json:"make"`
	Model                string     `json:"model"`
	Year                 int        `json:"year"`
	VIN                  string     `json:"vin"`
	ProductionDate       string     `json:"productionDate"`
	Odometer             int        `json:"odometer"`
	Plate                string     `json:"plate"`
	Color                string     `json:"color"`
	LastServiceDate      *time.Time `json:"lastServiceDate"`
	ReminderIntervalDays int        `json:"reminderIntervalDays"`
	CarPlan              string     `json:"carPlan"`
	Engine               string     `json:"engine"`
	SafetyExpiry         string     `json:"safetyExpiry"`
	Comments             string     `json:"comments"`
	CreatedAt            time.Time  `json:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
}
