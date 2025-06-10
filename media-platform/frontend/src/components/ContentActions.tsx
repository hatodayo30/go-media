import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface ContentActionsProps {
  contentId: number;
  size?: 'small' | 'medium' | 'large';
  showCounts?: boolean;
}

interface ActionStats {
  likes: number;
  dislikes: number;
  bookmarks: number;
}

interface UserActions {
  hasLiked: boolean;
  hasDisliked: boolean;
  hasBookmarked: boolean;
  likeId?: number;
  dislikeId?: number;
  bookmarkId?: number;
}

const ContentActions: React.FC<ContentActionsProps> = ({ 
  contentId, 
  size = 'medium',
  showCounts = true 
}) => {
  const [stats, setStats] = useState<ActionStats>({
    likes: 0,
    dislikes: 0,
    bookmarks: 0
  });
  const [userActions, setUserActions] = useState<UserActions>({
    hasLiked: false,
    hasDisliked: false,
    hasBookmarked: false
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // サイズに応じたスタイル
  const sizes = {
    small: { 
      fontSize: '0.875rem', 
      padding: '0.375rem 0.75rem', 
      gap: '0.5rem',
      iconSize: '1rem'
    },
    medium: { 
      fontSize: '1rem', 
      padding: '0.5rem 1rem', 
      gap: '0.75rem',
      iconSize: '1.25rem'
    },
    large: { 
      fontSize: '1.125rem', 
      padding: '0.75rem 1.25rem', 
      gap: '1rem',
      iconSize: '1.5rem'
    }
  };

  const currentSize = sizes[size];

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    fetchActions();
  }, [contentId]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🎯 アクション取得: コンテンツID ${contentId}`);

      // 新しい統合APIを試行、失敗したら従来のAPIを使用
      try {
        const response = await api.getContentActions(contentId.toString());
        console.log('📊 統合アクションレスポンス:', response);

        if (response.success && response.data) {
          const actionData = response.data;
          
          // 統計データを設定
          setStats({
            likes: actionData.stats.likes || 0,
            dislikes: actionData.stats.dislikes || 0,
            bookmarks: actionData.stats.bookmarks || 0
          });

          // ユーザーのアクション状態を設定
          if (isAuthenticated && actionData.user_status) {
            const userStatus = actionData.user_status;
            setUserActions({
              hasLiked: userStatus.has_liked || false,
              hasDisliked: userStatus.has_disliked || false,
              hasBookmarked: userStatus.has_bookmarked || false,
              likeId: userStatus.like_id,
              dislikeId: userStatus.dislike_id,
              bookmarkId: userStatus.bookmark_id
            });

            console.log('👤 ユーザーアクション:', userStatus);
          } else {
            // ログインしていない場合はデフォルト状態
            setUserActions({
              hasLiked: false,
              hasDisliked: false,
              hasBookmarked: false
            });
          }
          return; // 成功したので処理終了
        }
      } catch (newApiError) {
        console.log('⚠️ 新しいAPIが利用できません、従来のAPIを使用します');
      }

      // フォールバック: 従来のAPI使用
      const ratingsResponse = await api.getRatingsByContent(contentId.toString());
      console.log('📊 評価レスポンス:', ratingsResponse);

      // データの正規化
      const ratings = ratingsResponse.data?.ratings || ratingsResponse.ratings || [];
      
      // 統計の計算
      const likes = ratings.filter((r: any) => r.value === 1).length;
      const dislikes = ratings.filter((r: any) => r.value === 0).length;
      
      setStats({
        likes,
        dislikes,
        bookmarks: 0 // TODO: ブックマーク数
      });

      // ユーザーのアクション状態を確認
      if (isAuthenticated) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id;
        
        if (userId) {
          const userLike = ratings.find((r: any) => 
            r.user_id === userId && r.value === 1
          );
          const userDislike = ratings.find((r: any) => 
            r.user_id === userId && r.value === 0
          );

          setUserActions({
            hasLiked: !!userLike,
            hasDisliked: !!userDislike,
            hasBookmarked: false, // TODO: ブックマーク状態
            likeId: userLike?.id,
            dislikeId: userDislike?.id
          });

          console.log('👤 ユーザーアクション:', {
            liked: !!userLike,
            disliked: !!userDislike
          });
        }
      }

    } catch (error: any) {
      console.error('❌ アクション取得エラー:', error);
      
      if (error.response?.status === 404) {
        // データがない場合は正常
        setStats({ likes: 0, dislikes: 0, bookmarks: 0 });
        setUserActions({
          hasLiked: false,
          hasDisliked: false,
          hasBookmarked: false
        });
      } else {
        setError('アクションデータの取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      alert('いいねするにはログインが必要です');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      console.log('👍 いいね処理');

      if (userActions.hasLiked) {
        // いいねを取り消し
        if (userActions.likeId) {
          await api.deleteRating(userActions.likeId.toString());
          console.log('✅ いいね取り消し成功');
        }
      } else {
        // いいねを追加（既存のバッドがあれば削除）
        if (userActions.hasDisliked && userActions.dislikeId) {
          await api.deleteRating(userActions.dislikeId.toString());
        }
        
        // 修正: 'rating' を 'value' に変更
        await api.createOrUpdateRating({
          content_id: contentId,
          value: 1  // いいね = 1
        });
        console.log('✅ いいね成功');
      }

      await fetchActions();

    } catch (error: any) {
      console.error('❌ いいねエラー:', error);
      
      // エラーハンドリングの改善
      let errorMessage = 'いいねの処理に失敗しました';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDislike = async () => {
    if (!isAuthenticated) {
      alert('バッドするにはログインが必要です');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      console.log('👎 バッド処理');

      if (userActions.hasDisliked) {
        // バッドを取り消し
        if (userActions.dislikeId) {
          await api.deleteRating(userActions.dislikeId.toString());
          console.log('✅ バッド取り消し成功');
        }
      } else {
        // バッドを追加（既存のいいねがあれば削除）
        if (userActions.hasLiked && userActions.likeId) {
          await api.deleteRating(userActions.likeId.toString());
        }
        
        // 修正: 'rating' を 'value' に変更
        await api.createOrUpdateRating({
          content_id: contentId,
          value: 0  // バッド = 0
        });
        console.log('✅ バッド成功');
      }

      await fetchActions();

    } catch (error: any) {
      console.error('❌ バッドエラー:', error);
      
      // エラーハンドリングの改善
      let errorMessage = 'バッドの処理に失敗しました';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      alert('ブックマークするにはログインが必要です');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      console.log('🔖 ブックマーク処理');

      // TODO: ブックマークAPI実装後に有効化
      console.log('🔖 ブックマーク機能は今後実装予定です');
      setError('ブックマーク機能は今後実装予定です');

    } catch (error: any) {
      console.error('❌ ブックマークエラー:', error);
      setError('ブックマークの処理に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        gap: currentSize.gap,
        alignItems: 'center',
        fontSize: currentSize.fontSize
      }}>
        📊 読み込み中...
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: 'white'
    }}>
      {/* エラー表示 */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          padding: '0.5rem',
          borderRadius: '4px',
          marginBottom: '0.75rem',
          fontSize: '0.875rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* アクションボタン */}
      <div style={{
        display: 'flex',
        gap: currentSize.gap,
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {/* いいねボタン */}
        <button
          onClick={handleLike}
          disabled={submitting || !isAuthenticated}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: currentSize.padding,
            backgroundColor: userActions.hasLiked ? '#dcfce7' : 'transparent',
            color: userActions.hasLiked ? '#059669' : '#6b7280',
            border: `1px solid ${userActions.hasLiked ? '#059669' : '#d1d5db'}`,
            borderRadius: '8px',
            fontSize: currentSize.fontSize,
            cursor: isAuthenticated ? 'pointer' : 'not-allowed',
            opacity: submitting ? 0.6 : 1,
            transition: 'all 0.2s ease',
            fontWeight: userActions.hasLiked ? '600' : '400'
          }}
          title={isAuthenticated ? 'いいね' : 'ログインが必要です'}
        >
          <span style={{ fontSize: currentSize.iconSize }}>
            {userActions.hasLiked ? '👍' : '🤍'}
          </span>
          {showCounts && (
            <span>{stats.likes}</span>
          )}
          <span style={{ fontSize: '0.875em' }}>いいね</span>
        </button>

        {/* バッドボタン */}
        <button
          onClick={handleDislike}
          disabled={submitting || !isAuthenticated}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: currentSize.padding,
            backgroundColor: userActions.hasDisliked ? '#fee2e2' : 'transparent',
            color: userActions.hasDisliked ? '#dc2626' : '#6b7280',
            border: `1px solid ${userActions.hasDisliked ? '#dc2626' : '#d1d5db'}`,
            borderRadius: '8px',
            fontSize: currentSize.fontSize,
            cursor: isAuthenticated ? 'pointer' : 'not-allowed',
            opacity: submitting ? 0.6 : 1,
            transition: 'all 0.2s ease',
            fontWeight: userActions.hasDisliked ? '600' : '400'
          }}
          title={isAuthenticated ? 'バッド' : 'ログインが必要です'}
        >
          <span style={{ fontSize: currentSize.iconSize }}>
            {userActions.hasDisliked ? '👎' : '🖤'}
          </span>
          {showCounts && (
            <span>{stats.dislikes}</span>
          )}
          <span style={{ fontSize: '0.875em' }}>バッド</span>
        </button>

        {/* ブックマークボタン */}
        <button
          onClick={handleBookmark}
          disabled={submitting || !isAuthenticated}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: currentSize.padding,
            backgroundColor: userActions.hasBookmarked ? '#fef3c7' : 'transparent',
            color: userActions.hasBookmarked ? '#92400e' : '#6b7280',
            border: `1px solid ${userActions.hasBookmarked ? '#92400e' : '#d1d5db'}`,
            borderRadius: '8px',
            fontSize: currentSize.fontSize,
            cursor: isAuthenticated ? 'pointer' : 'not-allowed',
            opacity: submitting ? 0.6 : 1,
            transition: 'all 0.2s ease',
            fontWeight: userActions.hasBookmarked ? '600' : '400'
          }}
          title={isAuthenticated ? 'ブックマーク' : 'ログインが必要です'}
        >
          <span style={{ fontSize: currentSize.iconSize }}>
            {userActions.hasBookmarked ? '🔖' : '📑'}
          </span>
          {showCounts && (
            <span>{stats.bookmarks}</span>
          )}
          <span style={{ fontSize: '0.875em' }}>保存</span>
        </button>
      </div>

      {/* 認証状態の表示 */}
      {!isAuthenticated && (
        <div style={{
          textAlign: 'center',
          marginTop: '0.75rem',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          🔒 アクションを実行するにはログインしてください
        </div>
      )}

      {/* 統計情報 */}
      {showCounts && isAuthenticated && (
        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e5e7eb',
          fontSize: '0.75rem',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          {userActions.hasLiked && <span>✅ あなたがいいねしました</span>}
          {userActions.hasDisliked && <span>✅ あなたがバッドしました</span>}
          {userActions.hasBookmarked && <span>✅ ブックマークに保存済み</span>}
        </div>
      )}
    </div>
  );
};

export default ContentActions;