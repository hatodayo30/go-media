// types/index.ts - 共通の型定義

// ===== 基本エンティティ =====

export interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  role: string;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface Content {
  id: number;
  title: string;
  body: string;
  type: string;
  author?: User;
  category?: Category;
  status: string;
  view_count: number;
  created_at: string;
  updated_at?: string;
  published_at?: string;
}

export interface Comment {
  id: number;
  content?: string; // バックエンドが "body" を返す可能性
  body?: string; // バックエンドが "body" を返す可能性
  author?: User;
  user?: User; // バックエンドが返す可能性のある構造
  content_id: number;
  parent_id?: number;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

export interface Rating {
  id: number;
  user_id: number;
  content_id: number;
  value: number; // 0 = バッド, 1 = いいね
  created_at: string;
  updated_at?: string;
}

// ===== 関連エンティティ =====

export interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
  follower?: User;
  following?: User;
}

export interface SearchResponse {
  contents: Content[];
  users: User[];
}

export interface SearchFilters {
  q?: string;
  query?: string;
  category_id?: number;
  author_id?: number;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface SearchResult {
  contents: Content[];
  users: User[];
  total_count?: number;
  pagination?: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface SearchSuggestion {
  id: number;
  text: string;
  type: "content" | "user" | "tag";
  count?: number;
}

export interface SearchHistory {
  id: number;
  query: string;
  user_id: number;
  created_at: string;
}

export interface PopularKeyword {
  id: number;
  keyword: string;
  count: number;
  trending_score?: number;
}

// フィード関連
export interface FeedParams {
  page?: number;
  limit?: number;
  sort_by?: string;
}

// レーティング関連
export interface AverageRating {
  average: number;
  count: number;
  user_rating?: number;
}

export interface CreateRatingRequest {
  content_id: number;
  value: number;
}

// コンテンツフィルター
export interface ContentFilters {
  page?: number;
  limit?: number;
  category_id?: number;
  author_id?: number;
  type?: string;
  status?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  q?: string;
}

// Content型の拡張フィールド（実際のAPIレスポンスに合わせて）
export interface ExtendedContent extends Content {
  description?: string;
  rating?: number;
  author?: User;
  commentsCount?: number;
  likesCount?: number;
}

// User型の拡張フィールド
export interface ExtendedUser extends User {
  name?: string; // usernameのエイリアス
  postsCount?: number;
}

// データ正規化関数の追加
export function normalizeContent(content: any): Content {
  return {
    id: content.id || 0,
    title: content.title || "無題",
    body: content.body || content.description || "",
    type: content.type || "article",
    author: content.author ? normalizeUser(content.author) : undefined,
    category: content.category || undefined,
    status: content.status || "draft",
    view_count: content.view_count || 0,
    created_at: content.created_at || new Date().toISOString(),
    updated_at: content.updated_at,
    published_at: content.published_at,
  };
}

// ===== 統計・集計型 =====

export interface ContentStats {
  view_count: number;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  average_rating?: number;
}

export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export interface UserActions {
  hasGood: boolean; // いいね状態
  goodId?: number; // いいねID
  hasRated?: boolean;
  userRating?: number;
}

export interface ActionStats {
  goods: number; // いいね数
  bads?: number; // バッド数
  likes?: number; // 旧称（互換性のため）
  dislikes?: number; // 旧称（互換性のため）
}

export interface RatingStats {
  likes: number;
  dislikes: number;
  userRating?: number; // 0 = バッド, 1 = いいね, undefined = 未評価
}

// ===== API関連型 =====

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SearchParams extends PaginationParams {
  query?: string;
  category_id?: number;
  author_id?: number;
  type?: string;
  status?: string;
}

export interface FollowFeedParams extends PaginationParams {
  user_id: number;
}

// ===== リクエスト/レスポンス型 =====

export interface CreateCommentRequest {
  content: string;
  content_id: number;
  parent_id?: number;
}

export interface CreateContentRequest {
  title: string;
  body: string;
  type: string;
  category_id?: number;
  status?: string;
}

export interface UpdateContentRequest extends Partial<CreateContentRequest> {
  id: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  username: string;
  bio?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ===== コンポーネントプロップス型 =====

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ===== 列挙型 =====

export enum ContentType {
  ARTICLE = "article",
  BLOG = "blog",
  NEWS = "news",
  TUTORIAL = "tutorial",
}

export enum ContentStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  MODERATOR = "moderator",
}

export enum RatingValue {
  DISLIKE = 0,
  LIKE = 1,
}

// ===== ユーティリティ型 =====

export type SizeVariant = "small" | "medium" | "large";
export type ModeVariant = "like" | "star";
export type TabType = "followers" | "following";

// ===== 型ガード =====

export function isUser(obj: any): obj is User {
  return obj && typeof obj.id === "number" && typeof obj.username === "string";
}

export function isContent(obj: any): obj is Content {
  return obj && typeof obj.id === "number" && typeof obj.title === "string";
}

export function isComment(obj: any): obj is Comment {
  return obj && typeof obj.id === "number" && (obj.content || obj.body);
}

// ===== データ正規化ユーティリティ =====

export function normalizeComment(comment: any): Comment {
  return {
    ...comment,
    content: comment.content || comment.body || "",
    author: comment.author ||
      comment.user || {
        id: 0,
        username: "不明なユーザー",
        email: "",
        bio: "",
        role: "user",
        created_at: new Date().toISOString(),
      },
  };
}

export function normalizeUser(user: any): User {
  return {
    id: user.id || 0,
    username: user.username || "不明なユーザー",
    email: user.email || "",
    bio: user.bio || "",
    role: user.role || "user",
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at,
  };
}
