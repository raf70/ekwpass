# Auto Shop Management System

Modern web-based automotive repair shop management system, rebuilt from a legacy DOS (Clipper/dBASE) application.

## Tech Stack

- **Backend**: Go 1.22 (Gin framework, pgx driver)
- **Frontend**: React 18 + TypeScript (Vite, Tailwind CSS)
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose

## Quick Start

### Using Docker (recommended)

```bash
docker compose up --build
```

Or start just the database for local development:

```bash
docker compose up db
```

### Local Development

Prerequisites: Go 1.22+, Node.js 20+, PostgreSQL 16

```bash
# Start PostgreSQL
docker compose up db

# Backend (terminal 1)
cd backend
go mod tidy
go run ./cmd/server

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

### Access

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000   |
| API      | http://localhost:8080   |
| Database | localhost:5432          |

### First Time Setup

1. Open http://localhost:3000
2. The setup page appears automatically (no users exist yet)
3. Enter your shop name, your name, email, and password
4. Click **Create Shop** to create the first admin account

## Legacy Data Import

The project includes a migration tool that imports data from the original DOS (CA-Clipper/dBASE) `.DBF` files into PostgreSQL.

### Prerequisites

- Docker services running (`docker compose up -d`)
- Legacy data files in a local directory (e.g. `~/Ekwpass/` or `old_version/Ekwpass/`)

### Rebuild the backend image (after code changes)

```bash
docker compose build backend
```

### Run the import

```bash
docker compose run --rm \
  -v /path/to/legacy/data:/data \
  backend ./migrate-legacy \
    -db 'postgres://ekwpass:ekwpass_dev@db:5432/ekwpass?sslmode=disable' \
    -data /data
```

Replace `/path/to/legacy/data` with the absolute path to the directory containing the `.DBF` files (e.g. `CUSTOMER.DBF`, `VEHICLE.DBF`, `SALEFILE.DBF`).

To import into an existing shop (instead of creating a new one), pass `-shop-id`:

```bash
docker compose run --rm \
  -v /path/to/legacy/data:/data \
  backend ./migrate-legacy \
    -db 'postgres://ekwpass:ekwpass_dev@db:5432/ekwpass?sslmode=disable' \
    -data /data \
    -shop-id <your-shop-uuid>
```

### Re-importing (fresh start)

To wipe the database and re-import from scratch:

```bash
# Stop services and destroy the database volume
docker compose down -v

# Start fresh — migrations run automatically on backend start
docker compose up -d

# Run the import again
docker compose run --rm \
  -v /path/to/legacy/data:/data \
  backend ./migrate-legacy \
    -db 'postgres://ekwpass:ekwpass_dev@db:5432/ekwpass?sslmode=disable' \
    -data /data
```

> **Note:** `docker compose down -v` deletes the PostgreSQL data volume. You will need to re-run the setup wizard (create shop + admin account) before importing.

### What gets imported

| Legacy DBF file   | Target table        |
|--------------------|---------------------|
| CUSTOMER.DBF       | customers           |
| VEHICLE.DBF        | vehicles            |
| PARTS.DBF          | parts               |
| SUPPLIER.DBF       | suppliers           |
| WIPFILE.DBF        | work_orders (open)  |
| HISFILE.DBF        | work_orders (closed)|
| WIPDTL.DBF         | work_order_lines    |
| HISDTL.DBF         | work_order_lines    |
| SALEFILE.DBF        | sales               |
| CAR20.DBF          | ar_transactions     |
| SAP.DBF            | ap_transactions     |

## Features

- Multi-shop / multi-tenant support
- Role-based access (Admin, Technician, Front Desk)
- Customer and vehicle management
- Work orders with labor and parts tracking
- Parts inventory with multi-tier pricing
- Supplier management
- Counter/POS sales
- Accounts receivable and payable
- Canadian tax calculation (GST/PST/HST)
- Service recall/reminder system
- Reporting and audit trail
