import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";

interface Content {
  id: number;
  title: string;
  content?: string;
  body?: string;
  status: string;
  category_id: number;
  author_id: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  category?: {
    id: number;
    name: string;
  };
  author?: {
    id: number;
    username: string;
  };
}

interface Rating {
  id: number;
  user_id: number;
  content_id: number;
  value: number;
  created_at: string;
  content?: Content;
}

type TabType = "my-posts" | "good"; // 'liked' → 'good' に変更、'bookmarked' 削除

const MyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("my-posts");
  const [myPosts, setMyPosts] = useState<Content[]>([]);
  const [goodContents, setGoodContents] = useState<Content[]>([]); // likedContents → goodContents
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const navigate = useNavigate();

  // useCallbackを使用してfetchMyPostsをメモ化
  const fetchMyPosts = useCallback(async () => {
    console.log("📥 マイ投稿を取得中...");

    try {
      // 現在のユーザー情報を取得
      const userResponse = await api.getCurrentUser();
      console.log("👤 ユーザー情報:", userResponse);

      // 🚨 デバッグ: レスポンス構造を詳細に確認
      console.log("🔍 userResponse.data:", userResponse.data);
      console.log("🔍 userResponse.data.user:", userResponse.data?.user);
      console.log("🔍 typeof userResponse.data:", typeof userResponse.data);

      // レスポンス構造: {data: {user: {...}}, status: 'success'}
      const currentUser =
        userResponse.data?.user ||
        userResponse.user ||
        userResponse.data ||
        userResponse;
      const currentUserId = currentUser?.id;

      console.log("🔍 抽出されたユーザー:", currentUser);
      console.log("🔍 抽出されたユーザーID:", currentUserId);
      console.log("🔍 typeof currentUserId:", typeof currentUserId);

      if (!currentUserId) {
        console.error(
          "❌ ユーザーID抽出失敗. 完全なレスポンス:",
          JSON.stringify(userResponse, null, 2)
        );
        throw new Error("ユーザーIDを取得できませんでした");
      }

      // 全コンテンツを取得
      const response = await api.getContents();
      console.log("📝 全コンテンツレスポンス:", response);

      const allContents = response.data?.contents || response.contents || [];

      // 現在のユーザーが作成したコンテンツのみフィルタリング
      const myContents = allContents.filter((content: Content) => {
        console.log(
          `🔍 コンテンツフィルタ: ID=${content.id}, author_id=${
            content.author_id
          }, currentUserId=${currentUserId}, match=${
            content.author_id === currentUserId
          }`
        );
        return content.author_id === currentUserId;
      });

      setMyPosts(myContents);
      console.log(
        `📋 マイ投稿数: ${myContents.length} (全体: ${allContents.length})`
      );
    } catch (error) {
      console.error("❌ マイ投稿取得エラー:", error);
      setMyPosts([]);
      throw error;
    }
  }, []); // 依存関係なし

  // useCallbackを使用してfetchGoodContentsをメモ化
  const fetchGoodContents = useCallback(async () => {
    console.log("👍 グッドした記事を取得中...");

    try {
      // 現在のユーザー情報を取得
      const userResponse = await api.getCurrentUser();
      console.log("👤 GOOD用ユーザー情報レスポンス:", userResponse);

      // 🔧 正しいユーザーID抽出方法
      const currentUser =
        userResponse.data?.user ||
        userResponse.user ||
        userResponse.data ||
        userResponse;
      const userId = currentUser?.id;

      console.log("🔍 GOOD用抽出されたユーザー:", currentUser);
      console.log("🔍 GOOD用抽出されたユーザーID:", userId);
      console.log("🔍 typeof userId:", typeof userId);

      if (!userId) {
        console.error(
          "❌ GOOD用ユーザーIDが見つかりません. 完全なレスポンス:",
          JSON.stringify(userResponse, null, 2)
        );
        throw new Error("ユーザー情報を取得できませんでした");
      }

      // ユーザーの評価一覧を取得
      console.log(`📊 ユーザーID ${userId} の評価を取得中...`);
      const ratingsResponse = await api.getRatingsByUser(userId.toString());
      console.log("📊 ユーザー評価レスポンス:", ratingsResponse);

      const ratings =
        ratingsResponse.data?.ratings || ratingsResponse.ratings || [];
      console.log("📊 評価一覧:", ratings);
      console.log("📊 評価一覧の長さ:", ratings.length);

      // グッド（value = 1）のみをフィルター
      const goodRatings = ratings.filter((rating: Rating) => {
        console.log(
          `🔍 評価チェック: ID=${rating.id}, value=${rating.value}, content_id=${rating.content_id}, user_id=${rating.user_id}`
        );
        return rating.value === 1;
      });

      console.log("👍 グッド評価:", goodRatings);
      console.log("👍 グッド評価の数:", goodRatings.length);

      if (goodRatings.length === 0) {
        console.log("📭 グッドした記事はありません");
        setGoodContents([]);
        return;
      }

      // 各グッドに対応するコンテンツを取得
      const goodContentsPromises = goodRatings.map(async (rating: Rating) => {
        try {
          console.log(`📄 コンテンツ ${rating.content_id} を取得中...`);
          const contentResponse = await api.getContentById(
            rating.content_id.toString()
          );
          console.log(
            `📄 コンテンツ ${rating.content_id} レスポンス:`,
            contentResponse
          );

          const content =
            contentResponse.data?.content ||
            contentResponse.content ||
            contentResponse;
          console.log(`📄 コンテンツ ${rating.content_id} データ:`, content);
          return content;
        } catch (error) {
          console.error(
            `❌ コンテンツ ${rating.content_id} の取得に失敗:`,
            error
          );
          return null;
        }
      });

      const goodContentsResults = await Promise.all(goodContentsPromises);
      const validGoodContents = goodContentsResults.filter(
        (content) => content !== null
      );

      setGoodContents(validGoodContents);
      console.log(`✅ グッドした記事数: ${validGoodContents.length}`);
    } catch (error) {
      console.error("❌ グッドした記事の取得エラー:", error);
      setGoodContents([]);
      throw error;
    }
  }, []); // 依存関係なし

  // useCallbackを使用してfetchDataをメモ化
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (activeTab === "my-posts") {
        await fetchMyPosts();
      } else if (activeTab === "good") {
        await fetchGoodContents();
      }
    } catch (err: any) {
      console.error("❌ データ取得エラー:", err);
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchMyPosts, fetchGoodContents]); // activeTabと関数に依存

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchDataを依存配列に含める

  // useCallbackを使用してhandleDeleteをメモ化
  const handleDelete = useCallback(
    async (id: number) => {
      if (!window.confirm("この投稿を削除しますか？")) {
        return;
      }

      try {
        console.log(`🗑️ コンテンツ ${id} を削除中...`);
        await api.deleteContent(id.toString());
        console.log("✅ 削除完了");

        // 成功後、投稿一覧を更新
        await fetchMyPosts();
        alert("投稿を削除しました");
      } catch (err: any) {
        console.error("❌ 削除エラー:", err);
        alert("削除に失敗しました");
      }
    },
    [fetchMyPosts]
  ); // fetchMyPostsに依存

  // useCallbackを使用してhandleStatusChangeをメモ化
  const handleStatusChange = useCallback(
    async (id: number, newStatus: string) => {
      try {
        console.log(
          `🔄 コンテンツ ${id} のステータスを ${newStatus} に変更中...`
        );
        await api.updateContentStatus(id.toString(), newStatus);
        console.log("✅ ステータス変更完了");

        // 成功後、投稿一覧を更新
        await fetchMyPosts();
        alert(
          `投稿を${newStatus === "published" ? "公開" : "下書き"}にしました`
        );
      } catch (err: any) {
        console.error("❌ ステータス変更エラー:", err);
        alert("ステータスの変更に失敗しました");
      }
    },
    [fetchMyPosts]
  ); // fetchMyPostsに依存

  // useCallbackを使用してhandleEditをメモ化
  const handleEdit = useCallback(
    (id: number) => {
      navigate(`/edit/${id}`);
    },
    [navigate]
  ); // navigateに依存

  // useCallbackを使用してformatDateをメモ化
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []); // 純粋関数なので依存関係なし

  // useCallbackを使用してgetStatusColorをメモ化
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "published":
        return { bg: "#dcfce7", color: "#15803d", text: "公開中" };
      case "draft":
        return { bg: "#fef3c7", color: "#92400e", text: "下書き" };
      default:
        return { bg: "#f3f4f6", color: "#6b7280", text: status };
    }
  }, []); // 純粋関数なので依存関係なし

  // useCallbackを使用してgetTabInfoをメモ化
  const getTabInfo = useCallback(
    (tab: TabType) => {
      switch (tab) {
        case "my-posts":
          return {
            title: "マイ投稿",
            icon: "📄",
            description: "自分が作成した記事一覧",
            count: myPosts.length,
          };
        case "good":
          return {
            title: "グッドした記事",
            icon: "👍",
            description: "グッドした記事一覧",
            count: goodContents.length,
          };
      }
    },
    [myPosts.length, goodContents.length]
  ); // データの長さに依存

  // useCallbackを使用してhandleTabChangeをメモ化
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []); // 依存関係なし

  // useCallbackを使用してhandleFilterChangeをメモ化
  const handleFilterChange = useCallback(
    (newFilter: "all" | "published" | "draft") => {
      setFilter(newFilter);
    },
    []
  ); // 依存関係なし

  // メモ化されたフィルタリングロジック
  const filteredPosts = React.useMemo(() => {
    return activeTab === "my-posts"
      ? myPosts.filter((post) => {
          if (filter === "all") return true;
          return post.status === filter;
        })
      : [];
  }, [activeTab, myPosts, filter]);

  // メモ化された現在のコンテンツ取得
  const getCurrentContents = useCallback(() => {
    switch (activeTab) {
      case "my-posts":
        return filteredPosts;
      case "good":
        return goodContents;
      default:
        return [];
    }
  }, [activeTab, filteredPosts, goodContents]);

  // useCallbackを使用してrenderContentCardをメモ化
  const renderContentCard = useCallback(
    (content: Content, showAuthor: boolean = false) => {
      const statusInfo = getStatusColor(content.status);

      return (
        <div
          key={content.id}
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "0.75rem",
                }}
              >
                <Link
                  to={`/contents/${content.id}`}
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    margin: 0,
                    color: "#374151",
                    textDecoration: "none",
                  }}
                >
                  {content.title}
                </Link>
                {activeTab === "my-posts" && (
                  <span
                    style={{
                      backgroundColor: statusInfo.bg,
                      color: statusInfo.color,
                      padding: "0.25rem 0.75rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: "500",
                    }}
                  >
                    {statusInfo.text}
                  </span>
                )}
              </div>

              <div
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  marginBottom: "0.75rem",
                  display: "flex",
                  gap: "1rem",
                }}
              >
                <span>📅 {formatDate(content.updated_at)}</span>
                {showAuthor && content.author && (
                  <span>✍️ {content.author.username}</span>
                )}
                <span>👁️ {content.view_count} 回閲覧</span>
              </div>

              {/* コンテンツのプレビュー */}
              <div
                style={{
                  color: "#374151",
                  fontSize: "0.875rem",
                  lineHeight: "1.5",
                  marginBottom: "1rem",
                }}
              >
                {(content.content || content.body || "").substring(0, 150)}
                {(content.content || content.body || "").length > 150 && "..."}
              </div>
            </div>

            {/* アクションボタン（マイ投稿のみ） */}
            {activeTab === "my-posts" && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginLeft: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => handleEdit(content.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  ✏️ 編集
                </button>

                {content.status === "draft" ? (
                  <button
                    onClick={() => handleStatusChange(content.id, "published")}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    🚀 公開
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(content.id, "draft")}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#f59e0b",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    📝 下書きに戻す
                  </button>
                )}

                <button
                  onClick={() => handleDelete(content.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  🗑️ 削除
                </button>
              </div>
            )}
          </div>
        </div>
      );
    },
    [
      activeTab,
      getStatusColor,
      formatDate,
      handleEdit,
      handleStatusChange,
      handleDelete,
    ]
  );

  if (loading) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          minHeight: "50vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>読み込み中...</div>
      </div>
    );
  }

  const currentTabInfo = getTabInfo(activeTab);
  const currentContents = getCurrentContents();

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            margin: 0,
            color: "#374151",
          }}
        >
          👤 マイページ
        </h1>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link
            to="/dashboard"
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#6b7280",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            ダッシュボードに戻る
          </Link>
          <Link
            to="/create"
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#3b82f6",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            新規投稿
          </Link>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex" }}>
          {(["my-posts", "good"] as TabType[]).map((tab) => {
            const tabInfo = getTabInfo(tab);
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                style={{
                  flex: 1,
                  padding: "1rem 1.5rem",
                  border: "none",
                  backgroundColor: isActive ? "#3b82f6" : "transparent",
                  color: isActive ? "white" : "#374151",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                  borderBottom: isActive ? "none" : "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>{tabInfo.icon}</span>
                  <span>{tabInfo.title}</span>
                  <span
                    style={{
                      fontSize: "0.875rem",
                      padding: "0.125rem 0.5rem",
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.2)"
                        : "#f3f4f6",
                      borderRadius: "9999px",
                    }}
                  >
                    {tabInfo.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* フィルター（マイ投稿タブのみ） */}
      {activeTab === "my-posts" && (
        <div
          style={{
            backgroundColor: "white",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span style={{ fontWeight: "500", color: "#374151" }}>
              フィルター:
            </span>
            {(["all", "published", "draft"] as const).map((filterType) => (
              <button
                key={filterType}
                onClick={() => handleFilterChange(filterType)}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  backgroundColor: filter === filterType ? "#3b82f6" : "white",
                  color: filter === filterType ? "white" : "#374151",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                {filterType === "all"
                  ? "すべて"
                  : filterType === "published"
                  ? "公開中"
                  : "下書き"}
                {filterType === "all" && ` (${myPosts.length})`}
                {filterType === "published" &&
                  ` (${
                    myPosts.filter((p) => p.status === "published").length
                  })`}
                {filterType === "draft" &&
                  ` (${myPosts.filter((p) => p.status === "draft").length})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #fca5a5",
            color: "#dc2626",
            padding: "1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* コンテンツ一覧 */}
      {currentContents.length === 0 ? (
        <div
          style={{
            backgroundColor: "white",
            padding: "3rem",
            borderRadius: "8px",
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
            {currentTabInfo.icon}
          </div>
          <h3
            style={{
              fontSize: "1.25rem",
              marginBottom: "0.5rem",
              color: "#374151",
            }}
          >
            {currentTabInfo.title}がありません
          </h3>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            {currentTabInfo.description}
          </p>
          {activeTab === "my-posts" && (
            <Link
              to="/create"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                textDecoration: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              新規投稿を作成
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {currentContents.map((content) =>
            renderContentCard(content, activeTab !== "my-posts")
          )}
        </div>
      )}
    </div>
  );
};

export default MyPage;
