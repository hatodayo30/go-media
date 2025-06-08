import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Comment {
  id: number;
  content: string;
  author: {
    id: number;
    username: string;
  };
  content_id: number;
  parent_id?: number;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

interface CommentsProps {
  contentId: number;
}

const Comments: React.FC<CommentsProps> = ({ contentId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [contentId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      console.log(`📥 コメント取得: コンテンツID ${contentId}`);
      
      // 実際のAPI呼び出し
      const response = await api.getCommentsByContentId(contentId.toString());
      console.log('📋 コメントレスポンス:', response);
      
      // レスポンス構造に応じて調整
      const commentsData = response.data?.comments || response.comments || [];
      setComments(commentsData);
      
    } catch (error) {
      console.error('❌ コメント取得エラー:', error);
      // エラーの場合は空配列を設定
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      console.log('📝 コメント投稿:', { content: newComment, content_id: contentId });
      
      // 実際のAPI呼び出し
      const response = await api.createComment({
        content: newComment,
        content_id: contentId
      });
      
      console.log('✅ コメント投稿成功:', response);
      setNewComment('');
      
      // コメント一覧を再取得
      await fetchComments();
      
    } catch (error) {
      console.error('❌ コメント投稿エラー:', error);
      alert('コメントの投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !replyTo) return;

    try {
      setSubmitting(true);
      console.log('💬 返信投稿:', { 
        content: replyContent, 
        content_id: contentId,
        parent_id: replyTo 
      });
      
      // 実際のAPI呼び出し
      const response = await api.createComment({
        content: replyContent,
        content_id: contentId,
        parent_id: replyTo
      });
      
      console.log('✅ 返信投稿成功:', response);
      setReplyContent('');
      setReplyTo(null);
      
      // コメント一覧を再取得
      await fetchComments();
      
    } catch (error) {
      console.error('❌ 返信投稿エラー:', error);
      alert('返信の投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div
      key={comment.id}
      style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        marginLeft: isReply ? '2rem' : '0',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem'
      }}>
        <div style={{ 
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#374151'
        }}>
          👤 {comment.author.username}
        </div>
        <div style={{ 
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          📅 {formatDate(comment.created_at)}
        </div>
      </div>
      
      <div style={{
        color: '#374151',
        lineHeight: '1.6',
        marginBottom: '0.75rem'
      }}>
        {comment.content}
      </div>
      
      {!isReply && (
        <button
          onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
        >
          💬 返信
        </button>
      )}
      
      {/* 返信フォーム */}
      {replyTo === comment.id && (
        <form onSubmit={handleSubmitReply} style={{ marginTop: '1rem' }}>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`${comment.author.username}さんに返信...`}
            required
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              resize: 'vertical',
              marginBottom: '0.5rem'
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.875rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1
              }}
            >
              {submitting ? '投稿中...' : '返信投稿'}
            </button>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setReplyContent('');
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
      
      {/* 返信表示 */}
      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      backgroundColor: '#f9fafb',
      padding: '1.5rem',
      borderRadius: '8px',
      marginTop: '2rem'
    }}>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: '600',
        marginBottom: '1.5rem',
        color: '#374151'
      }}>
        💬 コメント ({comments.length})
      </h3>

      {/* 新規コメント投稿フォーム */}
      <form onSubmit={handleSubmitComment} style={{ marginBottom: '2rem' }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="コメントを投稿..."
          required
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            resize: 'vertical',
            marginBottom: '1rem'
          }}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1
          }}
        >
          {submitting ? '投稿中...' : '💬 コメント投稿'}
        </button>
      </form>

      {/* コメント一覧 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          読み込み中...
        </div>
      ) : comments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
          <p style={{ color: '#6b7280', margin: 0 }}>
            まだコメントがありません。最初のコメントを投稿しましょう！
          </p>
        </div>
      ) : (
        <div>
          {comments.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  );
};

export default Comments;