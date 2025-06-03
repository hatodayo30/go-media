package repository

import (
	"context"

	"media-platform/internal/domain/model"
)

type UserRepository interface {
	Find(ctx context.Context, id int64) (*model.User, error)
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	FindAll(ctx context.Context, limit, offset int) ([]*model.User, error)
	Create(ctx context.Context, user *model.User) error
	Update(ctx context.Context, user *model.User) error
	Delete(ctx context.Context, id int64) error
}
