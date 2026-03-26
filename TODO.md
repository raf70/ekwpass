# EKW-PASS TODO

Tracking remaining work to reach feature parity with the legacy DOS application.

## Work Orders

- [x] **CRUD + lines** — create, edit, detail, close/reopen/void, add/remove parts and labour lines
- [x] **Add labour UI** — inline form on WO detail page with default hourly rate from `shop_settings.shop_rate`
- [x] **Editing locked on closed/voided orders** — add/delete buttons hidden when WO is not open
- [x] **Invoice printing** — printable invoice from work order detail page with parts, labour, and tax breakdown
- [x] **Tax finalization on close** — reads `shop_settings` rates (GST/PST/HST, `use_hst` flag), respects per-customer `pst_exempt`/`gst_exempt`; recalcs totals on close before AR posting
- [x] **Totals recalculation** — shop supplies amount, discount amounts, doc rate, and taxes computed from `shop_settings` whenever lines change
- [ ] **Technician assignment** — `work_order_technicians` table exists in schema but has no repo, handler, or UI; legacy tracked technician per line (`IDTECH`)
- [ ] **Invoice print options** — `printTechDetail`, `printInvoiceHours`, `printInvoiceSupplier` settings exist but invoice page doesn't use them yet
- [ ] **Consolidated invoicing (multi-WO)** — see design notes below

