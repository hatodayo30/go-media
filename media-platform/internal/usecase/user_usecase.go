package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"

	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

// UserUseCase はユーザーに関するユースケースを提供します
type UserUseCase struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

// NewUserUseCase は新しいUserUseCaseのインスタンスを生成します
func NewUserUseCase(userRepo repository.UserRepository) *UserUseCase {
	return &UserUseCase{
		userRepo:  userRepo,
		jwtSecret: "your-secret-key", // 設定ファイルから読み込むか環境変数から取得するのが望ましい
	}
}

// Register はユーザー登録を行います
func (u *UserUseCase) Register(ctx context.Context, req *model.CreateUserRequest) (*model.UserResponse, error) {
	// メールアドレスの重複チェック
	existingUser, err := u.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("このメールアドレスは既に使用されています")
	}

	// パスワードのハッシュ化
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("パスワードのハッシュ化に失敗しました: %w", err)
	}

	// ユーザーエンティティの作成
	user := &model.User{
		Username:  req.Username,
		Email:     req.Email,
		Password:  string(hashedPassword),
		Bio:       req.Bio,
		Avatar:    req.Avatar,
		Role:      "user", // デフォルトは一般ユーザー
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// ドメインルールのバリデーション
	if err := user.Validate(); err != nil {
		return nil, err
	}

	// ユーザーの保存
	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user.ToResponse(), nil
}

// Login はユーザーログインを行い、JWTトークンを返します
func (u *UserUseCase) Login(ctx context.Context, req *model.LoginRequest) (string, *model.UserResponse, error) {
	// メールアドレスでユーザーを検索
	user, err := u.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return "", nil, err
	}
	if user == nil {
		return "", nil, errors.New("メールアドレスまたはパスワードが正しくありません")
	}

	// パスワードの検証
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return "", nil, errors.New("メールアドレスまたはパスワードが正しくありません")
	}

	// JWTトークンの生成
	token, err := u.generateJWT(user)
	if err != nil {
		return "", nil, fmt.Errorf("トークンの生成に失敗しました: %w", err)
	}

	return token, user.ToResponse(), nil
}

// GetUserByID は指定したIDのユーザーを取得します
func (u *UserUseCase) GetUserByID(ctx context.Context, id uint) (*model.UserResponse, error) {
	user, err := u.userRepo.Find(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("ユーザーが見つかりません")
	}

	return user.ToResponse(), nil
}

// GetAllUsers は全てのユーザーを取得します
func (u *UserUseCase) GetAllUsers(ctx context.Context, limit, offset int) ([]*model.UserResponse, error) {
	users, err := u.userRepo.FindAll(ctx, limit, offset)
	if err != nil {
		return nil, err
	}

	var responses []*model.UserResponse
	for _, user := range users {
		responses = append(responses, user.ToResponse())
	}

	return responses, nil
}

// UpdateUser はユーザー情報を更新します
func (u *UserUseCase) UpdateUser(ctx context.Context, id uint, req *model.UpdateUserRequest) (*model.UserResponse, error) {
	// ユーザーの取得
	user, err := u.userRepo.Find(ctx, id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("ユーザーが見つかりません")
	}

	// フィールドの更新
	if req.Username != "" && req.Username != user.Username {
		if err := user.SetUsername(req.Username); err != nil {
			return nil, err
		}
	}

	if req.Email != "" && req.Email != user.Email {
		// メールアドレスの重複チェック
		existingUser, err := u.userRepo.FindByEmail(ctx, req.Email)
		if err != nil {
			return nil, err
		}
		if existingUser != nil && existingUser.ID != user.ID {
			return nil, errors.New("このメールアドレスは既に使用されています")
		}

		if err := user.SetEmail(req.Email); err != nil {
			return nil, err
		}
	}

	if req.Password != "" {
		if err := user.SetPassword(req.Password); err != nil {
			return nil, err
		}

		// パスワードのハッシュ化
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("パスワードのハッシュ化に失敗しました: %w", err)
		}
		user.Password = string(hashedPassword)
	}

	if req.Bio != user.Bio {
		user.SetBio(req.Bio)
	}

	if req.Avatar != user.Avatar {
		user.SetAvatar(req.Avatar)
	}

	// ドメインルールのバリデーション
	if err := user.Validate(); err != nil {
		return nil, err
	}

	// ユーザーの更新
	if err := u.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user.ToResponse(), nil
}

// UpdateUserByAdmin は管理者がユーザー情報を更新します
func (u *UserUseCase) UpdateUserByAdmin(ctx context.Context, id uint, req *model.UpdateUserRequest) (*model.UserResponse, error) {
	// 管理者による更新は基本的に一般ユーザーの更新と同じロジック
	return u.UpdateUser(ctx, id, req)
}

// DeleteUser はユーザーを削除します
func (u *UserUseCase) DeleteUser(ctx context.Context, id uint) error {
	// ユーザーの存在確認
	user, err := u.userRepo.Find(ctx, id)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("ユーザーが見つかりません")
	}

	// ユーザーの削除
	return u.userRepo.Delete(ctx, id)
}

// GetCurrentUser は現在ログイン中のユーザー情報を取得します
func (u *UserUseCase) GetCurrentUser(ctx context.Context, id uint) (*model.UserResponse, error) {
	return u.GetUserByID(ctx, id)
}

// generateJWT はJWTトークンを生成します
func (u *UserUseCase) generateJWT(user *model.User) (string, error) {
	// トークンの有効期限設定（例: 24時間）
	expirationTime := time.Now().Add(24 * time.Hour)

	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"role":     user.Role,
		"exp":      expirationTime.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(u.jwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
