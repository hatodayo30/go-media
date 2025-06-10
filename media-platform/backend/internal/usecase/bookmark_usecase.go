// usecase/bookmark_usecase.go
package usecase

import (
	"context"
	"fmt"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"
)

// BookmarkUseCase はブックマークに関するビジネスロジックを提供します
type BookmarkUseCase struct {
	bookmarkRepo repository.BookmarkRepository
	contentRepo  repository.ContentRepository
}

// NewBookmarkUseCase は新しいBookmarkUseCaseインスタンスを作成します
func NewBookmarkUseCase(bookmarkRepo repository.BookmarkRepository, contentRepo repository.ContentRepository) *BookmarkUseCase {
	return &BookmarkUseCase{
		bookmarkRepo: bookmarkRepo,
		contentRepo:  contentRepo,
	}
}

// GetBookmarksByContentID はコンテンツIDによるブックマーク一覧を取得します
func (uc *BookmarkUseCase) GetBookmarksByContentID(ctx context.Context, contentID int64) ([]*model.Bookmark, error) {
	bookmarks, err := uc.bookmarkRepo.FindByContentID(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("ブックマークの取得に失敗しました: %w", err)
	}

	return bookmarks, nil
}

// GetBookmarksByUserID はユーザーIDによるブックマーク一覧を取得します
func (uc *BookmarkUseCase) GetBookmarksByUserID(ctx context.Context, userID int64) ([]*model.Bookmark, error) {
	bookmarks, err := uc.bookmarkRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("ブックマークの取得に失敗しました: %w", err)
	}

	return bookmarks, nil
}

// CreateBookmark はブックマークを作成します
func (uc *BookmarkUseCase) CreateBookmark(ctx context.Context, bookmark *model.Bookmark) error {
	// バリデーション
	if err := bookmark.Validate(); err != nil {
		return err
	}

	// 既存のブックマークをチェック
	existingBookmark, err := uc.bookmarkRepo.FindByUserAndContentID(ctx, bookmark.UserID, bookmark.ContentID)
	if err != nil {
		return fmt.Errorf("既存ブックマークの確認に失敗しました: %w", err)
	}

	if existingBookmark != nil {
		return domainErrors.NewValidationError("このコンテンツは既にブックマーク済みです")
	}

	// ブックマークを作成
	return uc.bookmarkRepo.Create(ctx, bookmark)
}

// DeleteBookmark はブックマークを削除します
func (uc *BookmarkUseCase) DeleteBookmark(ctx context.Context, id int64, userID int64, isAdmin bool) error {
	bookmark, err := uc.bookmarkRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("ブックマークの検索に失敗しました: %w", err)
	}

	if bookmark == nil {
		return domainErrors.NewValidationError("指定されたブックマークが見つかりません")
	}

	// 権限チェック(ブックマークの作成者または管理者のみ削除可能)
	if bookmark.UserID != userID && !isAdmin {
		return domainErrors.NewValidationError("このブックマークを削除する権限がありません")
	}

	return uc.bookmarkRepo.Delete(ctx, id)
}

// ToggleBookmark はブックマークの追加/削除を切り替えます
func (uc *BookmarkUseCase) ToggleBookmark(ctx context.Context, userID, contentID int64) (*model.Bookmark, bool, error) {
	// 既存のブックマークを検索
	existingBookmark, err := uc.bookmarkRepo.FindByUserAndContentID(ctx, userID, contentID)
	if err != nil {
		return nil, false, fmt.Errorf("既存のブックマークの確認に失敗しました: %w", err)
	}

	if existingBookmark != nil {
		// 既存のブックマークを削除
		err = uc.bookmarkRepo.Delete(ctx, existingBookmark.ID)
		if err != nil {
			return nil, false, fmt.Errorf("ブックマークの削除に失敗しました: %w", err)
		}
		return existingBookmark, false, nil // 削除された
	}

	// 新規ブックマークを作成
	newBookmark := &model.Bookmark{
		UserID:    userID,
		ContentID: contentID,
	}

	// バリデーション
	if err := newBookmark.Validate(); err != nil {
		return nil, false, err
	}

	err = uc.bookmarkRepo.Create(ctx, newBookmark)
	if err != nil {
		return nil, false, fmt.Errorf("ブックマークの作成に失敗しました: %w", err)
	}

	return newBookmark, true, nil // 作成された
}

// CountBookmarksByContentID はコンテンツIDによるブックマーク数を取得します
func (uc *BookmarkUseCase) CountBookmarksByContentID(ctx context.Context, contentID int64) (int64, error) {
	count, err := uc.bookmarkRepo.CountByContentID(ctx, contentID)
	if err != nil {
		return 0, fmt.Errorf("ブックマーク数の取得に失敗しました: %w", err)
	}

	return count, nil
}