> **Consolidated Invoicing Design Notes**
>
> Currently each work order acts as its own invoice (1:1 relationship). The
> `invoice_number` field on `work_orders` is the customer-facing document number,
> and the invoice page at `/work-orders/:id/invoice` renders a single WO.
>
> To support billing multiple work orders on a single invoice, the recommended
> approach is to introduce a **separate `invoices` table** as a first-class entity.
> All WOs on one invoice must belong to the same customer.
>
> **New `invoices` table:**
> - `id`, `shop_id`, `invoice_number` (from `shop_settings.next_invoice_number`),
>   `customer_id`, `status` (draft/finalized/voided), `date`, aggregated totals
>   (jobs, parts, shop supplies, discounts, GST, PST, total tax, grand total),
>   `notes`, timestamps.
> - Unique constraint on `(shop_id, invoice_number)`.
>
> **Schema changes to existing tables:**
> - `work_orders`: add nullable `invoice_id UUID REFERENCES invoices(id)`.
>   Existing `invoice_number` stays as the WO reference number.
> - `ar_transactions`: add nullable `invoice_id UUID REFERENCES invoices(id)`
>   so AR postings can reference the consolidated invoice instead of individual WOs.
>
> **Backend (Go):**
> - New model, repository, service, and handler for invoices.
> - Invoice repo methods: List, FindByID, Create, Update, Delete (draft only),
>   AddWorkOrder, RemoveWorkOrder, RecalcTotals (sum from linked WOs), Finalize.
> - Invoice service: validates same-customer constraint, validates all WOs are
>   closed before finalize, orchestrates AR posting on finalize / reversal on void.
> - API routes: `GET/POST /api/invoices`, `GET/PUT/DELETE /api/invoices/:id`,
>   `POST/DELETE /api/invoices/:id/work-orders/:woId`,
>   `POST /api/invoices/:id/finalize`.
>
> **Frontend (React):**
> - New pages: InvoicesPage (list), InvoiceCreatePage (select customer + pick
>   closed WOs), InvoiceDetailPage (manage linked WOs, finalize), InvoicePrintPage
>   (combined printable invoice showing all WOs' line items).
> - Existing single-WO invoice page at `/work-orders/:id/invoice` is preserved
>   for quick single-WO printing.
> - Sidebar nav item for Invoices.
>
> **Workflow:**
> 1. User creates a draft invoice, selects customer.
> 2. Adds one or more closed WOs for that customer (WOs not already on another
>    invoice).
> 3. System shows combined line items, totals, and tax breakdown.
> 4. User finalizes — totals are locked, a single AR transaction is posted.
> 5. Invoice can be printed as one consolidated document.
>
> **AR posting interaction:**
> - Currently, closing a WO auto-posts an AR transaction for charge-account
>   customers (`credit_limit > 0`). If a WO is linked to a draft invoice, this
>   per-WO auto-post should be skipped; AR is posted only when the invoice is
>   finalized. This prevents double-posting.
> - For WOs not linked to any invoice, the existing auto-post behavior continues
>   unchanged.
>
> **Migration of existing data:**
> - Existing work orders that already have `invoice_number` values continue to
>   work as before. The new `invoice_id` column is nullable, so all existing WOs
>   simply have `invoice_id = NULL` (meaning they use the legacy 1:1 model).
> - No data migration is required; the feature is purely additive.

## Accounts Receivable (AR)

- [x] **Import legacy AR transactions (CAR20.DBF)**
- [x] **Auto-post from work orders** — DR transaction on close for charge-account customers
- [ ] **Revisit AR auto-post scope** — currently only posts for customers with `credit_limit > 0`; decide whether all customers should get AR entries or keep legacy charge-account-only behavior
- [x] **Aging bucket processing (month-end)** — roll balances: current → 30 → 60 → 90 days overdue
- [x] **Interest charges** — apply `shop_settings.ar_interest_rate` to overdue balances (30+ days)
- [x] **Statement generation** — generate/print customer AR statements
- [ ] **AR delay processing** — wire `shop_settings.ar_delay_processing` flag to guard individual aging/interest/statement buttons when enabled (month-end handles it all)
- [x] **CAR10–CAR22 investigation** — see notes below
- [ ] **AR period snapshots** — save a frozen copy of each customer's AR state during month-end processing; optionally import legacy CAR11–CAR22 snapshots for historical audit trail (see notes below)

> **CAR10–CAR22 details:** All 13 files share the identical schema (ARCUSTPHA,
> ARCUSTPHN, ARDATE, ARDESC, ARCRDR, ARAMT). They form a rotating 12-month ring
> buffer of AR snapshots written during legacy month-end processing. CAR.DBF is the
> working buffer, CAR10 holds the current period summary, and CAR11–CAR22 map to
> months 11 (Nov) through 22→10 (Oct). Each contains ~330–354 records: a mix of
> real transactions (invoices/payments with ARCRDR = D/C) and aging-bucket control
> records (sentinel dates 19600101–19600103 with ARCRDR = 0/1/2 storing bucket
> totals per customer). During month-end, the slot for the closing month is
> overwritten with the current AR state, so after 12 months the oldest snapshot is
> lost. The legacy data covers Sep 2022 – Aug 2023.
>
> **Decision needed:** Our new month-end process currently runs aging, interest, and
> statements but does not persist a snapshot. For audit purposes we should either:
> (A) create an `ar_period_snapshots` table and write a frozen copy during month-end
> going forward, or (B) rely on the existing `ar_transactions` table with date-range
> queries for historical lookups. Option A is more robust for answering "what did the
> customer owe at the end of March?" since it captures the exact state including
> aging buckets, interest charges, and any adjustments that may later be modified.
> If option A is chosen, the legacy CAR11–CAR22 data (~4,000 records) can also be
> imported into the same table for historical continuity.

## Month-End Processing

- [x] **Month-end workflow** — unified page that runs AR aging, interest charges, statement generation, and advances `system_month` in one operation
- [x] **Preview** — shows current period, customer counts, overdue counts, and interest rate before processing
- [x] **System month in settings** — editable dropdown on Settings page to view/set the current accounting period
- [ ] **Year-end processing** — YEDCUSVH.DBF, YREND module; year-end rollover of `ytd_sales`/`ytd_gst` fields on customers, archiving

## Lookup Codes

- [x] **Data migration** — TBLFILE.DBF imported into `lookup_codes` table
- [x] **API** — `GET /api/lookup-codes?tableId=` endpoint to query by category
- [x] **Payment type dropdown** — Sale form uses lookup codes (table `M`) for payment type selection
- [x] **CRUD UI** — Lookup Codes page with category tabs, inline editing, add/delete; sidebar link
- [x] **Use in more forms** — department dropdown (table D) on sale and part forms; sale type dropdown (table S) on sale form

## Service Recalls / Reminders

- [x] **Data migration** — RECALL.DBF imported into `recalls` table
- [ ] **API** — CRUD handler and service for recalls
- [ ] **UI** — list/detail/form pages; show upcoming recalls on dashboard; link recalls from vehicle detail page

## Audit Log

- [x] **Data migration** — AUDIT.DBF imported into `audit_logs` table
- [ ] **API** — read-only handler for audit log queries (filter by date, code, user)
- [ ] **UI** — searchable audit log viewer page
- [ ] **New event logging** — write audit entries for key actions (WO close, AR transactions, settings changes, etc.)

## User Management

- [x] **CRUD** — list, create, edit (name, email, role, active/inactive), inline editing on Users page
- [x] **Role assignment** — admin, technician, front_desk; role dropdown on create and edit
- [x] **Role enforcement** — `RequireRole` middleware guards admin-only routes (users, reports, month-end, lookup code writes, settings writes); sidebar and dashboard hide admin-only elements for non-admin users; `GET /api/settings` and `GET /api/reports/summary` remain open to all roles (needed for shop rate, dashboard counts)
- [x] **Password reset** — admin can reset any user's password via modal dialog
- [ ] **Self-service password change** — let users change their own password from a profile page

## Scheduling

- [ ] **Schema** — no table in new system; legacy had `SCHEDULE.DBF` (1.1 MB — significant use)
- [ ] **Data migration** — import step for SCHEDULE.DBF
- [ ] **API + UI** — appointment booking, calendar view, daily/weekly schedule

## Reports

- [x] **Customer report** — customer list/summary
- [x] **Work order report** — WO summary
- [x] **Summary report** — dashboard metrics
- [x] **AR aging report** — aging buckets, run aging, interest, statements
- [ ] **Report export (PDF/CSV)** — no export functionality on any report
- [ ] **Technician report** — legacy had TECHRPT.DBF; productivity/hours by technician
- [ ] **Sales report** — sales summary by date range, department, payment type
- [ ] **Parts report** — inventory valuation, reorder report, slow-moving items
- [ ] **Monthly transactions** — legacy had MTDFILE/MTDTEMP/MTHTXN.DBF for period reporting

## Legacy Modules Not Ported

These existed in the legacy system but may not be needed in the new one:

- [ ] **Letters / mail merge** — LETTER.DBF, LETHELP.DBF; template-based customer letters (service reminders, marketing). Consider replacing with email integration.
- [ ] **Messages** — MESSAGES.DBF (67 KB); internal messaging or notes system
- [ ] **Parts catalog** — CATALOG.DBF; separate from parts inventory, possibly a reference catalog
- [ ] **Print definitions** — PRTDEF.DBF; printer configuration (may not apply to web)
- [ ] **Customer report template** — CUSTREP.DBF; legacy report layout definition
- [ ] **Invoice department/text** — INVDEPT.DBF, INVTEXT.DBF; per-department invoice customization

## Data Migration

- [x] **CAR20.DBF** — AR transactions
- [x] **SALEFILE.DBF** — now includes part_code, cost, list_price, supplier_invoice
- [ ] **Verify all DBF imports** — run import with `-v` against real data, check for any unmapped or skipped fields
- [ ] **SCHEDULE.DBF** — scheduling data (pending schema design)

## Completed

- [x] Customers CRUD + vehicles
- [x] Parts CRUD with search + multi-tier pricing
- [x] Suppliers CRUD + related parts + AP transactions
- [x] Work orders CRUD + lines + close/reopen/void
- [x] Sales (counter/POS) CRUD
- [x] AR transactions + aging + interest + statements
- [x] AP transactions (per supplier)
- [x] Shop settings management UI (including system month)
- [x] Invoice printing
- [x] Dashboard with live metrics
- [x] Legacy data migration (15 import steps)
- [x] Month-end processing (AR aging + interest + statements + advance period)
- [x] Lookup codes CRUD UI + dropdowns in sale/part forms
- [x] User management (CRUD, roles, password reset, admin-only access)
