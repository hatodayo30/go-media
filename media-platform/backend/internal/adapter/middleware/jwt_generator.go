package middleware

import (
	"fmt"
	"time"

	"media-platform/internal/domain/entity"

	"github.com/golang-jwt/jwt/v4"
)

// JWTGenerator はJWTトークンの生成と検証を行います
type JWTGenerator struct {
	secretKey []byte
}

// NewJWTGenerator は新しいJWTGeneratorを作成します
func NewJWTGenerator(secret string) *JWTGenerator {
	return &JWTGenerator{
		secretKey: []byte(secret),
	}
}

// GenerateToken はユーザー情報からJWTトークンを生成します
func (j *JWTGenerator) GenerateToken(user *entity.User) (string, error) {
	if user == nil {
		return "", fmt.Errorf("user is nil")
	}

	// クレームの作成
	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"role":     user.Role,
		"exp":      time.Now().Add(24 * time.Hour).Unix(), // 24時間有効
		"iat":      time.Now().Unix(),
	}

	// トークンの作成
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// 署名してトークン文字列を取得
	tokenString, err := token.SignedString(j.secretKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken はトークンを検証してユーザー情報を取得します
func (j *JWTGenerator) ValidateToken(tokenString string) (*entity.User, error) {
	// トークンのパース
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// 署名方式の検証
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return j.secretKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	// クレームの取得
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// ユーザー情報の復元
	user := &entity.User{
		ID:       int64(claims["user_id"].(float64)),
		Username: claims["username"].(string),
		Email:    claims["email"].(string),
		Role:     claims["role"].(string),
	}

	return user, nil
}
