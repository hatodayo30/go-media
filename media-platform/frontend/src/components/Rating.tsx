import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { api } from "../services/api";
import { User } from "../types";

interface RatingProps {
  contentId: number;
  mode?: "like" | "star";
  showStats?: boolean;
  size?: "small" | "medium" | "large";
  onRatingChange?: (rating: number) => void;
}

interface RatingStats {
  likes: number;
  dislikes: number;
  userRating?: number; // 0 = バッド, 1 = いいね, undefined = 未評価
}

const Rating: React.FC<RatingProps> = ({
  contentId,
  mode = "like",
  showStats = true,
  size = "medium",
  onRatingChange,
}) => {
  const [stats, setStats] = useState<RatingStats>({
    likes: 0,
    dislikes: 0,
    userRating: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // useMemoでサイズクラスをメモ化
  const sizeClasses = useMemo(
    () => ({
      small: "text-sm px-2 py-1",
      medium: "text-base px-3 py-2",
      large: "text-lg px-4 py-3",
    }),
    []
  );

  const currentSizeClass = sizeClasses[size];

  // useMemoでアイコンサイズをメモ化
  const iconSize = useMemo(() => {
    switch (size) {
      case "small":
        return 14;
      case "large":
        return 20;
      default:
        return 16;
    }
  }, [size]);

  // useCallbackで認証チェックをメモ化
  const checkAuthentication = useCallback(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAuthenticated(true);
        setCurrentUser(user);
        console.log("✅ 認証確認: ユーザーID", user.id);
      } catch (error) {
        console.error("❌ ユーザー情報解析エラー:", error);
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, []);

  // useCallbackでfetchUserRatingをメモ化 - 修正版
  const fetchUserRating = useCallback(async (): Promise<number | undefined> => {
    if (!isAuthenticated || !currentUser) {
      return undefined;
    }

    try {
      console.log(`👤 ユーザー評価取得: ユーザーID ${currentUser.id}`);
      // 修正: 型注釈を削除し、api.tsの戻り値に依存
      const response = await api.getRatingsByUser(currentUser.id.toString());

      if (response.success && response.data) {
        // 現在のコンテンツに対するユーザーの評価を検索
        const userRating = response.data.find(
          (rating) => rating.content_id === contentId
        );

        if (userRating) {
          console.log(`✅ ユーザー評価取得: ${userRating.value}`);
          return userRating.value;
        } else {
          console.log("📭 このコンテンツの評価なし");
          return undefined;
        }
      } else {
        console.warn("⚠️ ユーザー評価データなし:", response.message);
        return undefined;
      }
    } catch (error: any) {
      console.error("❌ ユーザー評価取得エラー:", error);
      if (error.response?.status !== 404) {
        throw error;
      }
      return undefined;
    }
  }, [isAuthenticated, currentUser, contentId]);

  // useCallbackでfetchStatsをメモ化
  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      console.log("📊 統計情報取得開始:", contentId);

      // 統計情報とユーザー評価を並列取得
      const [avgResponse, userRating] = await Promise.all([
        api.getAverageRating(contentId.toString()),
        fetchUserRating(),
      ]);

      console.log("📊 平均評価レスポンス:", avgResponse);

      if (avgResponse.success && avgResponse.data) {
        const avgData = avgResponse.data;

        setStats({
          likes: avgData.count || 0, // AverageRating型のcountフィールドを使用
          dislikes: 0, // 現在のAPIでは区別されていない
          userRating: userRating,
        });

        console.log("✅ 統計情報設定完了:", {
          likes: avgData.count || 0,
          userRating: userRating,
        });
      } else {
        console.warn("⚠️ 統計データなし:", avgResponse.message);
        setStats({
          likes: 0,
          dislikes: 0,
          userRating: userRating,
        });
      }
    } catch (error: any) {
      console.error("❌ 統計情報取得エラー:", error);

      // 404エラーの場合はデフォルト値を設定
      if (error.response?.status === 404) {
        setStats({
          likes: 0,
          dislikes: 0,
          userRating: undefined,
        });
      } else {
        setError("統計情報の取得に失敗しました");
      }
    }
  }, [contentId, fetchUserRating]);

  // useCallbackでhandleRatingをメモ化 - 修正版
  const handleRating = useCallback(
    async (rating: number) => {
      if (!isAuthenticated || !currentUser) {
        alert("評価するにはログインが必要です");
        return;
      }

      if (isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log("🔄 評価送信中...", { contentId, rating });

        // 修正: 型注釈を削除し、api.tsの戻り値に依存
        const response = await api.createOrUpdateRating(contentId, rating);

        if (response.success) {
          console.log("✅ 評価投稿成功:", response);

          // 統計情報を再取得
          await fetchStats();

          // コールバック実行
          onRatingChange?.(rating);
        } else {
          throw new Error(response.message || "評価の投稿に失敗しました");
        }
      } catch (error: any) {
        console.error("❌ 評価投稿エラー:", error);

        let errorMessage = "評価の投稿に失敗しました";

        if (error.response?.status === 401) {
          errorMessage = "認証が必要です。再度ログインしてください。";
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setIsAuthenticated(false);
          setCurrentUser(null);
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        alert(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      isAuthenticated,
      currentUser,
      isLoading,
      contentId,
      fetchStats,
      onRatingChange,
    ]
  );

  // useCallbackでhandleLikeをメモ化
  const handleLike = useCallback(() => {
    handleRating(1);
  }, [handleRating]);

  // useCallbackでhandleDislikeをメモ化
  const handleDislike = useCallback(() => {
    handleRating(0);
  }, [handleRating]);

  // useMemoでボタンの共通スタイルをメモ化
  const getButtonStyle = useCallback(
    (isActive: boolean, colorScheme: "green" | "red") => {
      const baseStyle = `flex items-center gap-2 rounded-lg border transition-all duration-200 ${currentSizeClass}`;

      if (isActive) {
        return `${baseStyle} ${
          colorScheme === "green"
            ? "bg-green-50 border-green-200 text-green-700 shadow-sm"
            : "bg-red-50 border-red-200 text-red-700 shadow-sm"
        }`;
      }

      const disabledStyle = isLoading
        ? "opacity-50 cursor-not-allowed"
        : isAuthenticated
        ? "cursor-pointer hover:bg-gray-50 hover:border-gray-300"
        : "cursor-not-allowed opacity-60";

      return `${baseStyle} bg-white border-gray-200 text-gray-600 ${disabledStyle}`;
    },
    [currentSizeClass, isLoading, isAuthenticated]
  );

  // useCallbackでrenderLikeButtonsをメモ化
  const renderLikeButtons = useCallback(() => {
    return (
      <div className="flex items-center gap-3">
        {/* いいねボタン */}
        <button
          onClick={handleLike}
          disabled={isLoading || !isAuthenticated}
          className={getButtonStyle(stats.userRating === 1, "green")}
          title={isAuthenticated ? "いいね" : "ログインが必要です"}
        >
          <ThumbsUp
            size={iconSize}
            className={stats.userRating === 1 ? "fill-current" : ""}
          />
          <span className="font-medium">{stats.likes}</span>
        </button>

        {/* ディスライクボタン */}
        <button
          onClick={handleDislike}
          disabled={isLoading || !isAuthenticated}
          className={getButtonStyle(stats.userRating === 0, "red")}
          title={isAuthenticated ? "ディスライク" : "ログインが必要です"}
        >
          <ThumbsDown
            size={iconSize}
            className={stats.userRating === 0 ? "fill-current" : ""}
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
  }, [
    handleLike,
    handleDislike,
    isLoading,
    isAuthenticated,
    getButtonStyle,
    stats.userRating,
    stats.likes,
    stats.dislikes,
    iconSize,
  ]);

  // useMemoで総評価数をメモ化
  const totalRatings = useMemo(() => {
    return stats.likes + stats.dislikes;
  }, [stats.likes, stats.dislikes]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
      {mode === "like" && renderLikeButtons()}

      {/* 統計情報 */}
      {showStats && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            総評価数: {totalRatings}件
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="text-xs text-gray-400 mt-1">
              <div>コンテンツID: {contentId}</div>
              <div>ユーザー評価: {stats.userRating ?? "未評価"}</div>
              <div>認証状態: {isAuthenticated ? "✅" : "❌"}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Rating;
