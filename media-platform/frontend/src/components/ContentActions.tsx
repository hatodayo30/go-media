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
}

interface UserActions {
  hasLiked: boolean;
  hasDisliked: boolean;
  likeId?: number;
  dislikeId?: number;
}

const ContentActions: React.FC<ContentActionsProps> = ({ 
  contentId, 
  size = 'medium',
  showCounts = true 
}) => {
  const [stats, setStats] = useState<ActionStats>({
    likes: 0,
    dislikes: 0
  });
  const [userActions, setUserActions] = useState<UserActions>({
    hasLiked: false,
    hasDisliked: false
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
      console.log(`🎯 評価データ取得: コンテンツID ${contentId}`);

      // 評価統計を取得
      const averageResponse = await api.getAverageRating(contentId.toString());
      const avgData = averageResponse.data || averageResponse;
      
      setStats({
        likes: avgData.like_count || 0,
        dislikes: avgData.dislike_count || 0
      });

      // ユーザーの評価状態確認（ログイン時のみ）
      if (isAuthenticated) {
        const ratingsResponse = await api.getRatingsByContent(contentId.toString());
        const ratings = ratingsResponse.data?.ratings || ratingsResponse.ratings || [];
        
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
            likeId: userLike?.id,
            dislikeId: userDislike?.id
          });
        }
      }

    } catch (error: any) {
      console.error('❌ アクション取得エラー:', error);
      
      if (error.response?.status === 404) {
        // データがない場合は正常
        setStats({ likes: 0, dislikes: 0 });
        setUserActions({ hasLiked: false, hasDisliked: false });
      } else {
        setError('評価データの取得に失敗しました');
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
      console.log('👍 いいね処理開始');
      console.log('📤 送信予定データ:', { contentId, value: 1 });
  
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
        
        // 修正: オブジェクトではなく、個別の引数として渡す
        await api.createOrUpdateRating(contentId, 1);  // 1 = いいね
        console.log('✅ いいね成功');
      }
  
      await fetchActions();
  
    } catch (error: any) {
      console.error('❌ いいねエラー:', error);
      if (error.response?.data) {
        console.error('❌ エラー詳細:', error.response.data);
      }
      
      let errorMessage = 'いいねの処理に失敗しました';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
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
    console.log('👎 バッド処理開始');
    console.log('📤 送信予定データ:', { contentId, value: 0 });

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
      
      // 修正: オブジェクトではなく、個別の引数として渡す & 0 = バッド
      await api.createOrUpdateRating(contentId, 0);  // 0 = バッド
      console.log('✅ バッド成功');
    }

    await fetchActions();

  } catch (error: any) {
    console.error('❌ バッドエラー:', error);
    if (error.response?.data) {
      console.error('❌ エラー詳細:', error.response.data);
    }
    
    let errorMessage = 'バッドの処理に失敗しました';
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }
    
    setError(errorMessage);
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

      {/* 評価ボタン（ブックマーク削除） */}
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
      </div>

      {/* 認証状態の表示 */}
      {!isAuthenticated && (
        <div style={{
          textAlign: 'center',
          marginTop: '0.75rem',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          🔒 評価するにはログインしてください
        </div>
      )}

      {/* ユーザー状態表示 */}
      {showCounts && isAuthenticated && (userActions.hasLiked || userActions.hasDisliked) && (
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
        </div>
      )}
    </div>
  );
};

export default ContentActions;