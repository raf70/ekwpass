package main

import (
	"context"
	"log"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Lookups struct {
	ShopID             uuid.UUID
	PhoneToCustomer    map[string]uuid.UUID
	PhoneVehToVehicle  map[string]uuid.UUID
	SupplierCodeToID   map[string]uuid.UUID
	InvoiceToWorkOrder map[string]uuid.UUID
}

// ---------------------------------------------------------------------------
// Lookup Codes (TBLFILE.DBF → lookup_codes)
// ---------------------------------------------------------------------------

func importLookupCodes(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		tid := getString(r, "TBLID")
		if tid == "" {
			continue
		}
		id := uuid.New()
		tag, err := pool.Exec(ctx, `
			INSERT INTO lookup_codes (
				id, shop_id, table_id, key_value, description, department,
				hours, rate, sales, cost, amount, flag
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
			ON CONFLICT (shop_id, table_id, key_value) DO NOTHING`,
			id, lu.ShopID, tid, getInt(r, "TBLKY"),
			getString(r, "TBLDESC"), getInt(r, "TBLDEPT"),
			getFloat(r, "TBLHRS"), getFloat(r, "TBLRATE"),
			getFloat(r, "TBLSALES"), getFloat(r, "TBLCOST"),
			getFloat(r, "TBLAMT"), getString(r, "TBLFLAG"),
		)
		if err != nil {
			log.Printf("    lookup %s/%d: %v", tid, getInt(r, "TBLKY"), err)
			continue
		}
		if tag.RowsAffected() > 0 {
			count++
		}
	}
	return count, nil
}

// ---------------------------------------------------------------------------
// Customers (CUSTOMER.DBF → customers)
// ---------------------------------------------------------------------------

func importCustomers(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		phone := getString(r, "CPHONE")
		name := getString(r, "CNAME")
		if phone == "" && name == "" {
			continue
		}

		id := uuid.New()
		_, err := pool.Exec(ctx, `
			INSERT INTO customers (
				id, shop_id, phone, phone_secondary, name,
				street, city, province, postal_code, attention,
				credit_limit, pst_exempt, pst_number, gst_exempt, gst_number,
				is_wholesale, price_class, remarks, gender, category1, category2,
				ytd_sales, ytd_gst,
				ar_balance, ar_current, ar_30, ar_60, ar_90
			) VALUES (
				$1,$2,$3,$4,$5,
				$6,$7,$8,$9,$10,
				$11,$12,$13,$14,$15,
				$16,$17,$18,$19,$20,$21,
				$22,$23,
				$24,$25,$26,$27,$28
			)`,
			id, lu.ShopID, phone, getString(r, "CPHONEB"), name,
			getString(r, "CSTREET"), getString(r, "CCITY"),
			getString(r, "CPROV"), getString(r, "CPOSTAL"), getString(r, "CATTN"),
			getFloat(r, "CCREDITLMT"),
			getBool(r, "CPSTEXMPT"), getString(r, "CPSTNO"),
			getBool(r, "CGSTEXMPT"), getString(r, "CGSTNO"),
			getBool(r, "CWHOLESALE"), getInt(r, "CPRICLASS"),
			getString(r, "CREMARK"), getString(r, "CGENDER"),
			getString(r, "CCAT1"), getString(r, "CCAT2"),
			getFloat(r, "CYTDSALES"), getFloat(r, "CYTDGST"),
			getFloat(r, "CARBAL"), getFloat(r, "CARCURR"),
			getFloat(r, "CAR30"), getFloat(r, "CAR60"), getFloat(r, "CAR90"),
		)
		if err != nil {
			log.Printf("    customer %q: %v", name, err)
			continue
		}
		if phone != "" {
			lu.PhoneToCustomer[phone] = id
		}
		count++
	}
	return count, nil
}

// ---------------------------------------------------------------------------
// Vehicles (VEHICLE.DBF → vehicles)
// ---------------------------------------------------------------------------

