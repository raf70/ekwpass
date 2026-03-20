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
