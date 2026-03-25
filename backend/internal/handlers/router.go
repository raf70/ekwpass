package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rkulczycki/ekwpass/internal/config"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/repositories"
	"github.com/rkulczycki/ekwpass/internal/services"
)

func SetupRouter(pool *pgxpool.Pool, cfg *config.Config) *gin.Engine {
	r := gin.Default()
	r.Use(middleware.CORSMiddleware())

	userRepo := repositories.NewUserRepo(pool)
	shopRepo := repositories.NewShopRepo(pool)
	customerRepo := repositories.NewCustomerRepo(pool)
	vehicleRepo := repositories.NewVehicleRepo(pool)
	workOrderRepo := repositories.NewWorkOrderRepo(pool)
	workOrderLineRepo := repositories.NewWorkOrderLineRepo(pool)
	partRepo := repositories.NewPartRepo(pool)
	supplierRepo := repositories.NewSupplierRepo(pool)
	apRepo := repositories.NewAPTransactionRepo(pool)
	arRepo := repositories.NewARTransactionRepo(pool)

	authService := services.NewAuthService(userRepo, shopRepo, cfg.JWTSecret)
	customerService := services.NewCustomerService(customerRepo)
	vehicleService := services.NewVehicleService(vehicleRepo)
	workOrderService := services.NewWorkOrderService(workOrderRepo, customerRepo, arRepo, workOrderLineRepo)
	partService := services.NewPartService(partRepo)
	supplierService := services.NewSupplierService(supplierRepo)
	saleRepo := repositories.NewSaleRepo(pool)
	saleService := services.NewSaleService(saleRepo)

	healthH := NewHealthHandler()
	authH := NewAuthHandler(authService)
	customerH := NewCustomerHandler(customerService, arRepo, shopRepo)
	vehicleH := NewVehicleHandler(vehicleService)
	workOrderH := NewWorkOrderHandler(workOrderService)
	woLineH := NewWorkOrderLineHandler(workOrderLineRepo)
	partH := NewPartHandler(partService)
	supplierH := NewSupplierHandler(supplierService, partService, apRepo)
	saleH := NewSaleHandler(saleService)
	shopSettingsRepo := repositories.NewShopSettingsRepo(pool)
	lookupCodeRepo := repositories.NewLookupCodeRepo(pool)
	reportsH := NewReportsHandler(pool, arRepo)
	settingsH := NewSettingsHandler(shopSettingsRepo)
	lookupCodeH := NewLookupCodeHandler(lookupCodeRepo)
	monthEndH := NewMonthEndHandler(pool, arRepo, shopSettingsRepo)

	api := r.Group("/api")
	api.GET("/health", healthH.Health)

	auth := api.Group("/auth")
	auth.POST("/login", authH.Login)
	auth.POST("/setup", authH.Setup)
	auth.GET("/status", authH.Status)

	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))

	protected.GET("/auth/me", authH.Me)

	customers := protected.Group("/customers")
	customers.GET("", customerH.List)
	customers.POST("", customerH.Create)
	customers.GET("/:id", customerH.GetByID)
	customers.PUT("/:id", customerH.Update)
	customers.DELETE("/:id", customerH.Delete)
	customers.GET("/:id/vehicles", vehicleH.ListByCustomer)
	customers.GET("/:id/ar-transactions", customerH.ListARTransactions)
	customers.POST("/:id/ar-transactions", customerH.CreateARTransaction)
	customers.GET("/:id/statement", customerH.GetStatement)

	workOrders := protected.Group("/work-orders")
	workOrders.GET("", workOrderH.List)
	workOrders.POST("", workOrderH.Create)
	workOrders.GET("/:id", workOrderH.GetByID)
	workOrders.PUT("/:id", workOrderH.Update)
	workOrders.GET("/:id/lines", woLineH.List)
	workOrders.POST("/:id/lines", woLineH.Create)
	workOrders.DELETE("/:id/lines/:lineId", woLineH.Delete)

	parts := protected.Group("/parts")
	parts.GET("", partH.List)
	parts.GET("/search", partH.Search)
	parts.POST("", partH.Create)
	parts.GET("/:id", partH.GetByID)
	parts.PUT("/:id", partH.Update)
	parts.DELETE("/:id", partH.Delete)

	suppliers := protected.Group("/suppliers")
	suppliers.GET("", supplierH.List)
	suppliers.POST("", supplierH.Create)
	suppliers.GET("/:id", supplierH.GetByID)
	suppliers.PUT("/:id", supplierH.Update)
	suppliers.DELETE("/:id", supplierH.Delete)
	suppliers.GET("/:id/parts", supplierH.ListParts)
	suppliers.GET("/:id/ap-transactions", supplierH.ListAPTransactions)

	sales := protected.Group("/sales")
	sales.GET("", saleH.List)
	sales.POST("", saleH.Create)
	sales.GET("/:id", saleH.GetByID)
	sales.PUT("/:id", saleH.Update)
	sales.DELETE("/:id", saleH.Delete)

	reports := protected.Group("/reports")
	reports.GET("/customers", reportsH.CustomerReport)
	reports.GET("/work-orders", reportsH.WorkOrderReport)
	reports.GET("/summary", reportsH.SummaryReport)
	reports.GET("/ar-aging", reportsH.ARAgingReport)
	reports.POST("/ar-aging/process", reportsH.ProcessAging)
	reports.POST("/ar-aging/interest", reportsH.ApplyInterest)
	reports.POST("/ar-aging/statements", reportsH.GenerateStatements)

	protected.GET("/shop", func(c *gin.Context) {
		claims := middleware.GetClaims(c)
		shop, err := shopRepo.FindByID(c.Request.Context(), claims.ShopID)
		if err != nil || shop == nil {
			c.JSON(500, gin.H{"error": "failed to load shop"})
			return
		}
		c.JSON(200, shop)
	})
	protected.GET("/settings", settingsH.Get)
	protected.PUT("/settings", settingsH.Update)
	lookupCodes := protected.Group("/lookup-codes")
	lookupCodes.GET("", lookupCodeH.List)
	lookupCodes.GET("/categories", lookupCodeH.Categories)
	lookupCodes.POST("", lookupCodeH.Create)
	lookupCodes.PUT("/:id", lookupCodeH.Update)
	lookupCodes.DELETE("/:id", lookupCodeH.Delete)

	monthEnd := protected.Group("/month-end")
	monthEnd.GET("/preview", monthEndH.Preview)
	monthEnd.POST("/process", monthEndH.Process)

	vehicles := protected.Group("/vehicles")
	vehicles.POST("", vehicleH.Create)
	vehicles.GET("/:id", vehicleH.GetByID)
	vehicles.PUT("/:id", vehicleH.Update)
	vehicles.DELETE("/:id", vehicleH.Delete)

	return r
}