func importVehicles(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		phone := getString(r, "VPHONE")
		vehno := getInt(r, "VEHNO")

		customerID, ok := lu.PhoneToCustomer[phone]
		if !ok {
			if verbose {
				log.Printf("    vehicle (phone=%s veh=%d): no customer", phone, vehno)
			}
			continue
		}

		id := uuid.New()
		year := expandYear(getInt(r, "VYEAR"))

		_, err := pool.Exec(ctx, `
			INSERT INTO vehicles (
				id, shop_id, customer_id, make, model, year, vin,
				production_date, odometer, plate, color,
				last_service_date, reminder_interval_days, car_plan
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
			id, lu.ShopID, customerID,
			getString(r, "VMAKE"), getString(r, "VMODEL"),
			nullInt(year), getString(r, "VIN"),
			getString(r, "VPRODDT"), getInt(r, "VODMTR"),
			getString(r, "VPLATE"), getString(r, "VCOLOR"),
			getDate(r, "VLASTDT"), getInt(r, "VREMINT"),
			getString(r, "VCARPLAN"),
		)
		if err != nil {
			log.Printf("    vehicle %s/%d: %v", phone, vehno, err)
			continue
		}
		lu.PhoneVehToVehicle[vehKey(phone, vehno)] = id
		count++
	}
	return count, nil
}

// ---------------------------------------------------------------------------
// Suppliers (SUPPLIER.DBF → suppliers)
// ---------------------------------------------------------------------------

func importSuppliers(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		code := getString(r, "SCODE")
		if code == "" {
			continue
		}

		id := uuid.New()
		tag, err := pool.Exec(ctx, `
			INSERT INTO suppliers (
				id, shop_id, code, name,
				address1, address2, city, province, postal_code, country,
				phone1, phone2, gst_number, remark1, remark2,
				balance, opening_balance, is_active, pst_gst_flag
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
			ON CONFLICT (shop_id, code) DO NOTHING`,
			id, lu.ShopID, code, getString(r, "SNAME"),
			getString(r, "SADDR1"), getString(r, "SADDR2"),
			getString(r, "SCITY"), getString(r, "SPROV"), getString(r, "SPOSTAL"),
			getString(r, "SCOUNTRY"),
			getString(r, "SPHONE1"), getString(r, "SPHONE2"),
			getString(r, "SGSTNO"),
			getString(r, "SREMARK1"), getString(r, "SREMARK2"),
			getFloat(r, "SBALANCE"), getFloat(r, "SOPENBAL"),
			getBool(r, "SMACTIVE"), getString(r, "SPSTGST"),
		)
		if err != nil {
			log.Printf("    supplier %s: %v", code, err)
			continue
		}
		if tag.RowsAffected() > 0 {
			lu.SupplierCodeToID[code] = id
			count++
		}
	}
	return count, nil
}

// ---------------------------------------------------------------------------
// Parts (PARTS.DBF → parts)
// ---------------------------------------------------------------------------

func importParts(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		code := getString(r, "PCODE")
		if code == "" {
			continue
		}

		id := uuid.New()
		var supplierID *uuid.UUID
		if sc := getString(r, "PSUPLR"); sc != "" {
			if sid, ok := lu.SupplierCodeToID[sc]; ok {
				supplierID = &sid
			}
		}

		_, err := pool.Exec(ctx, `
			INSERT INTO parts (
				id, shop_id, code, manufacturer,
				alt_code_a, alt_mfgr_a, alt_code_b, alt_mfgr_b,
				supplier_id, description, department, location,
				qty_on_hand, last_updated, last_sold, turnover,
				ytd_sales, sales_90d, reorder_qty, reorder_amount,
				avg_price, sell_price, core_value, no_update,
				list_price, wholesale_price,
				discount1, discount2, discount3
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
				$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)`,
			id, lu.ShopID, code, getString(r, "PMFGR"),
			getString(r, "PCODEA"), getString(r, "PMFGRA"),
			getString(r, "PCODEB"), getString(r, "PMFGRB"),
			supplierID, getString(r, "PDESC"),
			getInt(r, "PDEPT"), getString(r, "PLOCATION"),
			getFloat(r, "PQTY"),
			getDate(r, "PLSTDT"), getDate(r, "PLSTSOLDT"),
			getInt(r, "PTURNOVER"),
			getFloat(r, "PSALEYTD"), getFloat(r, "PSALE90"),
			getInt(r, "PREORDQTY"), getFloat(r, "PREORDAMT"),
			getFloat(r, "PAVGPRICE"), getFloat(r, "PSELLPRICE"),
			getFloat(r, "PCOREVALUE"), getBool(r, "PNOUPD"),
			getFloat(r, "PLISTPRICE"), getFloat(r, "PWHOLPRICE"),
			getFloat(r, "PDISCOUNT1"), getFloat(r, "PDISCOUNT2"),
			getFloat(r, "PDISCOUNT3"),
		)
		if err != nil {
			log.Printf("    part %s: %v", code, err)
			continue
		}
		count++
	}
	return count, nil
}

// ---------------------------------------------------------------------------
// Work Orders — shared implementation for HISMAST (closed) and WIPMAST (open)
// ---------------------------------------------------------------------------

func importWorkOrders(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path, status string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		invNo := getString(r, "INVNO")
		if invNo == "" {
			continue
		}

		phone := getString(r, "IPHONE")
		vehno := getInt(r, "IVEHNO")

		var customerID, vehicleID *uuid.UUID
		if cid, ok := lu.PhoneToCustomer[phone]; ok {
			customerID = &cid
		}
		if vid, ok := lu.PhoneVehToVehicle[vehKey(phone, vehno)]; ok {
			vehicleID = &vid
		}

		year := expandYear(getInt(r, "IYEAR"))
		id := uuid.New()

		tag, err := pool.Exec(ctx, `
			INSERT INTO work_orders (
				id, shop_id, invoice_number, customer_id, vehicle_id, status,
				date, time, customer_name, customer_phone, customer_phone_secondary,
				vehicle_make, vehicle_model, vehicle_year, vehicle_vin,
				vehicle_odometer, vehicle_plate, vehicle_color,
				jobs_count, jobs_taxable, jobs_nontaxable,
				jobs_discount_pct, jobs_discount_amt,
				parts_count, parts_taxable, parts_nontaxable,
				parts_discount_pct, parts_discount_amt,
				supplier_parts_amt, inventory_parts_amt,
				shop_supplies_amt, shop_supplies_taxable, shop_supplies_rate,
				doc_rate, pst_exempt, gst_exempt,
				pst_amount, gst_amount, total_tax,
				remark1, remark2, remark3
			) VALUES (
				$1,$2,$3,$4,$5,$6,
				$7,$8,$9,$10,$11,
				$12,$13,$14,$15,
				$16,$17,$18,
				$19,$20,$21,
				$22,$23,
				$24,$25,$26,
				$27,$28,
				$29,$30,
				$31,$32,$33,
				$34,$35,$36,
				$37,$38,$39,
				$40,$41,$42
			) ON CONFLICT (shop_id, invoice_number) DO NOTHING`,
			id, lu.ShopID, invNo, customerID, vehicleID, status,
			getDateOrNow(r, "IDATE"), nullStr(getString(r, "ITIME")),
			getString(r, "INAME"), phone, getString(r, "IPHONEB"),
			getString(r, "IMAKE"), getString(r, "IMODEL"),
			nullInt(year), getString(r, "IVIN"),
			getInt(r, "IODMTR"), getString(r, "IPLATE"), getString(r, "ICOLOR"),
			getInt(r, "IJOBSNO"), getFloat(r, "IJTAXBL"), getFloat(r, "IJNTAXBL"),
			getFloat(r, "IJDISCP"), getFloat(r, "IJDISCD"),
			getInt(r, "IPARTSNO"), getFloat(r, "IPTAXBL"), getFloat(r, "IPNTAXBL"),
			getFloat(r, "IPDISCP"), getFloat(r, "IPDISCD"),
			getFloat(r, "ISUPPART"), getFloat(r, "IINVPART"),
			getFloat(r, "ISHOPAMT"), getBool(r, "ISHOPTAX"), getFloat(r, "ISHOPSUPL"),
			getFloat(r, "IDOCRATE"), getBool(r, "IPSTEXMPT"), getBool(r, "IGSTEXMPT"),
			getFloat(r, "IPTAX"), getFloat(r, "IFTAX"), getFloat(r, "ITTAX"),
			getString(r, "IREMARK1"), getString(r, "IREMARK2"), getString(r, "IREMARK3"),
		)
		if err != nil {
			log.Printf("    work order %s: %v", invNo, err)
			continue
		}
		if tag.RowsAffected() > 0 {
			lu.InvoiceToWorkOrder[invNo] = id
			count++
		}
	}
	return count, nil
}

func importHistoryOrders(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	return importWorkOrders(ctx, pool, lu, path, "closed")
}

func importOpenOrders(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	return importWorkOrders(ctx, pool, lu, path, "open")
}

// ---------------------------------------------------------------------------
// Work Order Lines — shared for HISDTL and WIPDTL
// ---------------------------------------------------------------------------

func importWorkOrderLines(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		invNo := getString(r, "IDINVNO")
		woID, ok := lu.InvoiceToWorkOrder[invNo]
		if !ok {
			continue
		}

		lineType := "part"
		switch strings.ToUpper(getString(r, "IDTYPE")) {
		case "J", "1":
			lineType = "job"
		}

		var supplierID *uuid.UUID
		if sc := getString(r, "IDSUPLID"); sc != "" {
			if sid, ok := lu.SupplierCodeToID[sc]; ok {
				supplierID = &sid
			}
		}

		id := uuid.New()
		_, err := pool.Exec(ctx, `
			INSERT INTO work_order_lines (
				id, work_order_id, line_type, sequence, sub_type, line_number,
				qty, part_code, description, price, cost, is_taxable, tax_code,
				core_charge, is_return, department, hours,
				supplier_id, supplier_invoice
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
			id, woID, lineType,
			getInt(r, "IDSEQ"), getString(r, "IDTYPE2"), getInt(r, "IDNO"),
			getFloat(r, "IDQTY"), getString(r, "IDPCODE"), getString(r, "IDDESC"),
			getFloat(r, "IDPRIC"), getFloat(r, "IDCOST"),
			getBool(r, "IDTAX"), getString(r, "IDTAXC"),
			getFloat(r, "IDCORE"), getBool(r, "IDRTNFLG"),
			getInt(r, "IDDEPT"), getFloat(r, "IDHRS"),
			supplierID, getString(r, "IDSUPLINV"),
		)
		if err != nil {
			log.Printf("    wo-line %s seq %d: %v", invNo, getInt(r, "IDSEQ"), err)
			continue
		}
		count++
	}
	return count, nil
}

func importHistoryLines(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	return importWorkOrderLines(ctx, pool, lu, path)
}

func importOpenLines(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	return importWorkOrderLines(ctx, pool, lu, path)
}

// ---------------------------------------------------------------------------
// Sales (SALEFILE.DBF → sales)
// ---------------------------------------------------------------------------

func importSales(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		saleNo := getString(r, "SALENO")
		if saleNo == "" {
			continue
		}

		var customerID *uuid.UUID
		if phone := getString(r, "SALEPHONE"); phone != "" {
			if cid, ok := lu.PhoneToCustomer[phone]; ok {
				customerID = &cid
			}
		}
		var supplierID *uuid.UUID
		if sc := getString(r, "SALESUPLID"); sc != "" {
			if sid, ok := lu.SupplierCodeToID[sc]; ok {
				supplierID = &sid
			}
		}

		id := uuid.New()
		tag, err := pool.Exec(ctx, `
			INSERT INTO sales (
				id, shop_id, sale_number, customer_id, status,
				sale_type, sale_info, date, qty, description,
				department, amount, is_taxable, payment_type, supplier_id
			) VALUES ($1,$2,$3,$4,'closed',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
			ON CONFLICT (shop_id, sale_number) DO NOTHING`,
			id, lu.ShopID, saleNo, customerID,
			getString(r, "SALETYPE"), getString(r, "SALEINFO"),
			getDateOrNow(r, "SALEDATE"),
			getFloat(r, "SALEQTY"), getString(r, "SALEDESC"),
			getInt(r, "SALEDEPT"), getFloat(r, "SALEAMT"),
			getBool(r, "SALETAX"), getString(r, "SALEPTYPE"), supplierID,
		)
		if err != nil {
			log.Printf("    sale %s: %v", saleNo, err)
			continue
		}
		if tag.RowsAffected() > 0 {
			count++
		}
	}
	return count, nil
}

