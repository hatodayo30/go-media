// API レスポンスの基本型
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  success: boolean;
}

// エラーレスポンス型
export interface ApiError {
  error: string;
  message: string;
  status: number;
}

// ユーザー関連の型
export interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  bio?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  bio?: string;
  avatar?: string;
}

// カテゴリ関連の型
export interface Category {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  parent?: Category;
  children?: Category[];
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parent_id?: number;
}

// コンテンツ関連の型（シンプル版）
export interface Content {
  id: number;
  title: string;
  body: string;
  type: string;
  genre?: string;
  author_id: number;
  author?: User;
  category_id: number;
  category?: Category;
  status: "draft" | "published" | "archived";
  view_count: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContentRequest {
  title: string;
  body: string;
  type: "音楽" | "アニメ" | "漫画" | "映画" | "ゲーム";
  genre?: string;
  category_id: number;
  status?: "draft" | "published";
}

export interface UpdateContentRequest {
  title?: string;
  body?: string;
  type?: "音楽" | "アニメ" | "漫画" | "映画" | "ゲーム";
  genre?: string;
  category_id?: number;
  status?: "draft" | "published" | "archived";
}

export interface ContentFilters {
  category_id?: number;
  author_id?: number;
  status?: string;
  type?: string;
  genre?: string;
  page?: number;
  limit?: number;
  search?: string;
}

// コメント関連の型
export interface Comment {
  id: number;
  body: string;
  user_id: number;
  user?: User;
  content_id: number;
  content?: Content;
  parent_id?: number;
  parent?: Comment;
  replies?: Comment[];
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  body: string;
  content_id: number;
  parent_id?: number;
}

export interface UpdateCommentRequest {
  body: string;
}

// 評価関連の型（いいね機能）
export interface Rating {
  id: number;
  value: number; // 1 = いいね
  user_id: number;
  user?: User;
  content_id: number;
  content?: Content;
  created_at: string;
  updated_at: string;
}

export interface CreateRatingRequest {
  value: number;
  content_id: number;
}

export interface AverageRating {
  like_count: number;
  average: number;
  count: number;
}

export interface CreateOrUpdateRatingRequest {
  value: number;
  content_id: number;
}

// フォロー関連の型
export interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  follower?: User;
  following?: User;
  created_at: string;
}

export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_followed_by: boolean;
}

export interface FollowingFeedParams {
  page?: number;
  limit?: number;
}

export interface FollowersApiResponse {
  followers: User[];
}

export interface FollowingApiResponse {
  following: User[];
}

export interface FollowingFeedApiResponse {
  feed: Content[];
}

export interface FollowStatsApiResponse {
  followStats: FollowStats;
}

// ページネーション関連
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// 検索関連
export interface SearchParams {
  q?: string;
  category_id?: number;
  author_id?: number;
  type?: string;
  genre?: string;
  page?: number;
  limit?: number;
}

export interface UserApiResponse {
  user: User;
}

export interface ContentsApiResponse {
  contents: Content[];
}

export interface CategoriesApiResponse {
  categories: Category[];
}

export interface CommentsApiResponse {
  comments: Comment[];
}

export interface RatingsApiResponse {
  ratings: Rating[];
}
