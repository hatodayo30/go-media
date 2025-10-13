package service

import (
	"context"
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"
	"media-platform/internal/usecase/dto"
)

// ========== Dependencies (Interfaces) ==========

type TokenGenerator interface {
	GenerateToken(user *entity.User) (string, error)
	ValidateToken(token string) (*entity.User, error)
}

// ========== Use Case Interactor ==========

// UserService はユーザーに関するアプリケーションサービスを提供します
type UserService struct {
	userRepo       repository.UserRepository
	tokenGenerator TokenGenerator
}

// NewUserService は新しいUserServiceのインスタンスを生成します
func NewUserService(
	userRepo repository.UserRepository,
	tokenGenerator TokenGenerator,
) *UserService {
	return &UserService{
		userRepo:       userRepo,
		tokenGenerator: tokenGenerator,
	}
}

// ========== Domain Service統合メソッド ==========

// HashPassword はパスワードをハッシュ化します（旧AuthenticationService）
func (s *UserService) HashPassword(password string) (string, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("password hashing failed: %w", err)
	}
	return string(hashedBytes), nil
}

// VerifyPassword はパスワードを検証します（旧AuthenticationService）
func (s *UserService) VerifyPassword(password, hashedPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// IsEmailExists はメールアドレスが既に存在するかチェックします（旧UserDomainService）
func (s *UserService) IsEmailExists(ctx context.Context, email string) (bool, error) {
	user, err := s.userRepo.FindByEmail(ctx, email)

	// ✅ NotFoundErrorの型チェック
	if err != nil {
		if domainErrors.IsNotFoundError(err) {
			return false, nil
		}
		return false, err
	}

	return user != nil, nil
}

// IsUsernameExists はユーザー名が既に存在するかチェックします
func (s *UserService) IsUsernameExists(ctx context.Context, username string) (bool, error) {
	user, err := s.userRepo.FindByUsername(ctx, username)

	// ✅ NotFoundErrorの型チェック
	if err != nil {
		if domainErrors.IsNotFoundError(err) {
			return false, nil
		}
		return false, err
	}

	return user != nil, nil
}

// IsEmailExistsExcluding は指定したユーザーID以外でメールアドレスが存在するかチェックします
func (s *UserService) IsEmailExistsExcluding(ctx context.Context, email string, excludeUserID int64) (bool, error) {
	user, err := s.userRepo.FindByEmail(ctx, email)

	// ✅ NotFoundErrorの型チェック
	if err != nil {
		if domainErrors.IsNotFoundError(err) {
			return false, nil
		}
		return false, err
	}

	return user != nil && user.ID != excludeUserID, nil
}

// ========== Entity to DTO変換メソッド（Service内で実装） ==========

// toUserResponse はEntityをUserResponseに変換します
func (s *UserService) toUserResponse(user *entity.User) *dto.UserResponse {
	return &dto.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Bio:       user.Bio,
		Avatar:    user.Avatar,
		Role:      user.Role,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}
}

// toUserResponseList はEntityスライスをUserResponseスライスに変換します
func (s *UserService) toUserResponseList(users []*entity.User) []*dto.UserResponse {
	responses := make([]*dto.UserResponse, len(users))
	for i, user := range users {
		responses[i] = s.toUserResponse(user)
	}
	return responses
}

// ========== Use Cases ==========

// RegisterUser はユーザー登録のUse Caseです
func (s *UserService) RegisterUser(ctx context.Context, req *dto.CreateUserRequest) (*dto.LoginResponse, error) {
	log.Printf("🔄 [SERVICE 1] Starting RegisterUser for email: %s", req.Email)

	// 重複チェック
	if exists, err := s.IsEmailExists(ctx, req.Email); err != nil {
		log.Printf("❌ [SERVICE 1.1] Email check failed: %v", err)
		return nil, fmt.Errorf("email existence check failed: %w", err)
	} else if exists {
		log.Printf("❌ [SERVICE 1.1] Email already exists")
		return nil, domainErrors.NewConflictError("User", "email already exists")
	}
	log.Printf("✅ [SERVICE 1.1] Email check passed")

	if exists, err := s.IsUsernameExists(ctx, req.Username); err != nil {
		log.Printf("❌ [SERVICE 1.2] Username check failed: %v", err)
		return nil, fmt.Errorf("username existence check failed: %w", err)
	} else if exists {
		log.Printf("❌ [SERVICE 1.2] Username already exists")
		return nil, domainErrors.NewConflictError("User", "username already exists")
	}
	log.Printf("✅ [SERVICE 1.2] Username check passed")

	// パスワードのハッシュ化
	log.Printf("🔄 [SERVICE 2] Hashing password...")
	hashedPassword, err := s.HashPassword(req.Password)
	if err != nil {
		log.Printf("❌ [SERVICE 2] Password hashing failed: %v", err)
		return nil, fmt.Errorf("password hashing failed: %w", err)
	}
	log.Printf("✅ [SERVICE 2] Password hashed")

	// ユーザーエンティティの作成
	log.Printf("🔄 [SERVICE 3] Creating user entity...")
	user, err := entity.NewUser(
		req.Username,
		req.Email,
		hashedPassword,
		req.Bio,
		req.Avatar,
	)
	if err != nil {
		log.Printf("❌ [SERVICE 3] Entity creation failed: %v", err)
		return nil, err
	}
	log.Printf("✅ [SERVICE 3] Entity created")

	// ユーザーの保存
	log.Printf("🔄 [SERVICE 4] Saving user to database...")
	if err := s.userRepo.Create(ctx, user); err != nil {
		log.Printf("❌ [SERVICE 4] Database save failed: %v", err)
		return nil, fmt.Errorf("user creation failed: %w", err)
	}
	log.Printf("✅ [SERVICE 4] User saved with ID: %d", user.ID)

	// トークン生成
	log.Printf("🔄 [SERVICE 5] Generating token...")
	if s.tokenGenerator == nil {
		log.Printf("❌ [SERVICE 5] tokenGenerator is nil!")
		return nil, fmt.Errorf("tokenGenerator is not initialized")
	}

	token, err := s.tokenGenerator.GenerateToken(user)
	if err != nil {
		log.Printf("❌ [SERVICE 5] Token generation failed: %v", err)
		return nil, fmt.Errorf("token generation failed: %w", err)
	}
	log.Printf("✅ [SERVICE 5] Token generated")

	// レスポンス作成
	log.Printf("✅ [SERVICE 6] RegisterUser completed successfully")
	return &dto.LoginResponse{
		Token: token,
		User:  *s.toUserResponse(user),
	}, nil
}