// ---------------------------------------------------------------------------
// AR Transactions (CAR20.DBF → ar_transactions)
// ---------------------------------------------------------------------------

func importARTransactions(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		phone := getString(r, "ARPHONE")
		if phone == "" {
			continue
		}
		customerID, ok := lu.PhoneToCustomer[phone]
		if !ok {
			if verbose {
				log.Printf("    AR customer phone %q not found", phone)
			}
			continue
		}

		crdr := strings.ToUpper(getString(r, "ARCRDR"))
		switch crdr {
		case "CR", "DR":
		case "C":
			crdr = "CR"
		default:
			crdr = "DR"
		}

		id := uuid.New()
		_, err := pool.Exec(ctx, `
			INSERT INTO ar_transactions (
				id, shop_id, customer_id, date, description, cr_dr, amount
			) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			id, lu.ShopID, customerID,
			getDateOrNow(r, "ARDATE"),
			getString(r, "ARDESC"),
			crdr, getFloat(r, "ARAMT"),
		)
		if err != nil {
			log.Printf("    AR %s: %v", phone, err)
			continue
		}
		count++
	}
	return count, nil
}

// ---------------------------------------------------------------------------
// AP Transactions (SAP.DBF → ap_transactions)
// ---------------------------------------------------------------------------

func importAPTransactions(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		supplierCode := getString(r, "APSUPPLIER")
		if supplierCode == "" {
			continue
		}
		supplierID, ok := lu.SupplierCodeToID[supplierCode]
		if !ok {
			if verbose {
				log.Printf("    AP supplier %q not found", supplierCode)
			}
			continue
		}

		crdr := strings.ToUpper(getString(r, "APCRDR"))
		switch crdr {
		case "CR", "DR":
			// already valid
		case "C":
			crdr = "CR"
		default:
			crdr = "DR"
		}

		id := uuid.New()
		_, err := pool.Exec(ctx, `
			INSERT INTO ap_transactions (
				id, shop_id, supplier_id, invoice_number, date,
				type, comment, cr_dr, amount, gst_amount
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			id, lu.ShopID, supplierID,
			getString(r, "APINVNO"), getDateOrNow(r, "APDATE"),
			getString(r, "APTYPE"), getString(r, "APCOMMENT"),
			crdr, getFloat(r, "APAMT"), getFloat(r, "APGST"),
		)
		if err != nil {
			log.Printf("    AP %s: %v", getString(r, "APINVNO"), err)
			continue
		}
		count++
	}
	return count, nil
}

