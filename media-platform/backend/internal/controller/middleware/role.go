package middleware

import (
	"net/http"

	"github.com/golang-jwt/jwt/v4"
	"github.com/labstack/echo/v4"
)

// RoleMiddleware は指定されたロールを持つユーザーのみアクセスを許可するミドルウェアを提供します
func RoleMiddleware(roles []string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// ユーザー情報を取得
			user := c.Get("user")
			if user == nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "認証されていません",
				})
			}

			// クレームからロールを取得
			claims, ok := user.(jwt.MapClaims)
			if !ok {
				return c.JSON(http.StatusInternalServerError, map[string]string{
					"error": "ユーザー情報の形式が不正です",
				})
			}

			role, ok := claims["role"].(string)
			if !ok {
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": "ユーザーにロールが割り当てられていません",
				})
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
				return c.JSON(http.StatusForbidden, map[string]string{
					"error": "このアクションを実行する権限がありません",
				})
			}

			return next(c)
		}
	}
}

// AdminMiddleware は管理者のみアクセスを許可するミドルウェアです
func AdminMiddleware() echo.MiddlewareFunc {
	return RoleMiddleware([]string{"admin"})
}

// UserOrAdminMiddleware は一般ユーザーまたは管理者のアクセスを許可するミドルウェアです
func UserOrAdminMiddleware() echo.MiddlewareFunc {
	return RoleMiddleware([]string{"user", "admin"})
}
