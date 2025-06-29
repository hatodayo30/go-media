import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";
import {
  ApiResponse,
  Rating,
  AverageRating,
  User,
  RatingsApiResponse,
} from "../types";

interface ContentActionsProps {
  contentId: number;
  size?: "small" | "medium" | "large";
  showCounts?: boolean;
}

interface ActionStats {
  goods: number;
}

interface UserActions {
  hasGood: boolean;
  goodId?: number;
}

// エラー型の定義
interface ApiError {
  response?: {
    status: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const ContentActions: React.FC<ContentActionsProps> = ({
  contentId,
  size = "medium",
  showCounts = true,
}) => {
  const [stats, setStats] = useState<ActionStats>({
    goods: 0,
  });
  const [userActions, setUserActions] = useState<UserActions>({
    hasGood: false,
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useCallbackでcheckAuthenticationをメモ化
  const checkAuthentication = useCallback(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
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

  // useCallbackでfetchStatsをメモ化
  const fetchStats = useCallback(async () => {
    try {
      console.log(`📊 統計取得: コンテンツID ${contentId}`);
      const response: ApiResponse<AverageRating> = await api.getAverageRating(
        contentId.toString()
      );

      if (response.success && response.data) {
        const count = response.data.count || 0;
        setStats({ goods: count });
        console.log(`✅ 統計取得成功: グッド数 ${count}`);
      } else {
        console.warn("⚠️ 統計データなし:", response.message);
        setStats({ goods: 0 });
      }
    } catch (error) {
      console.error("❌ 統計取得エラー:", error);
      const apiError = error as ApiError;
      if (apiError.response?.status !== 404) {
        throw error; // 404以外のエラーは上位に投げる
      }
      setStats({ goods: 0 });
    }
  }, [contentId]);

  // useCallbackでfetchUserActionsをメモ化
  const fetchUserActions = useCallback(async () => {
    if (!isAuthenticated || !currentUser) {
      setUserActions({ hasGood: false });
      return;
    }

    try {
      console.log(`👤 ユーザー評価取得: ユーザーID ${currentUser.id}`);
      const response: ApiResponse<RatingsApiResponse> =
        await api.getRatingsByUser(currentUser.id.toString());

      if (response.success && response.data) {
        // RatingsApiResponse構造に対応した型安全な処理
        let ratingsData: Rating[] = [];

        if (response.data.ratings && Array.isArray(response.data.ratings)) {
          // RatingsApiResponse構造の場合: { ratings: Rating[] }
          ratingsData = response.data.ratings;
        } else {
          console.warn("⚠️ 予期しない評価データ構造:", response.data);
          ratingsData = [];
        }

        // 現在のコンテンツに対するユーザーの評価を検索
        const userRating = ratingsData.find(
          (rating: Rating) =>
            rating.content_id === contentId && rating.value === 1
        );

        setUserActions({
          hasGood: !!userRating,
          goodId: userRating?.id,
        });

        console.log(`✅ ユーザー評価: ${userRating ? "グッド済み" : "未評価"}`);
      } else {
        console.warn("⚠️ ユーザー評価データなし:", response.message);
        setUserActions({ hasGood: false });
      }
    } catch (error) {
      console.error("❌ ユーザー評価取得エラー:", error);
      const apiError = error as ApiError;
      if (apiError.response?.status !== 404) {
        throw error;
      }
      setUserActions({ hasGood: false });
    }
  }, [isAuthenticated, currentUser, contentId]);

  // useCallbackでfetchActionsをメモ化（全データ取得）
  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🎯 評価データ取得開始: コンテンツID ${contentId}`);

      await Promise.all([fetchStats(), fetchUserActions()]);

      console.log("✅ 全評価データ取得完了");
    } catch (error) {
      console.error("❌ 評価データ取得エラー:", error);
      const apiError = error as ApiError;

      if (apiError.response?.status === 404) {
        // データがない場合は正常
        setStats({ goods: 0 });
        setUserActions({ hasGood: false });
      } else {
        setError("評価データの取得に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  }, [contentId, fetchStats, fetchUserActions]);

  // useCallbackでhandleGoodをメモ化
  const handleGood = useCallback(async () => {
    if (!isAuthenticated || !currentUser) {
      alert("評価するにはログインが必要です");
      return;
    }

    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      console.log("👍 グッド処理開始");

      if (userActions.hasGood) {
        // グッドを取り消し
        if (userActions.goodId) {
          console.log("❌ グッド取り消し:", userActions.goodId);
          const response: ApiResponse<void> = await api.deleteRating(
            userActions.goodId.toString()
          );

          if (response.success) {
            console.log("✅ グッド取り消し成功");
          } else {
            throw new Error(
              response.message || "グッドの取り消しに失敗しました"
            );
          }
        }
      } else {
        // グッドを追加
        console.log("➕ グッド追加");
        const response: ApiResponse<Rating> = await api.createOrUpdateRating(
          contentId,
          1
        );

        if (response.success) {
          console.log("✅ グッド追加成功");
        } else {
          throw new Error(response.message || "グッドの追加に失敗しました");
        }
      }

      // データを再取得
      await fetchActions();
    } catch (error) {
      console.error("❌ グッドエラー:", error);
      const apiError = error as ApiError;
      const errorMessage = apiError.message || "グッドの処理に失敗しました";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [
    isAuthenticated,
    currentUser,
    submitting,
    userActions.hasGood,
    userActions.goodId,
    contentId,
    fetchActions,
  ]);

  // useCallbackでhandleAuthRequiredActionをメモ化
  const handleAuthRequiredAction = useCallback(() => {
    if (!isAuthenticated) {
      alert("この機能を使用するにはログインが必要です");
      return;
    }
    handleGood();
  }, [isAuthenticated, handleGood]);

  // useMemoでサイズスタイルをメモ化
  const sizeStyles = useMemo(() => {
    const sizes = {
      small: {
        fontSize: "0.875rem",
        padding: "0.375rem 0.75rem",
        gap: "0.5rem",
        iconSize: "1rem",
      },
      medium: {
        fontSize: "1rem",
        padding: "0.5rem 1rem",
        gap: "0.75rem",
        iconSize: "1.25rem",
      },
      large: {
        fontSize: "1.125rem",
        padding: "0.75rem 1.25rem",
        gap: "1rem",
        iconSize: "1.5rem",
      },
    } as const;
    return sizes[size];
  }, [size]);

  // useMemoでボタンスタイルをメモ化
  const buttonStyle = useMemo(
    () => ({
      display: "flex",
      alignItems: "center",
      gap: "0.375rem",
      padding: sizeStyles.padding,
      backgroundColor: userActions.hasGood ? "#dcfce7" : "transparent",
      color: userActions.hasGood ? "#059669" : "#6b7280",
      border: `1px solid ${userActions.hasGood ? "#059669" : "#d1d5db"}`,
      borderRadius: "8px",
      fontSize: sizeStyles.fontSize,
      cursor: isAuthenticated ? "pointer" : "not-allowed",
      opacity: submitting ? 0.6 : 1,
      transition: "all 0.2s ease",
      fontWeight: userActions.hasGood ? "600" : "400",
    }),
    [sizeStyles, userActions.hasGood, isAuthenticated, submitting]
  );

  // useMemoでボタンタイトルをメモ化
  const buttonTitle = useMemo(() => {
    if (!isAuthenticated) return "ログインが必要です";
    if (submitting) return "処理中...";
    return userActions.hasGood ? "グッドを取り消す" : "グッドする";
  }, [isAuthenticated, submitting, userActions.hasGood]);

  // useMemoでアイコンをメモ化
  const goodIcon = useMemo(() => {
    return userActions.hasGood ? "👍" : "🤍";
  }, [userActions.hasGood]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          gap: sizeStyles.gap,
          alignItems: "center",
          fontSize: sizeStyles.fontSize,
          padding: "1rem",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          backgroundColor: "white",
          justifyContent: "center",
        }}
      >
        <span>📊</span>
        <span>読み込み中...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        backgroundColor: "white",
      }}
    >
      {/* エラー表示 */}
      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            padding: "0.5rem",
            borderRadius: "4px",
            marginBottom: "0.75rem",
            fontSize: "0.875rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* グッドボタン */}
      <div
        style={{
          display: "flex",
          gap: sizeStyles.gap,
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleAuthRequiredAction}
          disabled={submitting}
          style={buttonStyle}
          title={buttonTitle}
        >
          <span style={{ fontSize: sizeStyles.iconSize }}>{goodIcon}</span>
          {showCounts && <span>{stats.goods}</span>}
          <span style={{ fontSize: "0.875em" }}>グッド</span>
        </button>
      </div>

      {/* 認証状態の表示 */}
      {!isAuthenticated && (
        <div
          style={{
            textAlign: "center",
            marginTop: "0.75rem",
            fontSize: "0.75rem",
            color: "#6b7280",
          }}
        >
          🔒 評価するにはログインしてください
        </div>
      )}

      {/* ユーザー状態表示 */}
      {showCounts && isAuthenticated && userActions.hasGood && (
        <div
          style={{
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid #e5e7eb",
            fontSize: "0.75rem",
            color: "#6b7280",
            textAlign: "center",
          }}
        >
          <span>👍 あなたがグッドしました</span>
        </div>
      )}

      {/* デバッグ情報（開発時のみ） */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem",
            backgroundColor: "#f3f4f6",
            borderRadius: "4px",
            fontSize: "0.75rem",
            color: "#6b7280",
          }}
        >
          <div>コンテンツID: {contentId}</div>
          <div>認証状態: {isAuthenticated ? "✅" : "❌"}</div>
          <div>ユーザーID: {currentUser?.id || "なし"}</div>
          <div>グッド状態: {userActions.hasGood ? "✅" : "❌"}</div>
          <div>グッド数: {stats.goods}</div>
        </div>
      )}
    </div>
  );
};

export default ContentActions;
