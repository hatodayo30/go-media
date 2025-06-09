import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Rating {
  id: number;
  user_id: number;
  content_id: number;
  rating: number; // 1-5の評価 or 単純ないいね
  created_at: string;
}

interface RatingStats {
  average: number;
  total: number;
  ratings: Rating[];
}

interface RatingProps {
  contentId: number;
  mode?: 'star' | 'like'; // 'star': 5段階評価, 'like': いいね/ディスライク
  showStats?: boolean;    // 統計情報を表示するか
  size?: 'small' | 'medium' | 'large';
}

const Rating: React.FC<RatingProps> = ({ 
  contentId, 
  mode = 'star', 
  showStats = true,
  size = 'medium'
}) => {
  const [ratingStats, setRatingStats] = useState<RatingStats>({
    average: 0,
    total: 0,
    ratings: []
  });
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  // サイズに応じたスタイル
  const sizes = {
    small: { fontSize: '1rem', gap: '0.25rem', padding: '0.25rem' },
    medium: { fontSize: '1.5rem', gap: '0.5rem', padding: '0.5rem' },
    large: { fontSize: '2rem', gap: '0.75rem', padding: '0.75rem' }
  };

  const currentSize = sizes[size];

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    fetchRatings();
  }, [contentId]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`📊 評価取得: コンテンツID ${contentId}`);

      // 平均評価を取得
      const averageResponse = await api.getAverageRating(contentId.toString());
      console.log('📈 平均評価レスポンス:', averageResponse);

      // 評価一覧を取得
      const ratingsResponse = await api.getRatingsByContent(contentId.toString());
      console.log('📋 評価一覧レスポンス:', ratingsResponse);

      // データの正規化
      const average = averageResponse.data?.average || averageResponse.average || 0;
      const total = ratingsResponse.data?.total || ratingsResponse.total || 0;
      const ratings = ratingsResponse.data?.ratings || ratingsResponse.ratings || [];

      setRatingStats({
        average: Number(average),
        total: Number(total),
        ratings: ratings
      });

      // ユーザーの評価を確認
      if (isAuthenticated) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user.id;
        
        if (userId) {
          const userRatingData = ratings.find((r: Rating) => r.user_id === userId);
          setUserRating(userRatingData ? userRatingData.rating : null);
          console.log('👤 ユーザーの評価:', userRatingData?.rating || 'なし');
        }
      }

    } catch (error: any) {
      console.error('❌ 評価取得エラー:', error);
      
      if (error.response) {
        if (error.response.status === 404) {
          // 評価がない場合は正常
          setRatingStats({ average: 0, total: 0, ratings: [] });
        } else {
          setError('評価の取得に失敗しました');
        }
      } else {
        setError('ネットワークエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSubmit = async (rating: number) => {
    if (!isAuthenticated) {
      alert('評価するにはログインが必要です');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      console.log('⭐ 評価投稿:', { rating, content_id: contentId });

      const response = await api.createOrUpdateRating({
        content_id: contentId,
        rating: rating
      });

      console.log('✅ 評価投稿成功:', response);
      setUserRating(rating);

      // 評価データを再取得
      await fetchRatings();

    } catch (error: any) {
      console.error('❌ 評価投稿エラー:', error);

      let errorMessage = '評価の投稿に失敗しました';
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = '認証が必要です。再度ログインしてください。';
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        } else {
          errorMessage = error.response.data?.error || errorMessage;
        }
      }

      alert(errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRatingDelete = async () => {
    if (!userRating) return;

    try {
      setSubmitting(true);
      setError(null);
      console.log('🗑️ 評価削除');

      // 評価IDを取得
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userRatingData = ratingStats.ratings.find(r => r.user_id === user.id);
      
      if (userRatingData) {
        await api.deleteRating(userRatingData.id.toString());
        console.log('✅ 評価削除成功');
        setUserRating(null);
        await fetchRatings();
      }

    } catch (error: any) {
      console.error('❌ 評価削除エラー:', error);
      alert('評価の削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  // 星レンダリング（5段階評価用）
  const renderStars = () => {
    const stars = [];
    const maxStars = 5;

    for (let i = 1; i <= maxStars; i++) {
      const isFilled = userRating ? i <= userRating : false;
      const isHovered = hoveredRating ? i <= hoveredRating : false;
      const isActive = isFilled || isHovered;

      stars.push(
        <button
          key={i}
          onClick={() => userRating === i ? handleRatingDelete() : handleRatingSubmit(i)}
          onMouseEnter={() => setHoveredRating(i)}
          onMouseLeave={() => setHoveredRating(null)}
          disabled={submitting || !isAuthenticated}
          style={{
            background: 'none',
            border: 'none',
            cursor: isAuthenticated ? 'pointer' : 'not-allowed',
            fontSize: currentSize.fontSize,
            color: isActive ? '#fbbf24' : '#d1d5db',
            transition: 'color 0.2s ease',
            opacity: submitting ? 0.6 : 1,
            padding: '0.125rem'
          }}
          title={isAuthenticated ? `${i}つ星` : 'ログインが必要です'}
        >
          ⭐
        </button>
      );
    }

    return stars;
  };

  // いいね/ディスライクレンダリング
  const renderLikeButtons = () => {
    const likeCount = ratingStats.ratings.filter(r => r.rating === 1).length;
    const dislikeCount = ratingStats.ratings.filter(r => r.rating === 0).length;

    return (
      <div style={{ display: 'flex', gap: currentSize.gap, alignItems: 'center' }}>
        {/* いいねボタン */}
        <button
          onClick={() => userRating === 1 ? handleRatingDelete() : handleRatingSubmit(1)}
          disabled={submitting || !isAuthenticated}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'none',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: currentSize.padding,
            cursor: isAuthenticated ? 'pointer' : 'not-allowed',
            fontSize: currentSize.fontSize,
            backgroundColor: userRating === 1 ? '#dcfce7' : 'transparent',
            color: userRating === 1 ? '#059669' : '#6b7280',
            opacity: submitting ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
          title={isAuthenticated ? 'いいね' : 'ログインが必要です'}
        >
          👍 {likeCount}
        </button>

        {/* ディスライクボタン */}
        <button
          onClick={() => userRating === 0 ? handleRatingDelete() : handleRatingSubmit(0)}
          disabled={submitting || !isAuthenticated}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'none',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: currentSize.padding,
            cursor: isAuthenticated ? 'pointer' : 'not-allowed',
            fontSize: currentSize.fontSize,
            backgroundColor: userRating === 0 ? '#fee2e2' : 'transparent',
            color: userRating === 0 ? '#dc2626' : '#6b7280',
            opacity: submitting ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
          title={isAuthenticated ? 'ディスライク' : 'ログインが必要です'}
        >
          👎 {dislikeCount}
        </button>
      </div>
    );
  };

  // 平均評価の表示（星モード用）
  const renderAverageStars = () => {
    const stars = [];
    const maxStars = 5;
    const average = ratingStats.average;

    for (let i = 1; i <= maxStars; i++) {
      const isFilled = i <= Math.floor(average);
      const isHalfFilled = i === Math.floor(average) + 1 && average % 1 >= 0.5;

      stars.push(
        <span
          key={i}
          style={{
            fontSize: size === 'small' ? '0.875rem' : '1rem',
            color: isFilled || isHalfFilled ? '#fbbf24' : '#d1d5db'
          }}
        >
          {isFilled ? '⭐' : isHalfFilled ? '✨' : '☆'}
        </span>
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <div style={{ padding: currentSize.padding }}>
        <div style={{ fontSize: currentSize.fontSize }}>📊 読み込み中...</div>
      </div>
    );
  }

  return (
    <div style={{
      padding: currentSize.padding,
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

      {/* 評価インターフェース */}
      <div style={{ marginBottom: showStats ? '0.75rem' : 0 }}>
        {mode === 'star' ? (
          <div>
            <div style={{ 
              display: 'flex', 
              gap: '0.125rem', 
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              {renderStars()}
              {userRating && (
                <button
                  onClick={handleRatingDelete}
                  disabled={submitting}
                  style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  削除
                </button>
              )}
            </div>
            {!isAuthenticated && (
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#6b7280' 
              }}>
                🔒 評価するにはログインしてください
              </div>
            )}
          </div>
        ) : (
          renderLikeButtons()
        )}
      </div>

      {/* 統計情報 */}
      {showStats && (
        <div style={{
          fontSize: size === 'small' ? '0.75rem' : '0.875rem',
          color: '#6b7280',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '0.75rem'
        }}>
          {mode === 'star' ? (
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '0.25rem'
              }}>
                <div style={{ display: 'flex', gap: '0.125rem' }}>
                  {renderAverageStars()}
                </div>
                <span>
                  {ratingStats.average.toFixed(1)} ({ratingStats.total}件の評価)
                </span>
              </div>
              {userRating && (
                <div style={{ fontSize: '0.75rem' }}>
                  あなたの評価: ⭐ {userRating}
                </div>
              )}
            </div>
          ) : (
            <div>
              評価総数: {ratingStats.total}件
              {userRating !== null && (
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  あなたの評価: {userRating === 1 ? '👍 いいね' : '👎 ディスライク'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Rating;