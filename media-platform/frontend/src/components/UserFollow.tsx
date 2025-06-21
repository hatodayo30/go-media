import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { Follow, FollowStats, User, ApiResponse } from "../types";

interface UserFollowProps {
  userId: number;
  currentUserId?: number;
  showActions?: boolean;
}

const UserFollow: React.FC<UserFollowProps> = ({
  userId,
  currentUserId,
  showActions = true,
}) => {
  const [followStats, setFollowStats] = useState<FollowStats>({
    followers_count: 0,
    following_count: 0,
    is_following: false,
    is_followed_by: false,
  });
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"followers" | "following">(
    "followers"
  );
  const [showFollowList, setShowFollowList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useCallbackでfetchFollowStatsをメモ化
  const fetchFollowStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`📊 フォロー統計取得: ユーザーID ${userId}`);

      const response: ApiResponse<FollowStats> = await api.getFollowStats(
        userId,
        currentUserId
      );

      if (response.success && response.data) {
        setFollowStats(response.data);
        console.log("✅ フォロー統計取得成功:", response.data);
      } else {
        console.error("❌ フォロー統計取得失敗:", response.message);
        setError(response.message || "フォロー統計の取得に失敗しました");
      }
    } catch (error: any) {
      console.error("❌ フォロー統計取得エラー:", error);
      setError("フォロー統計の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [userId, currentUserId]);

  // useCallbackでfetchFollowersをメモ化
  const fetchFollowers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`👥 フォロワー一覧取得: ユーザーID ${userId}`);

      const response: ApiResponse<User[]> = await api.getFollowers(userId);

      if (response.success && response.data) {
        setFollowers(response.data);
        console.log(`✅ フォロワー一覧取得成功: ${response.data.length}人`);
      } else {
        console.error("❌ フォロワー一覧取得失敗:", response.message);
        setError(response.message || "フォロワー一覧の取得に失敗しました");
        setFollowers([]);
      }
    } catch (error: any) {
      console.error("❌ フォロワー一覧取得エラー:", error);
      setError("フォロワー一覧の取得に失敗しました");
      setFollowers([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // useCallbackでfetchFollowingをメモ化
  const fetchFollowing = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`➡️ フォロー中一覧取得: ユーザーID ${userId}`);

      const response: ApiResponse<User[]> = await api.getFollowing(userId);

      if (response.success && response.data) {
        setFollowing(response.data);
        console.log(`✅ フォロー中一覧取得成功: ${response.data.length}人`);
      } else {
        console.error("❌ フォロー中一覧取得失敗:", response.message);
        setError(response.message || "フォロー中一覧の取得に失敗しました");
        setFollowing([]);
      }
    } catch (error: any) {
      console.error("❌ フォロー中一覧取得エラー:", error);
      setError("フォロー中一覧の取得に失敗しました");
      setFollowing([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // useCallbackでhandleFollowをメモ化
  const handleFollow = useCallback(async () => {
    if (!currentUserId || currentUserId === userId || followLoading) return;

    try {
      setFollowLoading(true);
      setError(null);

      if (followStats.is_following) {
        console.log(`🚫 アンフォロー実行: ユーザーID ${userId}`);
        const response: ApiResponse<void> = await api.unfollowUser(userId);

        if (response.success) {
          setFollowStats((prev) => ({
            ...prev,
            is_following: false,
            followers_count: Math.max(0, prev.followers_count - 1),
          }));
          console.log("✅ アンフォロー成功");
        } else {
          throw new Error(response.message || "アンフォローに失敗しました");
        }
      } else {
        console.log(`➕ フォロー実行: ユーザーID ${userId}`);
        const response: ApiResponse<Follow> = await api.followUser(userId);

        if (response.success) {
          setFollowStats((prev) => ({
            ...prev,
            is_following: true,
            followers_count: prev.followers_count + 1,
          }));
          console.log("✅ フォロー成功");
        } else {
          throw new Error(response.message || "フォローに失敗しました");
        }
      }
    } catch (error: any) {
      console.error("❌ フォロー操作エラー:", error);
      setError(error.message || "フォロー操作に失敗しました");
    } finally {
      setFollowLoading(false);
    }
  }, [currentUserId, userId, followLoading, followStats.is_following]);

  // useCallbackでhandleShowFollowListをメモ化
  const handleShowFollowList = useCallback(
    (tab: "followers" | "following") => {
      setActiveTab(tab);
      setShowFollowList(true);
      setError(null);

      if (tab === "followers") {
        fetchFollowers();
      } else {
        fetchFollowing();
      }
    },
    [fetchFollowers, fetchFollowing]
  );

  // useCallbackでhandleCloseModalをメモ化
  const handleCloseModal = useCallback(() => {
    setShowFollowList(false);
    setError(null);
  }, []);

  // useCallbackでhandleTabChangeをメモ化
  const handleTabChange = useCallback(
    (tab: "followers" | "following") => {
      setActiveTab(tab);
      setError(null);

      if (tab === "followers") {
        fetchFollowers();
      } else {
        fetchFollowing();
      }
    },
    [fetchFollowers, fetchFollowing]
  );

  // useCallbackでhandleUserFollowをメモ化
  const handleUserFollow = useCallback(
    async (targetUserId: number, isCurrentlyFollowing: boolean) => {
      if (!currentUserId) return;

      try {
        setError(null);

        if (isCurrentlyFollowing) {
          const response: ApiResponse<void> = await api.unfollowUser(
            targetUserId
          );
          if (!response.success) {
            throw new Error(response.message || "アンフォローに失敗しました");
          }
        } else {
          const response: ApiResponse<Follow> = await api.followUser(
            targetUserId
          );
          if (!response.success) {
            throw new Error(response.message || "フォローに失敗しました");
          }
        }

        // リストを再取得
        if (activeTab === "followers") {
          fetchFollowers();
        } else {
          fetchFollowing();
        }
      } catch (error: any) {
        console.error("❌ ユーザーフォロー操作エラー:", error);
        setError(error.message || "フォロー操作に失敗しました");
      }
    },
    [currentUserId, activeTab, fetchFollowers, fetchFollowing]
  );

  // useCallbackでrenderUserListをメモ化
  const renderUserList = useCallback(() => {
    const users = activeTab === "followers" ? followers : following;

    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          📡 読み込み中...
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
          {activeTab === "followers"
            ? "📭 まだフォロワーがいません"
            : "📭 まだ誰もフォローしていません"}
        </div>
      );
    }

    return (
      <div>
        {users.map((user) => (
          <UserListItem
            key={user.id}
            user={user}
            currentUserId={currentUserId}
            onFollowChange={handleUserFollow}
          />
        ))}
      </div>
    );
  }, [
    activeTab,
    followers,
    following,
    loading,
    currentUserId,
    handleUserFollow,
  ]);

  // useMemoでisOwnProfileをメモ化
  const isOwnProfile = useMemo(() => {
    return currentUserId === userId;
  }, [currentUserId, userId]);

  // useMemoでshowFollowButtonをメモ化
  const showFollowButton = useMemo(() => {
    return showActions && currentUserId && !isOwnProfile;
  }, [showActions, currentUserId, isOwnProfile]);

  useEffect(() => {
    fetchFollowStats();
  }, [fetchFollowStats]);

  if (loading && !showFollowList) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div>📡 読み込み中...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      {/* エラー表示 */}
      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            padding: "0.75rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* フォロー統計表示 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "1rem",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          marginBottom: "1rem",
        }}
      >
        {/* フォロワー数 */}
        <FollowStatButton
          count={followStats.followers_count}
          label="👥 フォロワー"
          onClick={() => handleShowFollowList("followers")}
        />

        {/* フォロー中数 */}
        <FollowStatButton
          count={followStats.following_count}
          label="➡️ フォロー中"
          onClick={() => handleShowFollowList("following")}
        />

        {/* フォローボタン */}
        {showFollowButton && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            style={{
              marginLeft: "auto",
              backgroundColor: followStats.is_following ? "#ef4444" : "#3b82f6",
              color: "white",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "6px",
              cursor: followLoading ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
              opacity: followLoading ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            {followLoading
              ? "⏳ 処理中..."
              : followStats.is_following
              ? "🚫 アンフォロー"
              : "➕ フォロー"}
          </button>
        )}
      </div>

      {/* フォロー一覧モーダル */}
      {showFollowList && (
        <FollowListModal
          activeTab={activeTab}
          followStats={followStats}
          onClose={handleCloseModal}
          onTabChange={handleTabChange}
          renderUserList={renderUserList}
        />
      )}
    </div>
  );
};

