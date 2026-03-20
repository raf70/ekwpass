package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var verbose bool

func main() {
	dataDir := flag.String("data", "", "path to legacy Ekwpass data directory")
	shopIDFlag := flag.String("shop-id", "", "import into an existing shop (UUID); skips shop/user creation")
	shopName := flag.String("shop", "EKW Auto", "name for a new shop (ignored if -shop-id is set)")
	dbURL := flag.String("db", "postgres://ekwpass:ekwpass_dev@localhost:5432/ekwpass?sslmode=disable", "database connection URL")
	adminEmail := flag.String("email", "admin@ekwpass.local", "admin user email (ignored if -shop-id is set)")
	adminPass := flag.String("password", "changeme", "admin user password (ignored if -shop-id is set)")
	flag.BoolVar(&verbose, "v", false, "verbose output (print DBF field definitions)")
	flag.Parse()

	if *dataDir == "" {
		fmt.Fprintf(os.Stderr, "Usage: migrate-legacy -data <path> [options]\n\nOptions:\n")
		flag.PrintDefaults()
		os.Exit(1)
	}

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, *dbURL)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Database unreachable: %v", err)
	}
	fmt.Println("Connected to database")

	var shopID uuid.UUID

	if *shopIDFlag != "" {
		shopID, err = uuid.Parse(*shopIDFlag)
		if err != nil {
			log.Fatalf("Invalid -shop-id %q: %v", *shopIDFlag, err)
		}
		var name string
		err = pool.QueryRow(ctx, `SELECT name FROM shops WHERE id = $1`, shopID).Scan(&name)
		if err != nil {
			log.Fatalf("Shop %s not found: %v", shopID, err)
		}
		fmt.Printf("Importing into existing shop %q (ID: %s)\n\n", name, shopID)
	} else {
		shopID, err = createShop(ctx, pool, *shopName, *adminEmail, *adminPass)
		if err != nil {
			log.Fatalf("Create shop: %v", err)
		}
		fmt.Printf("Created shop %q (ID: %s)\n\n", *shopName, shopID)
	}

	fmt.Println("Importing legacy data...")
	importAll(ctx, pool, shopID, *dataDir)
	fmt.Println("\nDone.")
}

func createShop(ctx context.Context, pool *pgxpool.Pool, name, email, password string) (uuid.UUID, error) {
	shopID := uuid.New()
	if _, err := pool.Exec(ctx,
		`INSERT INTO shops (id, name) VALUES ($1, $2)`,
		shopID, name,
	); err != nil {
		return uuid.Nil, fmt.Errorf("insert shop: %w", err)
	}

	settingsID := uuid.New()
	if _, err := pool.Exec(ctx,
		`INSERT INTO shop_settings (id, shop_id) VALUES ($1, $2)`,
		settingsID, shopID,
	); err != nil {
		return uuid.Nil, fmt.Errorf("insert shop_settings: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return uuid.Nil, fmt.Errorf("hash password: %w", err)
	}

	userID := uuid.New()
	if _, err := pool.Exec(ctx,
		`INSERT INTO users (id, shop_id, email, password_hash, name, role, is_active)
		 VALUES ($1, $2, $3, $4, $5, 'admin', true)`,
		userID, shopID, email, string(hash), "Admin",
	); err != nil {
		return uuid.Nil, fmt.Errorf("insert admin user: %w", err)
	}

	return shopID, nil
}

type importStep struct {
	name string
	file string
	fn   func(context.Context, *pgxpool.Pool, *Lookups, string) (int, error)
}

func importAll(ctx context.Context, pool *pgxpool.Pool, shopID uuid.UUID, dataDir string) {
	lu := &Lookups{
		ShopID:             shopID,
		PhoneToCustomer:    make(map[string]uuid.UUID),
		PhoneVehToVehicle:  make(map[string]uuid.UUID),
		SupplierCodeToID:   make(map[string]uuid.UUID),
		InvoiceToWorkOrder: make(map[string]uuid.UUID),
	}

	steps := []importStep{
		{"Lookup Codes", "TBLFILE.DBF", importLookupCodes},
		{"Customers", "CUSTOMER.DBF", importCustomers},
		{"Vehicles", "VEHICLE.DBF", importVehicles},
		{"Suppliers", "SUPPLIER.DBF", importSuppliers},
		{"Parts", "PARTS.DBF", importParts},
		{"Work Orders (History)", "HISMAST.DBF", importHistoryOrders},
		{"Work Order Lines (History)", "HISDTL.DBF", importHistoryLines},
		{"Work Orders (Open)", "WIPMAST.DBF", importOpenOrders},
		{"Work Order Lines (Open)", "WIPDTL.DBF", importOpenLines},
		{"Sales", "SALEFILE.DBF", importSales},
		{"AP Transactions", "SAP.DBF", importAPTransactions},
		{"Recalls", "RECALL.DBF", importRecalls},
		{"Audit Logs", "AUDIT.DBF", importAuditLogs},
		{"Shop Settings", "MEMOVAR.DBF", importShopSettings},
	}

	for _, s := range steps {
		path := filepath.Join(dataDir, s.file)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			fmt.Printf("  %-35s SKIPPED (file not found)\n", s.name)
			continue
		}
		count, err := s.fn(ctx, pool, lu, path)
		if err != nil {
			fmt.Printf("  %-35s ERROR: %v\n", s.name, err)
		} else {
			fmt.Printf("  %-35s %d records\n", s.name, count)
		}
	}
}
