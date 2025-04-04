package usecase

import (
	"context"
	"errors"
	"time"

	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"

	"golang.org/x/crypto/bcrypt"
)

type UserUseCase struct {
	userRepo repository.UserRepository
}

func NewUserUseCase(userRepo repository.UserRepository) *UserUseCase {
	return &UserUseCase{
		userRepo: userRepo,
	}
}

func (uc *UserUseCase) GetUserByID(ctx context.Context, id uint) (*model.User, error) {
	return uc.userRepo.Find(ctx, id)
}

func (uc *UserUseCase) GetUsers(ctx context.Context, limit, offset int) ([]*model.User, error) {
	if limit <= 0 {
		limit = 10
	}
	return uc.userRepo.FindAll(ctx, limit, offset)
}

func (uc *UserUseCase) CreateUser(ctx context.Context, user *model.User) error {
	// メールアドレスの重複チェック
	existingUser, err := uc.userRepo.FindByEmail(ctx, user.Email)
	if err == nil && existingUser != nil {
		return errors.New("メールアドレスは既に使用されています")
	}
	//パスワードのハッシュ化
	hashPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.Password = string(hashPassword)

	//タイムスタンプの設定
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	// ユーザーロールの設定（未設定の場合）
	if user.Role == "" {
		user.Role = "user" // デフォルトロール
	}

	return uc.userRepo.Create(ctx, user)
}

func (uc *UserUseCase) UpdateUser(ctx context.Context, user *model.User) error {
	// ユーザーの存在確認
	existingUser, err := uc.userRepo.Find(ctx, user.ID)
	if err != nil {
		return err
	}
	if existingUser == nil {
		return errors.New("ユーザーが見つかりません")
	}

	// メールアドレスの変更がある場合、重複チェック
	if user.Email != existingUser.Email {
		duplicate, err := uc.userRepo.FindByEmail(ctx, user.Email)
		if err == nil && duplicate != nil {
			return errors.New("メールアドレスは既に使用されています")
		}
	}

	// パスワードが変更される場合はハッシュ化
	if user.Password != "" && user.Password != existingUser.Password {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		user.Password = string(hashedPassword)
	} else {
		// パスワードが空の場合、既存のパスワードを維持
		user.Password = existingUser.Password
	}

	// 更新日時の設定
	user.UpdatedAt = time.Now()
	user.CreatedAt = existingUser.CreatedAt // 作成日時は変更しない

	return uc.userRepo.Update(ctx, user)
}

func (uc *UserUseCase) DeleteUser(ctx context.Context, id uint) error {
	// ユーザーの存在確認
	existingUser, err := uc.userRepo.Find(ctx, id)
	if err != nil {
		return err
	}
	if existingUser == nil {
		return errors.New("ユーザーが見つかりません")
	}

	return uc.userRepo.Delete(ctx, id)
}

// ユーザー認証処理
func (uc *UserUseCase) AuthenticateUser(ctx context.Context, email, password string) (*model.User, error) {
	user, err := uc.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("メールアドレスまたはパスワードが正しくありません")
	}

	// パスワードの検証
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		return nil, errors.New("メールアドレスまたはパスワードが正しくありません")
	}

	return user, nil
}