// ---------------------------------------------------------------------------
// Recalls (RECALL.DBF → recalls)
// ---------------------------------------------------------------------------

func importRecalls(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		phone := getString(r, "RPHONE")
		if phone == "" {
			continue
		}
		customerID, ok := lu.PhoneToCustomer[phone]
		if !ok {
			continue
		}

		var vehicleID *uuid.UUID
		if vid, ok := lu.PhoneVehToVehicle[vehKey(phone, getInt(r, "RVEHNO"))]; ok {
			vehicleID = &vid
		}

		id := uuid.New()
		_, err := pool.Exec(ctx, `
			INSERT INTO recalls (
				id, shop_id, customer_id, vehicle_id,
				recall_date, recall_type, odometer,
				invoice_number, invoice_amount, invoice_date,
				attention1, attention2, attention3, attention4
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
			id, lu.ShopID, customerID, vehicleID,
			getDateOrNow(r, "RDATE"), getString(r, "RTYPE"), getInt(r, "RODMTR"),
			getString(r, "RINVNO"), getFloat(r, "RINVAMT"), getDate(r, "RINVDT"),
			getString(r, "RATTN1"), getString(r, "RATTN2"),
			getString(r, "RATTN3"), getString(r, "RATTN4"),
		)
		if err != nil {
			log.Printf("    recall %s: %v", phone, err)
			continue
		}
		count++
	}
	return count, nil
}

// ---------------------------------------------------------------------------
// Audit Logs (AUDIT.DBF → audit_logs)
// ---------------------------------------------------------------------------

func importAuditLogs(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	count := 0
	for _, r := range dbf.Records() {
		id := uuid.New()
		_, err := pool.Exec(ctx, `
			INSERT INTO audit_logs (
				id, shop_id, code, date, time, info, description,
				amount1, amount2, pst_amount, gst_amount, total_tax, tax_code
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
			id, lu.ShopID,
			getString(r, "AUDCODE"), getDate(r, "AUDDATE"),
			nullStr(getString(r, "AUDTIME")),
			getString(r, "AUDINFO"), getString(r, "AUDDESC"),
			getFloat(r, "AUDAMT1"), getFloat(r, "AUDAMT2"),
			getFloat(r, "AUDPTAX"), getFloat(r, "AUDFTAX"),
			getFloat(r, "AUDTTAX"), getString(r, "AUDTAXCDE"),
		)
		if err != nil {
			log.Printf("    audit: %v", err)
			continue
		}
		count++
	}
	return count, nil
}