// LoginUser はユーザーログインのUse Caseです
func (s *UserService) LoginUser(ctx context.Context, req *dto.LoginRequest) (*dto.LoginResponse, error) {
	// ユーザーの取得
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("User", req.Email)
	}

	// パスワード検証
	if !s.VerifyPassword(req.Password, user.Password) {
		return nil, domainErrors.NewValidationError("invalid credentials")
	}

	// トークン生成
	token, err := s.tokenGenerator.GenerateToken(user)
	if err != nil {
		return nil, fmt.Errorf("token generation failed: %w", err)
	}

	// レスポンス作成
	return &dto.LoginResponse{
		Token: token,
		User:  *s.toUserResponse(user),
	}, nil
}

// GetUserByID はユーザー取得のUse Caseです
func (s *UserService) GetUserByID(ctx context.Context, id int64) (*dto.UserResponse, error) {
	user, err := s.userRepo.Find(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("User", id)
	}

	return s.toUserResponse(user), nil
}

// GetAllUsers は全ユーザー取得のUse Caseです
func (s *UserService) GetAllUsers(ctx context.Context, limit, offset int) ([]*dto.UserResponse, error) {
	// パラメータの正規化
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	users, err := s.userRepo.FindAll(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("users lookup failed: %w", err)
	}

	return s.toUserResponseList(users), nil
}

// UpdateUser はユーザー更新のUse Caseです
func (s *UserService) UpdateUser(ctx context.Context, id int64, req *dto.UpdateUserRequest) (*dto.UserResponse, error) {
	// ユーザーの取得
	user, err := s.userRepo.Find(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("User", id)
	}

	// フィールドの更新（ドメインロジック使用）
	if req.Username != "" && req.Username != user.Username {
		if exists, err := s.IsUsernameExists(ctx, req.Username); err != nil {
			return nil, fmt.Errorf("username existence check failed: %w", err)
		} else if exists {
			return nil, domainErrors.NewConflictError("User", "username already exists")
		}

		if err := user.SetUsername(req.Username); err != nil {
			return nil, err
		}
	}

	if req.Email != "" && req.Email != user.Email {
		if exists, err := s.IsEmailExistsExcluding(ctx, req.Email, id); err != nil {
			return nil, fmt.Errorf("email existence check failed: %w", err)
		} else if exists {
			return nil, domainErrors.NewConflictError("User", "email already exists")
		}

		if err := user.SetEmail(req.Email); err != nil {
			return nil, err
		}
	}

	if req.Password != "" {
		hashedPassword, err := s.HashPassword(req.Password)
		if err != nil {
			return nil, fmt.Errorf("password hashing failed: %w", err)
		}

		if err := user.SetPassword(hashedPassword); err != nil {
			return nil, err
		}
	}

	if req.Bio != "" {
		if err := user.SetBio(req.Bio); err != nil {
			return nil, err
		}
	}

	if req.Avatar != "" {
		if err := user.SetAvatar(req.Avatar); err != nil {
			return nil, err
		}
	}

	// ユーザーの更新
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("user update failed: %w", err)
	}

	return s.toUserResponse(user), nil
}

// DeleteUser はユーザー削除のUse Caseです
func (s *UserService) DeleteUser(ctx context.Context, id int64, userID int64, isAdmin bool) error {
	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, id)
	if err != nil {
		return fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return domainErrors.NewNotFoundError("User", id)
	}

	// 削除権限のチェック
	if !isAdmin && user.ID != userID {
		return domainErrors.NewValidationError("このユーザーを削除する権限がありません")
	}
	// ユーザーの削除
	if err := s.userRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("user deletion failed: %w", err)
	}

	return nil
}

// GetCurrentUser は現在ログイン中のユーザー情報を取得します
func (s *UserService) GetCurrentUser(ctx context.Context, userID int64) (*dto.UserResponse, error) {
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("User", userID)
	}

	return s.toUserResponse(user), nil
}

// GetPublicUsers は公開ユーザー取得のUse Caseです
func (s *UserService) GetPublicUsers(ctx context.Context) ([]*dto.UserResponse, error) {
	// FindAllを使用して完全なEntityを取得
	// limit, offsetは要件に応じて調整してください
	users, err := s.userRepo.FindAll(ctx, 100, 0)
	if err != nil {
		return nil, fmt.Errorf("public users lookup failed: %w", err)
	}

	// Entity → DTO変換（完全な情報を持つDTOを作成）
	// Presenterで公開用に変換するため、ここでは全情報を含める
	return s.toUserResponseList(users), nil
}
