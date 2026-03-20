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

	authService := services.NewAuthService(userRepo, shopRepo, cfg.JWTSecret)
	customerService := services.NewCustomerService(customerRepo)
	vehicleService := services.NewVehicleService(vehicleRepo)
	workOrderService := services.NewWorkOrderService(workOrderRepo)
	partService := services.NewPartService(partRepo)

	healthH := NewHealthHandler()
	authH := NewAuthHandler(authService)
	customerH := NewCustomerHandler(customerService)
	vehicleH := NewVehicleHandler(vehicleService)
	workOrderH := NewWorkOrderHandler(workOrderService)
	woLineH := NewWorkOrderLineHandler(workOrderLineRepo)
	partH := NewPartHandler(partService)
	reportsH := NewReportsHandler(pool)

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

	reports := protected.Group("/reports")
	reports.GET("/customers", reportsH.CustomerReport)
	reports.GET("/work-orders", reportsH.WorkOrderReport)
	reports.GET("/summary", reportsH.SummaryReport)

	vehicles := protected.Group("/vehicles")
	vehicles.POST("", vehicleH.Create)
	vehicles.GET("/:id", vehicleH.GetByID)
	vehicles.PUT("/:id", vehicleH.Update)
	vehicles.DELETE("/:id", vehicleH.Delete)

	return r
}