// フォロー統計ボタンコンポーネント
interface FollowStatButtonProps {
  count: number;
  label: string;
  onClick: () => void;
}

const FollowStatButton: React.FC<FollowStatButtonProps> = React.memo(
  ({ count, label, onClick }) => {
    const [isHover, setIsHover] = useState(false);

    return (
      <button
        onClick={onClick}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "center",
          padding: "0.5rem",
          borderRadius: "6px",
          transition: "background-color 0.2s",
          backgroundColor: isHover ? "#f3f4f6" : "transparent",
        }}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        <div
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            color: "#1f2937",
          }}
        >
          {count}
        </div>
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{label}</div>
      </button>
    );
  }
);

// ユーザーリストアイテムコンポーネント
interface UserListItemProps {
  user: User;
  currentUserId?: number;
  onFollowChange: (userId: number, isFollowing: boolean) => void;
}

const UserListItem: React.FC<UserListItemProps> = React.memo(
  ({ user, currentUserId, onFollowChange }) => {
    const [isHover, setIsHover] = useState(false);

    const truncatedBio = useMemo(() => {
      if (!user.bio) return "";
      return user.bio.length > 50
        ? `${user.bio.substring(0, 50)}...`
        : user.bio;
    }, [user.bio]);

    const showFollowButton = useMemo(() => {
      return currentUserId && currentUserId !== user.id;
    }, [currentUserId, user.id]);

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0.75rem",
          borderBottom: "1px solid #f3f4f6",
          transition: "background-color 0.2s",
          backgroundColor: isHover ? "#f9fafb" : "transparent",
        }}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        <div style={{ flex: 1 }}>
          <Link
            to={`/users/${user.id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontWeight: "500", color: "#1f2937" }}>
              {user.username}
            </div>
            {truncatedBio && (
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginTop: "0.25rem",
                }}
              >
                {truncatedBio}
              </div>
            )}
          </Link>
        </div>

        {/* フォローボタン（自分以外） */}
        {showFollowButton && (
          <FollowButton
            userId={user.id}
            currentUserId={currentUserId!}
            onFollowChange={onFollowChange}
          />
        )}
      </div>
    );
  }
);

// フォロー一覧モーダルコンポーネント
interface FollowListModalProps {
  activeTab: "followers" | "following";
  followStats: FollowStats;
  onClose: () => void;
  onTabChange: (tab: "followers" | "following") => void;
  renderUserList: () => React.ReactNode;
}

const FollowListModal: React.FC<FollowListModalProps> = React.memo(
  ({ activeTab, followStats, onClose, onTabChange, renderUserList }) => {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "1.5rem",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "80vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ヘッダー */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: "1rem",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>
              {activeTab === "followers" ? "👥 フォロワー" : "➡️ フォロー中"}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#6b7280",
              }}
            >
              ✕
            </button>
          </div>

          {/* タブ */}
          <div
            style={{
              display: "flex",
              marginBottom: "1rem",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <button
              onClick={() => onTabChange("followers")}
              style={{
                flex: 1,
                padding: "0.75rem",
                border: "none",
                backgroundColor:
                  activeTab === "followers" ? "#3b82f6" : "transparent",
                color: activeTab === "followers" ? "white" : "#6b7280",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              フォロワー ({followStats.followers_count})
            </button>
            <button
              onClick={() => onTabChange("following")}
              style={{
                flex: 1,
                padding: "0.75rem",
                border: "none",
                backgroundColor:
                  activeTab === "following" ? "#3b82f6" : "transparent",
                color: activeTab === "following" ? "white" : "#6b7280",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              フォロー中 ({followStats.following_count})
            </button>
          </div>

          {/* ユーザーリスト */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              maxHeight: "400px",
            }}
          >
            {renderUserList()}
          </div>
        </div>
      </div>
    );
  }
);

// フォローボタンコンポーネント
interface FollowButtonProps {
  userId: number;
  currentUserId: number;
  onFollowChange: (userId: number, isFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  currentUserId,
  onFollowChange,
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  // useCallbackでcheckFollowStatusをメモ化
  const checkFollowStatus = useCallback(async () => {
    try {
      const response: ApiResponse<FollowStats> = await api.getFollowStats(
        userId,
        currentUserId
      );
      if (response.success && response.data) {
        setIsFollowing(response.data.is_following);
      }
    } catch (error) {
      console.error("フォロー状態の確認に失敗しました:", error);
    }
  }, [userId, currentUserId]);

  // useCallbackでhandleFollowをメモ化
  const handleFollow = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);

      if (isFollowing) {
        const response: ApiResponse<void> = await api.unfollowUser(userId);
        if (response.success) {
          setIsFollowing(false);
          onFollowChange(userId, false);
        }
      } else {
        const response: ApiResponse<Follow> = await api.followUser(userId);
        if (response.success) {
          setIsFollowing(true);
          onFollowChange(userId, true);
        }
      }
    } catch (error) {
      console.error("フォロー操作に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, isFollowing, userId, onFollowChange]);

  useEffect(() => {
    checkFollowStatus();
  }, [checkFollowStatus]);

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      style={{
        backgroundColor: isFollowing ? "#ef4444" : "#3b82f6",
        color: "white",
        border: "none",
        padding: "0.5rem 1rem",
        borderRadius: "6px",
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: "0.75rem",
        fontWeight: "500",
        opacity: loading ? 0.7 : 1,
        transition: "all 0.2s",
      }}
    >
      {loading ? "⏳" : isFollowing ? "アンフォロー" : "フォロー"}
    </button>
  );
};

export default UserFollow;
