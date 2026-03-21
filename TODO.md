# EKW-PASS TODO

Tracking remaining work to reach feature parity with the legacy DOS application.

## Work Orders

- [x] **CRUD + lines** — create, edit, detail, close/reopen/void, add/remove lines
- [x] **Invoice printing** — printable invoice from work order detail page with parts, labour, and tax breakdown
- [x] **Tax finalization on close** — reads `shop_settings` rates (GST/PST/HST, `use_hst` flag), respects per-customer `pst_exempt`/`gst_exempt`; recalcs totals on close before AR posting
- [x] **Totals recalculation** — shop supplies amount, discount amounts, doc rate, and taxes computed from `shop_settings` whenever lines change
- [ ] **Technician assignment** — `work_order_technicians` table exists in schema but has no repo, handler, or UI; legacy tracked technician per line (`IDTECH`)

## Accounts Receivable (AR)

- [x] **Import legacy AR transactions (CAR20.DBF)**
- [x] **Auto-post from work orders** — DR transaction on close for charge-account customers
- [ ] **Revisit AR auto-post scope** — currently only posts for customers with `credit_limit > 0`; decide whether all customers should get AR entries or keep legacy charge-account-only behavior
- [x] **Aging bucket processing (month-end)** — roll balances: current → 30 → 60 → 90 days overdue
- [x] **Interest charges** — apply `shop_settings.ar_interest_rate` to overdue balances (30+ days)
- [x] **Statement generation** — generate/print customer AR statements
- [ ] **AR delay processing** — wire `shop_settings.ar_delay_processing` flag to control whether aging runs immediately or is deferred
- [ ] **CAR10–CAR22 investigation** — legacy has ~12 additional AR tables (likely period summaries); determine if they contain data worth importing

## Lookup Codes

- [x] **Data migration** — TBLFILE.DBF imported into `lookup_codes` table
- [ ] **API + UI** — no handler or frontend for viewing/editing lookup codes
- [ ] **Use in forms** — lookup codes should populate dropdowns (payment types, departments, sale types, etc.) in work order, sale, and part forms

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
- [ ] **Year-end processing** — YEDCUSVH.DBF, YREND module; year-end rollover of YTD fields, archiving
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
- [x] Shop settings management UI
- [x] Invoice printing
- [x] Dashboard with live metrics
- [x] Legacy data migration (15 import steps)
