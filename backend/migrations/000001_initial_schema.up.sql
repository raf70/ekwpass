CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SHOPS (multi-tenant root)
-- ============================================================
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200),
    city VARCHAR(50),
    province VARCHAR(5),
    postal_code VARCHAR(10),
    phone VARCHAR(20),
    gst_number VARCHAR(15),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_shops_updated_at BEFORE UPDATE ON shops
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- USERS (authentication & roles)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'front_desk'
        CHECK (role IN ('admin', 'technician', 'front_desk')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_shop_id ON users(shop_id);
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- CUSTOMERS (from CUSTOMER.DBF)
-- ============================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    phone VARCHAR(20),
    phone_secondary VARCHAR(20),
    name VARCHAR(100) NOT NULL,
    street VARCHAR(100),
    city VARCHAR(50),
    province VARCHAR(5),
    postal_code VARCHAR(10),
    attention VARCHAR(50),
    credit_limit NUMERIC(10,2) DEFAULT 0,
    pst_exempt BOOLEAN DEFAULT false,
    pst_number VARCHAR(15),
    gst_exempt BOOLEAN DEFAULT false,
    gst_number VARCHAR(15),
    is_wholesale BOOLEAN DEFAULT false,
    price_class SMALLINT DEFAULT 0,
    remarks TEXT,
    gender VARCHAR(1),
    category1 VARCHAR(5),
    category2 VARCHAR(5),
    ytd_sales NUMERIC(12,2) DEFAULT 0,
    ytd_gst NUMERIC(12,2) DEFAULT 0,
    last_service_date DATE,
    ar_balance NUMERIC(12,2) DEFAULT 0,
    ar_current NUMERIC(12,2) DEFAULT 0,
    ar_30 NUMERIC(12,2) DEFAULT 0,
    ar_60 NUMERIC(12,2) DEFAULT 0,
    ar_90 NUMERIC(12,2) DEFAULT 0,
    ar_stmt_balance NUMERIC(12,2) DEFAULT 0,
    ar_stmt_flag BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customers_shop_id ON customers(shop_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(name);
CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- VEHICLES (from VEHICLE.DBF)
-- ============================================================
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    make VARCHAR(30),
    model VARCHAR(30),
    year SMALLINT,
    vin VARCHAR(25),
    production_date VARCHAR(10),
    odometer INTEGER DEFAULT 0,
    plate VARCHAR(15),
    color VARCHAR(20),
    last_service_date DATE,
    reminder_interval_days SMALLINT DEFAULT 0,
    car_plan VARCHAR(30),
    engine VARCHAR(20),
    safety_expiry VARCHAR(15),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vehicles_shop_id ON vehicles(shop_id);
CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_plate ON vehicles(plate);
CREATE TRIGGER set_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- SUPPLIERS (from SUPPLIER.DBF)
-- ============================================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(60) NOT NULL,
    address1 VARCHAR(50),
    address2 VARCHAR(50),
    city VARCHAR(50),
    province VARCHAR(5),
    postal_code VARCHAR(10),
    country VARCHAR(20),
    phone1 VARCHAR(20),
    phone2 VARCHAR(20),
    gst_number VARCHAR(15),
    remark1 VARCHAR(50),
    remark2 VARCHAR(50),
    balance NUMERIC(12,2) DEFAULT 0,
    opening_balance NUMERIC(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    pst_gst_flag VARCHAR(5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_suppliers_shop_id ON suppliers(shop_id);
CREATE UNIQUE INDEX idx_suppliers_code ON suppliers(shop_id, code);
CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- PARTS (from PARTS.DBF)
-- ============================================================
CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    code VARCHAR(25) NOT NULL,
    manufacturer VARCHAR(20),
    alt_code_a VARCHAR(25),
    alt_mfgr_a VARCHAR(20),
    alt_code_b VARCHAR(25),
    alt_mfgr_b VARCHAR(20),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    description VARCHAR(50),
    department SMALLINT,
    location VARCHAR(20),
    qty_on_hand NUMERIC(10,2) DEFAULT 0,
    last_updated DATE,
    last_sold DATE,
    turnover INTEGER DEFAULT 0,
    ytd_sales NUMERIC(12,2) DEFAULT 0,
    sales_90d NUMERIC(12,2) DEFAULT 0,
    reorder_qty INTEGER DEFAULT 0,
    reorder_amount NUMERIC(10,2) DEFAULT 0,
    avg_price NUMERIC(10,2) DEFAULT 0,
    sell_price NUMERIC(10,2) DEFAULT 0,
    core_value NUMERIC(10,2) DEFAULT 0,
    list_price NUMERIC(10,2) DEFAULT 0,
    wholesale_price NUMERIC(10,2) DEFAULT 0,
    discount1 NUMERIC(5,1) DEFAULT 0,
    discount2 NUMERIC(5,1) DEFAULT 0,
    discount3 NUMERIC(5,1) DEFAULT 0,
    no_update BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_parts_shop_id ON parts(shop_id);
CREATE INDEX idx_parts_code ON parts(shop_id, code);
CREATE INDEX idx_parts_supplier ON parts(supplier_id);
CREATE TRIGGER set_parts_updated_at BEFORE UPDATE ON parts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- WORK ORDERS (unified WIPMAST + HISMAST via status field)
-- ============================================================
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    invoice_number VARCHAR(10) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed', 'voided')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME,
    -- Denormalized snapshot of customer/vehicle at time of creation
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_phone_secondary VARCHAR(20),
    vehicle_make VARCHAR(30),
    vehicle_model VARCHAR(30),
    vehicle_year SMALLINT,
    vehicle_vin VARCHAR(25),
    vehicle_odometer INTEGER,
    vehicle_plate VARCHAR(15),
    vehicle_color VARCHAR(20),
    -- Job/labor totals
    jobs_count SMALLINT DEFAULT 0,
    jobs_taxable NUMERIC(10,2) DEFAULT 0,
    jobs_nontaxable NUMERIC(10,2) DEFAULT 0,
    jobs_discount_pct NUMERIC(6,3) DEFAULT 0,
    jobs_discount_amt NUMERIC(10,2) DEFAULT 0,
    -- Parts totals
    parts_count SMALLINT DEFAULT 0,
    parts_taxable NUMERIC(10,2) DEFAULT 0,
    parts_nontaxable NUMERIC(10,2) DEFAULT 0,
    parts_discount_pct NUMERIC(6,3) DEFAULT 0,
    parts_discount_amt NUMERIC(10,2) DEFAULT 0,
    -- Other amounts
    supplier_parts_amt NUMERIC(10,2) DEFAULT 0,
    inventory_parts_amt NUMERIC(10,2) DEFAULT 0,
    shop_supplies_amt NUMERIC(10,2) DEFAULT 0,
    shop_supplies_taxable BOOLEAN DEFAULT false,
    shop_supplies_rate NUMERIC(6,3) DEFAULT 0,
    doc_rate NUMERIC(8,2) DEFAULT 0,
    -- Tax
    pst_exempt BOOLEAN DEFAULT false,
    gst_exempt BOOLEAN DEFAULT false,
    pst_amount NUMERIC(10,2) DEFAULT 0,
    gst_amount NUMERIC(10,2) DEFAULT 0,
    total_tax NUMERIC(10,2) DEFAULT 0,
    -- Remarks
    remark1 TEXT,
    remark2 TEXT,
    remark3 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_work_orders_shop_id ON work_orders(shop_id);
CREATE UNIQUE INDEX idx_work_orders_invoice ON work_orders(shop_id, invoice_number);
CREATE INDEX idx_work_orders_customer ON work_orders(customer_id);
CREATE INDEX idx_work_orders_vehicle ON work_orders(vehicle_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_date ON work_orders(date);
CREATE TRIGGER set_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- WORK ORDER TECHNICIANS (normalized from ITECH1-4 inline fields)
-- ============================================================
CREATE TABLE work_order_technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tech_number SMALLINT NOT NULL,
    rate NUMERIC(8,2) DEFAULT 0,
    hours NUMERIC(8,2) DEFAULT 0
);
CREATE INDEX idx_wo_techs_work_order ON work_order_technicians(work_order_id);

-- ============================================================
-- WORK ORDER LINES (unified WIPDTL + HISDTL)
-- ============================================================
CREATE TABLE work_order_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    line_type VARCHAR(5) NOT NULL CHECK (line_type IN ('job', 'part')),
    sequence SMALLINT NOT NULL,
    sub_type VARCHAR(5),
    line_number SMALLINT,
    qty NUMERIC(8,2) DEFAULT 0,
    part_code VARCHAR(25),
    description VARCHAR(50),
    price NUMERIC(10,2) DEFAULT 0,
    cost NUMERIC(10,2) DEFAULT 0,
    is_taxable BOOLEAN DEFAULT true,
    tax_code VARCHAR(5),
    core_charge NUMERIC(8,2) DEFAULT 0,
    is_return BOOLEAN DEFAULT false,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    department SMALLINT,
    hours NUMERIC(6,2) DEFAULT 0,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_invoice VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wo_lines_work_order ON work_order_lines(work_order_id);
CREATE TRIGGER set_wo_lines_updated_at BEFORE UPDATE ON work_order_lines
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- SALES (counter/POS sales, from SALEFILE.DBF)
-- ============================================================
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    sale_number VARCHAR(10) NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),
    sale_type VARCHAR(5),
    sale_info VARCHAR(5),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME,
    qty NUMERIC(8,2) DEFAULT 0,
    description VARCHAR(50),
    department SMALLINT,
    amount NUMERIC(12,2) DEFAULT 0,
    is_taxable BOOLEAN DEFAULT true,
    payment_type VARCHAR(5),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_invoice VARCHAR(10),
    part_code VARCHAR(25),
    cost NUMERIC(12,2) DEFAULT 0,
    list_price NUMERIC(12,2) DEFAULT 0,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sales_shop_id ON sales(shop_id);
CREATE UNIQUE INDEX idx_sales_number ON sales(shop_id, sale_number);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(date);
CREATE TRIGGER set_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- AR TRANSACTIONS (accounts receivable, from CAR20.DBF)
-- ============================================================
CREATE TABLE ar_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description VARCHAR(50),
    cr_dr VARCHAR(2) NOT NULL CHECK (cr_dr IN ('CR', 'DR')),
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ar_shop ON ar_transactions(shop_id);
CREATE INDEX idx_ar_customer ON ar_transactions(customer_id);
CREATE INDEX idx_ar_date ON ar_transactions(date);

-- ============================================================
-- AP TRANSACTIONS (accounts payable, from SAP.DBF)
-- ============================================================
CREATE TABLE ap_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(10),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(15),
    comment VARCHAR(50),
    cr_dr VARCHAR(2) NOT NULL CHECK (cr_dr IN ('CR', 'DR')),
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    gst_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ap_shop ON ap_transactions(shop_id);
CREATE INDEX idx_ap_supplier ON ap_transactions(supplier_id);
CREATE INDEX idx_ap_date ON ap_transactions(date);

-- ============================================================
-- RECALLS (service reminders, from RECALL.DBF)
-- ============================================================
CREATE TABLE recalls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    recall_date DATE NOT NULL,
    recall_type VARCHAR(5),
    odometer INTEGER,
    invoice_number VARCHAR(10),
    invoice_amount NUMERIC(12,2) DEFAULT 0,
    invoice_date DATE,
    attention1 VARCHAR(50),
    attention2 VARCHAR(50),
    attention3 VARCHAR(50),
    attention4 VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_recalls_shop ON recalls(shop_id);
CREATE INDEX idx_recalls_customer ON recalls(customer_id);
CREATE INDEX idx_recalls_date ON recalls(recall_date);
CREATE TRIGGER set_recalls_updated_at BEFORE UPDATE ON recalls
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- LOOKUP CODES (configurable code tables, from TBLFILE.DBF)
-- ============================================================
CREATE TABLE lookup_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    table_id VARCHAR(5) NOT NULL,
    key_value SMALLINT NOT NULL,
    description VARCHAR(50),
    department SMALLINT,
    hours NUMERIC(12,2) DEFAULT 0,
    rate NUMERIC(12,2) DEFAULT 0,
    sales NUMERIC(12,2) DEFAULT 0,
    cost NUMERIC(12,2) DEFAULT 0,
    amount NUMERIC(12,2) DEFAULT 0,
    flag VARCHAR(5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lookup_shop ON lookup_codes(shop_id);
CREATE UNIQUE INDEX idx_lookup_unique ON lookup_codes(shop_id, table_id, key_value);
CREATE TRIGGER set_lookup_updated_at BEFORE UPDATE ON lookup_codes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- AUDIT LOGS (from AUDIT.DBF)
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    code VARCHAR(10),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    info VARCHAR(50),
    description VARCHAR(50),
    amount1 NUMERIC(12,2) DEFAULT 0,
    amount2 NUMERIC(12,2) DEFAULT 0,
    pst_amount NUMERIC(12,2) DEFAULT 0,
    gst_amount NUMERIC(12,2) DEFAULT 0,
    total_tax NUMERIC(12,2) DEFAULT 0,
    tax_code VARCHAR(5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_shop ON audit_logs(shop_id);
CREATE INDEX idx_audit_date ON audit_logs(date);

-- ============================================================
-- SHOP SETTINGS (per-shop config, from MEMOVAR.DBF)
-- ============================================================
CREATE TABLE shop_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
    next_invoice_number INTEGER DEFAULT 1,
    next_sale_number INTEGER DEFAULT 1,
    next_ref_number INTEGER DEFAULT 1,
    system_month SMALLINT DEFAULT 1,
    shop_supplies_rate NUMERIC(6,2) DEFAULT 0,
    shop_supplies_taxable BOOLEAN DEFAULT false,
    doc_rate NUMERIC(8,2) DEFAULT 0,
    shop_rate NUMERIC(8,2) DEFAULT 0,
    gst_number VARCHAR(15),
    use_hst BOOLEAN DEFAULT false,
    federal_tax_rate NUMERIC(6,3) DEFAULT 0.050,
    provincial_tax_rate NUMERIC(6,3) DEFAULT 0.080,
    ar_interest_rate NUMERIC(5,2) DEFAULT 0,
    ar_delay_processing BOOLEAN DEFAULT false,
    supplier_processing BOOLEAN DEFAULT false,
    core_add_on BOOLEAN DEFAULT false,
    default_city VARCHAR(50),
    default_province VARCHAR(5),
    default_comment VARCHAR(100),
    reminder_interval_days SMALLINT DEFAULT 90,
    print_tech_detail BOOLEAN DEFAULT false,
    print_invoice_hours BOOLEAN DEFAULT false,
    print_invoice_supplier BOOLEAN DEFAULT false,
    payment_type1 VARCHAR(20) DEFAULT 'Cash',
    payment_type2 VARCHAR(20) DEFAULT 'Cheque',
    payment_type3 VARCHAR(20) DEFAULT 'Visa',
    payment_type4 VARCHAR(20) DEFAULT 'MasterCard',
    payment_type5 VARCHAR(20) DEFAULT 'Debit',
    skip_lines SMALLINT DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_shop_settings_updated_at BEFORE UPDATE ON shop_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
