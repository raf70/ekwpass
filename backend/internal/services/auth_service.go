package services

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/rkulczycki/ekwpass/internal/middleware"
	"github.com/rkulczycki/ekwpass/internal/models"
	"github.com/rkulczycki/ekwpass/internal/repositories"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo  *repositories.UserRepo
	shopRepo  *repositories.ShopRepo
	jwtSecret string
}

func NewAuthService(userRepo *repositories.UserRepo, shopRepo *repositories.ShopRepo, jwtSecret string) *AuthService {
	return &AuthService{userRepo: userRepo, shopRepo: shopRepo, jwtSecret: jwtSecret}
}

func (s *AuthService) Login(ctx context.Context, req *models.LoginRequest) (*models.LoginResponse, error) {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}
	if user == nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("generate token: %w", err)
	}

	return &models.LoginResponse{Token: token, User: *user}, nil
}

func (s *AuthService) Setup(ctx context.Context, req *models.RegisterRequest) (*models.LoginResponse, error) {
	count, err := s.userRepo.CountAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("count users: %w", err)
	}
	if count > 0 {
		return nil, fmt.Errorf("system already initialized")
	}

	shop := &models.Shop{Name: req.ShopName}
	if err := s.shopRepo.Create(ctx, shop); err != nil {
		return nil, fmt.Errorf("create shop: %w", err)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &models.User{
		ShopID:       shop.ID,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Name:         req.Name,
		Role:         "admin",
		IsActive:     true,
	}
	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("generate token: %w", err)
	}

	return &models.LoginResponse{Token: token, User: *user}, nil
}

func (s *AuthService) GetCurrentUser(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	return s.userRepo.FindByID(ctx, userID)
}

func (s *AuthService) IsInitialized(ctx context.Context) (bool, error) {
	count, err := s.userRepo.CountAll(ctx)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *AuthService) generateToken(user *models.User) (string, error) {
	claims := &middleware.Claims{
		UserID: user.ID,
		ShopID: user.ShopID,
		Role:   user.Role,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}
