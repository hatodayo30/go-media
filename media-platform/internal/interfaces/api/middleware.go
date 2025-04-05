package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

// JWTConfig はJWT認証に必要な設定を保持します
type JWTConfig struct {
	SecretKey string
}

// NewJWTConfig は新しいJWTConfigのインスタンスを生成します
func NewJWTConfig(secretKey string) *JWTConfig {
	return &JWTConfig{
		SecretKey: secretKey,
	}
}

// AuthMiddleware はJWTトークンを検証する認証ミドルウェアを提供します
func (jc *JWTConfig) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "認証ヘッダーがありません",
			})
			c.Abort()
			return
		}

		// Bearerトークンを分解
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "認証ヘッダーのフォーマットが不正です",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// トークンの検証
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// 署名アルゴリズムの確認
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jc.SecretKey), nil
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "無効なトークンです: " + err.Error(),
			})
			c.Abort()
			return
		}

		// トークンからクレームを取得
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			// ユーザー情報をコンテキストに保存
			c.Set("user", claims)
			c.Next()
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "無効なトークンクレームです",
			})
			c.Abort()
			return
		}
	}
}

// RoleMiddleware は指定されたロールを持つユーザーのみアクセスを許可するミドルウェアを提供します
func RoleMiddleware(roles []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// ユーザー情報を取得
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "認証されていません",
			})
			c.Abort()
			return
		}

		// クレームからロールを取得
		claims, ok := user.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "ユーザー情報の形式が不正です",
			})
			c.Abort()
			return
		}

		role, ok := claims["role"].(string)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "ユーザーにロールが割り当てられていません",
			})
			c.Abort()
			return
		}

		// 必要なロールを持っているか確認
		hasRequiredRole := false
		for _, allowedRole := range roles {
			if role == allowedRole {
				hasRequiredRole = true
				break
			}
		}

		if !hasRequiredRole {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "このアクションを実行する権限がありません",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
