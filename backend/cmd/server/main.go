package main

import (
	"context"
	"log"

	"github.com/joho/godotenv"
	"github.com/rkulczycki/ekwpass/internal/config"
	"github.com/rkulczycki/ekwpass/internal/database"
	"github.com/rkulczycki/ekwpass/internal/handlers"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	pool, err := database.NewPostgresPool(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	if err := database.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	router := handlers.SetupRouter(pool, cfg)

	log.Printf("Server starting on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
