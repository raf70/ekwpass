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

## Accounts Receivable (AR)

- [x] **Import legacy AR transactions (CAR20.DBF)**
- [x] **Auto-post from work orders** — DR transaction on close for charge-account customers
- [ ] **Revisit AR auto-post scope** — currently only posts for customers with `credit_limit > 0`; decide whether all customers should get AR entries or keep legacy charge-account-only behavior
- [x] **Aging bucket processing (month-end)** — roll balances: current → 30 → 60 → 90 days overdue
- [x] **Interest charges** — apply `shop_settings.ar_interest_rate` to overdue balances (30+ days)
- [x] **Statement generation** — generate/print customer AR statements
- [ ] **AR delay processing** — wire `shop_settings.ar_delay_processing` flag to guard individual aging/interest/statement buttons when enabled (month-end handles it all)
- [ ] **CAR10–CAR22 investigation** — legacy has ~12 additional AR tables (likely period summaries); determine if they contain data worth importing

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

- [ ] **CRUD** — add, edit, deactivate users
- [ ] **Role assignment** — admin, technician, front_desk
- [ ] **Role enforcement** — middleware currently reads role from JWT but handlers don't restrict access by role

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
