# EKW-PASS TODO

Tracking remaining work to reach feature parity with the legacy DOS application.

## Accounts Receivable (AR)

- [x] **Import legacy AR transactions (CAR20.DBF)** — add import step to `migrate-legacy` for historical AR transaction data
- [x] **Auto-post from work orders** — when a work order is closed, automatically create a DR transaction in AR for the invoice total (charge-account customers)
- [ ] **Revisit AR auto-post scope** — currently only posts for customers with `credit_limit > 0`; decide whether all customers should get AR entries or keep legacy charge-account-only behavior
- [x] **Aging bucket processing (month-end)** — roll balances: current → 30 → 60 → 90 days overdue; update customer `ar_current`, `ar_30`, `ar_60`, `ar_90` fields
- [x] **Interest charges** — apply `shop_settings.ar_interest_rate` to overdue balances (30+ days) during month-end processing
- [x] **Statement generation** — generate/print customer AR statements; update `ar_stmt_balance` and `ar_stmt_flag`
- [ ] **AR delay processing** — wire `shop_settings.ar_delay_processing` flag to control whether aging runs immediately or is deferred

## Modules Still on Placeholder Pages

- [x] **Sales (counter/POS)** — full CRUD, similar to how Suppliers was implemented
- [x] **Settings** — shop settings management UI (tax rates, shop supplies rate, payment types, invoice numbering, etc.)

## Data Migration

- [x] **CAR20.DBF** — AR transactions (see above)
- [ ] **Verify all DBF imports** — run import with `-v` against real data, check for any unmapped or skipped fields

## Other

- [ ] **Work order finalization** — tax calculation during close (GST/PST/HST based on shop_settings and customer exemptions)
- [ ] **Service recalls/reminders** — UI for viewing and managing recall records
- [ ] **Audit log viewer** — UI to browse imported and new audit log entries
- [ ] **User management** — add/edit/deactivate users, role assignment
- [x] **Invoice printing** — printable invoice from work order detail page with parts, labour, and tax breakdown
- [ ] **Report export** — report export (PDF/CSV)
