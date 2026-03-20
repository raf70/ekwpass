package repositories

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rkulczycki/ekwpass/internal/models"
)

type ShopSettingsRepo struct {
	pool *pgxpool.Pool
}

func NewShopSettingsRepo(pool *pgxpool.Pool) *ShopSettingsRepo {
	return &ShopSettingsRepo{pool: pool}
}

func (r *ShopSettingsRepo) FindByShop(ctx context.Context, shopID uuid.UUID) (*models.ShopSettings, error) {
	var s models.ShopSettings
	err := r.pool.QueryRow(ctx, `
		SELECT
			id, shop_id,
			COALESCE(next_invoice_number, 1), COALESCE(next_sale_number, 1), COALESCE(next_ref_number, 1),
			COALESCE(system_month, 1),
			COALESCE(shop_supplies_rate, 0), COALESCE(shop_supplies_taxable, false),
			COALESCE(doc_rate, 0), COALESCE(shop_rate, 0),
			COALESCE(gst_number, ''),
			COALESCE(use_hst, false),
			COALESCE(federal_tax_rate, 0), COALESCE(provincial_tax_rate, 0),
			COALESCE(ar_interest_rate, 0), COALESCE(ar_delay_processing, false),
			COALESCE(supplier_processing, false), COALESCE(core_add_on, false),
			COALESCE(default_city, ''), COALESCE(default_province, ''), COALESCE(default_comment, ''),
			COALESCE(reminder_interval_days, 90),
			COALESCE(print_tech_detail, false), COALESCE(print_invoice_hours, false), COALESCE(print_invoice_supplier, false),
			COALESCE(payment_type1, ''), COALESCE(payment_type2, ''), COALESCE(payment_type3, ''),
			COALESCE(payment_type4, ''), COALESCE(payment_type5, ''),
			COALESCE(skip_lines, 0),
			updated_at
		FROM shop_settings WHERE shop_id = $1`, shopID,
	).Scan(
		&s.ID, &s.ShopID,
		&s.NextInvoiceNumber, &s.NextSaleNumber, &s.NextRefNumber,
		&s.SystemMonth,
		&s.ShopSuppliesRate, &s.ShopSuppliesTaxable,
		&s.DocRate, &s.ShopRate,
		&s.GSTNumber,
		&s.UseHST,
		&s.FederalTaxRate, &s.ProvincialTaxRate,
		&s.ARInterestRate, &s.ARDelayProcessing,
		&s.SupplierProcessing, &s.CoreAddOn,
		&s.DefaultCity, &s.DefaultProvince, &s.DefaultComment,
		&s.ReminderIntervalDays,
		&s.PrintTechDetail, &s.PrintInvoiceHours, &s.PrintInvoiceSupplier,
		&s.PaymentType1, &s.PaymentType2, &s.PaymentType3,
		&s.PaymentType4, &s.PaymentType5,
		&s.SkipLines,
		&s.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("find shop settings: %w", err)
	}
	return &s, nil
}

func (r *ShopSettingsRepo) Update(ctx context.Context, s *models.ShopSettings) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE shop_settings SET
			shop_supplies_rate     = $2,
			shop_supplies_taxable  = $3,
			doc_rate               = $4,
			shop_rate              = $5,
			gst_number             = $6,
			use_hst                = $7,
			federal_tax_rate       = $8,
			provincial_tax_rate    = $9,
			ar_interest_rate       = $10,
			ar_delay_processing    = $11,
			supplier_processing    = $12,
			core_add_on            = $13,
			default_city           = $14,
			default_province       = $15,
			default_comment        = $16,
			reminder_interval_days = $17,
			print_tech_detail      = $18,
			print_invoice_hours    = $19,
			print_invoice_supplier = $20,
			payment_type1          = $21,
			payment_type2          = $22,
			payment_type3          = $23,
			payment_type4          = $24,
			payment_type5          = $25,
			skip_lines             = $26
		WHERE shop_id = $1`,
		s.ShopID,
		s.ShopSuppliesRate, s.ShopSuppliesTaxable,
		s.DocRate, s.ShopRate,
		s.GSTNumber,
		s.UseHST,
		s.FederalTaxRate, s.ProvincialTaxRate,
		s.ARInterestRate, s.ARDelayProcessing,
		s.SupplierProcessing, s.CoreAddOn,
		s.DefaultCity, s.DefaultProvince, s.DefaultComment,
		s.ReminderIntervalDays,
		s.PrintTechDetail, s.PrintInvoiceHours, s.PrintInvoiceSupplier,
		s.PaymentType1, s.PaymentType2, s.PaymentType3,
		s.PaymentType4, s.PaymentType5,
		s.SkipLines,
	)
	if err != nil {
		return fmt.Errorf("update shop settings: %w", err)
	}
	return nil
}
