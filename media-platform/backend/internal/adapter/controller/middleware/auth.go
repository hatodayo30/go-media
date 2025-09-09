package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v4"
	"github.com/labstack/echo/v4"
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
func (jc *JWTConfig) AuthMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "認証ヘッダーがありません",
				})
			}

			// Bearerトークンを分解
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "認証ヘッダーのフォーマットが不正です",
				})
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
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "無効なトークンです: " + err.Error(),
				})
			}

			// トークンからクレームを取得
			if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
				// ユーザー情報をコンテキストに保存
				c.Set("user", claims)

				// よく使用される値を個別に設定（便利のため）
				if userID, exists := claims["user_id"]; exists {
					c.Set("user_id", userID)
				}
				if username, exists := claims["username"]; exists {
					c.Set("username", username)
				}
				if email, exists := claims["email"]; exists {
					c.Set("email", email)
				}
				if role, exists := claims["role"]; exists {
					c.Set("role", role)
				}

				return next(c)
			} else {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "無効なトークンクレームです",
				})
			}
		}
	}
}

// OptionalAuthMiddleware は認証をオプションにするミドルウェア（ログイン状態を確認したいが必須ではない場合）
func (jc *JWTConfig) OptionalAuthMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")

			// 認証ヘッダーがない場合は未認証として続行
			if authHeader == "" {
				c.Set("user", nil)
				c.Set("authenticated", false)
				return next(c)
			}

			// Bearerトークンを分解
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				c.Set("user", nil)
				c.Set("authenticated", false)
				return next(c)
			}

			tokenString := parts[1]

			// トークンの検証
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(jc.SecretKey), nil
			})

			if err != nil {
				c.Set("user", nil)
				c.Set("authenticated", false)
				return next(c)
			}

			// トークンからクレームを取得
			if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
				c.Set("user", claims)
				c.Set("authenticated", true)

				// よく使用される値を個別に設定
				if userID, exists := claims["user_id"]; exists {
					c.Set("user_id", userID)
				}
				if role, exists := claims["role"]; exists {
					c.Set("role", role)
				}
			} else {
				c.Set("user", nil)
				c.Set("authenticated", false)
			}

			return next(c)
		}
	}
}
