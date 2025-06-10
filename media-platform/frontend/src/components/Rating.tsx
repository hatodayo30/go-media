import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { api } from '../utils/api';

interface RatingProps {
  contentId: number;
  mode?: 'like' | 'star'; // 'like': いいね/ディスライク, 'star': 5段階評価（将来用）
  showStats?: boolean;
  size?: 'small' | 'medium' | 'large';
  onRatingChange?: (rating: number) => void;
}

interface RatingStats {
  likes: number;
  dislikes: number;
  userRating?: number; // 0 = バッド, 1 = いいね, undefined = 未評価
}

const Rating: React.FC<RatingProps> = ({ 
  contentId, 
  mode = 'like',
  showStats = true,
  size = 'medium',
  onRatingChange 
}) => {
  const [stats, setStats] = useState<RatingStats>({
    likes: 0,
    dislikes: 0,
    userRating: undefined
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // サイズに応じたスタイル
  const sizeClasses = {
    small: 'text-sm px-2 py-1',
    medium: 'text-base px-3 py-2',
    large: 'text-lg px-4 py-3'
  };

  const currentSizeClass = sizeClasses[size];

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    fetchStats();
  }, [contentId]);

  // 統計情報を取得
  const fetchStats = async () => {
    try {
      setError(null);
      console.log('📊 統計情報取得開始:', contentId);
      
      const response = await api.getContentActions(contentId);
      console.log('📊 統計情報取得レスポンス:', response);
      
      setStats({
        likes: response.likes || 0,
        dislikes: response.dislikes || 0,
        userRating: response.user_rating
      });
      
    } catch (error: any) {
      console.error('❌ 統計情報取得エラー:', error);
      
      // 404エラーの場合はデフォルト値を設定
      if (error.response?.status === 404) {
        setStats({
          likes: 0,
          dislikes: 0,
          userRating: undefined
        });
      } else {
        setError('統計情報の取得に失敗しました');
      }
    }
  };

  // 評価を送信
  const handleRating = async (rating: number) => {
    if (!isAuthenticated) {
      alert('評価するにはログインが必要です');
      return;
    }

    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 評価送信中...', { contentId, rating });
      
      // 同じ評価を再度クリックした場合は削除として扱う
      if (stats.userRating === rating) {
        console.log('🗑️ 同じ評価なので削除扱い');
        // TODO: 評価削除APIの実装が必要
        // 現在は再評価として扱う
      }

      const response = await api.createOrUpdateRating({
        content_id: contentId,
        value: rating
      });

      console.log('✅ 評価投稿成功:', response);

      // 統計情報を再取得
      await fetchStats();
      
      // コールバック実行
      onRatingChange?.(rating);
      
    } catch (error: any) {
      console.error('❌ 評価投稿エラー:', error);
      
      let errorMessage = '評価の投稿に失敗しました';
      if (error.response?.status === 401) {
        errorMessage = '認証が必要です。再度ログインしてください。';
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // いいね/ディスライクボタンをレンダリング
  const renderLikeButtons = () => {
    return (
      <div className="flex items-center gap-3">
        {/* いいねボタン */}
        <button
          onClick={() => handleRating(1)}
          disabled={isLoading || !isAuthenticated}
          className={`
            flex items-center gap-2 rounded-lg border transition-all duration-200
            ${currentSizeClass}
            ${stats.userRating === 1
              ? 'bg-green-50 border-green-200 text-green-700 shadow-sm'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 
              isAuthenticated ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
          `}
          title={isAuthenticated ? 'いいね' : 'ログインが必要です'}
        >
          <ThumbsUp 
            size={size === 'small' ? 14 : size === 'large' ? 20 : 16} 
            className={stats.userRating === 1 ? 'fill-current' : ''}
          />
          <span className="font-medium">{stats.likes}</span>
        </button>

        {/* ディスライクボタン */}
        <button
          onClick={() => handleRating(0)}
          disabled={isLoading || !isAuthenticated}
          className={`
            flex items-center gap-2 rounded-lg border transition-all duration-200
            ${currentSizeClass}
            ${stats.userRating === 0
              ? 'bg-red-50 border-red-200 text-red-700 shadow-sm'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 
              isAuthenticated ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
          `}
          title={isAuthenticated ? 'ディスライク' : 'ログインが必要です'}
        >
          <ThumbsDown 
            size={size === 'small' ? 14 : size === 'large' ? 20 : 16}
            className={stats.userRating === 0 ? 'fill-current' : ''}
          />
          <span className="font-medium">{stats.dislikes}</span>
        </button>

        {/* ローディング表示 */}
        {isLoading && (
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            更新中...
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rating-component">
      {/* エラー表示 */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* 認証状態の通知 */}
      {!isAuthenticated && (
        <div className="mb-2 text-xs text-gray-500 flex items-center gap-1">
          🔒 評価するにはログインしてください
        </div>
      )}

      {/* 評価ボタン */}
      {mode === 'like' && renderLikeButtons()}

      {/* 統計情報 */}
      {showStats && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            総評価数: {stats.likes + stats.dislikes}件
            {stats.userRating !== undefined && (
              <span className="ml-2">
                (あなた: {stats.userRating === 1 ? '👍 いいね' : '👎 ディスライク'})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Rating;