// ---------------------------------------------------------------------------
// Shop Settings (MEMOVAR.DBF → UPDATE shop_settings)
// ---------------------------------------------------------------------------

func importShopSettings(ctx context.Context, pool *pgxpool.Pool, lu *Lookups, path string) (int, error) {
	dbf, err := OpenDBF(path)
	if err != nil {
		return 0, err
	}
	records := dbf.Records()
	if len(records) == 0 {
		return 0, nil
	}
	r := records[0]

	_, err = pool.Exec(ctx, `
		UPDATE shop_settings SET
			next_invoice_number = $1,
			next_sale_number    = $2,
			next_ref_number     = $3,
			system_month        = $4,
			shop_supplies_rate  = $5,
			shop_supplies_taxable = $6,
			doc_rate            = $7,
			shop_rate           = $8,
			gst_number          = $9,
			federal_tax_rate    = $10,
			provincial_tax_rate = $11,
			ar_interest_rate    = $12
		WHERE shop_id = $13`,
		getInt(r, "ZZINVOICE"), getInt(r, "ZZSALENO"), getInt(r, "ZZREFNO"),
		getInt(r, "ZZSYSMTH"), getFloat(r, "ZZSHOPSUPL"), getBool(r, "ZZSHOPTAX"),
		getFloat(r, "ZZDOCRATE"), getFloat(r, "ZZSHOPRATE"), getString(r, "ZZGSTNO"),
		getFloat(r, "ZZFTAX"), getFloat(r, "ZZPTAX"), getFloat(r, "ZZARINT"),
		lu.ShopID,
	)
	if err != nil {
		return 0, err
	}

	if gst := getString(r, "ZZGSTNO"); gst != "" {
		pool.Exec(ctx, `UPDATE shops SET gst_number = $1 WHERE id = $2`, gst, lu.ShopID)
	}

	return 1, nil
}
