// コンテンツ関連JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    
    // コンテンツ一覧ページ
    if (path === '/contents') {
        initializeContentList();
    }
    
    // コンテンツ詳細ページ
    if (path.startsWith('/contents/') && !path.includes('/edit') && !path.includes('/create')) {
        const contentId = path.split('/')[2];
        if (contentId && contentId !== 'create') {
            initializeContentSingle(contentId);
        }
    }
    
    // コンテンツ作成ページ
    if (path === '/contents/create') {
        initializeContentForm();
    }
    
    // コンテンツ編集ページ
    if (path.includes('/edit')) {
        const contentId = path.split('/')[2];
        initializeContentForm(contentId);
    }
});

// コンテンツ一覧の初期化
function initializeContentList() {
    // カテゴリーフィルターの読み込み
    loadCategoryFilter();
    
    // 初期コンテンツの読み込み
    loadContents();
    
    // 検索ボタンのイベント
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            loadContents(1);
        });
    }
    
    // カテゴリーフィルター変更イベント
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            loadContents(1);
        });
    }
    
    // ソートフィルター変更イベント
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        sortFilter.addEventListener('change', function() {
            loadContents(1);
        });
    }
    
    // Enterキーで検索
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loadContents(1);
            }
        });
    }
}

// カテゴリーフィルターを読み込む
async function loadCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    try {
        const categories = await fetchFromAPI('/api/categories');
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error('カテゴリーの読み込みエラー:', error);
    }
}

// コンテンツを読み込む
async function loadContents(page = 1) {
    const contentsContainer = document.getElementById('contentsList');
    const paginationContainer = document.getElementById('pagination');
    if (!contentsContainer) return;
    
    // 検索クエリとフィルターの取得
    const searchQuery = document.getElementById('searchInput')?.value || '';
    const categoryId = document.getElementById('categoryFilter')?.value || '';
    const sort = document.getElementById('sortFilter')?.value || 'created_at:desc';
    
    // ローダーを表示
    showLoading(contentsContainer);
    
    // APIパラメータの構築
    const limit = 12;
    const offset = (page - 1) * limit;
    let endpoint = `/api/contents/published?limit=${limit}&offset=${offset}&sort=${sort}`;
    
    if (searchQuery) {
        endpoint = `/api/contents/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}&offset=${offset}&sort=${sort}`;
    }
    
    if (categoryId) {
        endpoint = `/api/contents/category/${categoryId}?limit=${limit}&offset=${offset}&sort=${sort}`;
    }
    
    try {
        const response = await fetchFromAPI(endpoint);
        const contents = response.contents || response;
        const total = response.total || contents.length;
        
        if (contents.length === 0) {
            contentsContainer.innerHTML = '<p class="no-content">コンテンツはありません</p>';
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }
        
        // コンテンツの表示
        contentsContainer.innerHTML = contents.map(content => `
            <div class="content-card">
                <div class="content-image">
                    <img src="${content.thumbnail || '/static/images/placeholder.jpg'}" alt="${content.title}">
                </div>
                <div class="content-info">
                    <h3 class="content-title">
                        <a href="/contents/${content.id}">${content.title}</a>
                    </h3>
                    <div class="content-meta">
                        <span>${content.author?.username || '匿名'}</span>
                        <span>${formatDate(content.created_at)}</span>
                    </div>
                    <p class="content-description">${content.description || '説明はありません'}</p>
                    <div class="content-footer">
                        <a href="/contents/${content.id}" class="btn btn-secondary btn-sm">詳細を見る</a>
                    </div>
                </div>
            </div>
        `).join('');
        
        // ページネーションの表示
        if (paginationContainer) {
            const totalPages = Math.ceil(total / limit);
            renderPagination(page, totalPages, paginationContainer);
        }
        
    } catch (error) {
        console.error('コンテンツの読み込みエラー:', error);
        showError('コンテンツの読み込みに失敗しました', contentsContainer);
    }
}

// ページネーションの表示
function renderPagination(currentPage, totalPages, container) {
    if (!container || totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHtml = '';
    
    // 前へボタン
    paginationHtml += `
        <button 
            class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}"
            ${currentPage === 1 ? 'disabled' : ''}
            onclick="loadContents(${currentPage - 1})"
        >前へ</button>
    `;
    
    // ページ番号
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
            <button 
                class="pagination-btn ${i === currentPage ? 'active' : ''}"
                onclick="loadContents(${i})"
            >${i}</button>
        `;
    }
    
    // 次へボタン
    paginationHtml += `
        <button 
            class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}"
            ${currentPage === totalPages ? 'disabled' : ''}
            onclick="loadContents(${currentPage + 1})"
        >次へ</button>
    `;
    
    container.innerHTML = paginationHtml;
}

// コンテンツ詳細の初期化
function initializeContentSingle(contentId) {
    // コンテンツの読み込み
    loadContent(contentId);
    
    // コメントの読み込み
    loadComments(contentId);
    
    // 評価の読み込み
    loadRatings(contentId);
}

// コンテンツの読み込み
async function loadContent(contentId) {
    const contentContainer = document.getElementById('contentContainer');
    const contentActions = document.getElementById('contentActions');
    if (!contentContainer) return;
    
    showLoading(contentContainer);
    
    try {
        const content = await fetchFromAPI(`/api/contents/${contentId}`);
        
        // コンテンツ表示
        contentContainer.innerHTML = `
            <div class="content-header">
                <h1 class="content-title">${content.title}</h1>
                <div class="content-meta">
                    <div class="meta-item">
                        <span>著者:</span>
                        <span>${content.author?.username || '匿名'}</span>
                    </div>
                    <div class="meta-item">
                        <span>カテゴリー:</span>
                        <span>${content.category?.name || 'なし'}</span>
                    </div>
                    <div class="meta-item">
                        <span>投稿日:</span>
                        <span>${formatDate(content.created_at)}</span>
                    </div>
                    ${content.updated_at && content.updated_at !== content.created_at ? `
                        <div class="meta-item">
                            <span>更新日:</span>
                            <span>${formatDate(content.updated_at)}</span>
                        </div>
                    ` : ''}
                </div>
                ${content.description ? `<p class="content-description">${content.description}</p>` : ''}
            </div>
            
            ${content.thumbnail ? `
                <div class="content-thumbnail-container">
                    <img src="${content.thumbnail}" alt="${content.title}" class="content-thumbnail">
                </div>
            ` : ''}
            
            <div class="content-body">
                ${formatContentBody(content.content)}
            </div>
        `;
        
        // ユーザーがログインしているか、コンテンツの作者か管理者かチェック
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const token = localStorage.getItem('token');
        
        if (token && contentActions && (user.id === content.author_id || user.role === 'admin')) {
            contentActions.innerHTML = `
                <div class="content-actions-buttons">
                    <a href="/contents/${contentId}/edit" class="btn btn-secondary">編集</a>
                    <button id="deleteContentBtn" class="btn btn-danger">削除</button>
                </div>
            `;
            
            // 削除ボタンのイベント
            const deleteBtn = document.getElementById('deleteContentBtn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    if (confirm('このコンテンツを削除してもよろしいですか？\nこの操作は取り消せません。')) {
                        deleteContent(contentId);
                    }
                });
            }
        }
        
    } catch (error) {
        console.error('コンテンツの読み込みエラー:', error);
        showError('コンテンツの読み込みに失敗しました', contentContainer);
    }
}

// コンテンツ本文のフォーマット
function formatContentBody(content) {
    if (!content) return '';
    
    // 改行をHTMLに変換し、URLをリンク化
    return content
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

// コンテンツの削除
async function deleteContent(contentId) {
    try {
        await fetchFromAPI(`/api/contents/${contentId}`, {
            method: 'DELETE'
        });
        
        alert('コンテンツを削除しました');
        window.location.href = '/contents';
        
    } catch (error) {
        console.error('コンテンツの削除エラー:', error);
        alert('コンテンツの削除に失敗しました');
    }
}

// コメントの読み込み
async function loadComments(contentId) {
    const commentsList = document.getElementById('commentsList');
    const commentForm = document.getElementById('commentForm');
    if (!commentsList || !commentForm) return;
    
    // コメントフォームの表示
    const token = localStorage.getItem('token');
    if (token) {
        commentForm.innerHTML = `
            <div class="comment-form-container">
                <h3>コメントを投稿</h3>
                <form class="comment-form">
                    <textarea id="commentText" placeholder="コメントを入力してください..." required rows="4"></textarea>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">投稿</button>
                    </div>
                </form>
            </div>
        `;
        
        // コメント投稿イベント
        const form = commentForm.querySelector('form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const commentText = document.getElementById('commentText').value.trim();
                if (commentText) {
                    postComment(contentId, commentText);
                }
            });
        }
    } else {
        commentForm.innerHTML = `
            <div class="login-prompt">
                <p>コメントを投稿するには<a href="/login">ログイン</a>してください</p>
            </div>
        `;
    }
    
    // コメントの取得と表示
    showLoading(commentsList);
    
    try {
        const comments = await fetchFromAPI(`/api/contents/${contentId}/comments`);
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="no-comments">コメントはまだありません</p>';
            return;
        }
        
        displayComments(comments, commentsList);
        
    } catch (error) {
        console.error('コメントの読み込みエラー:', error);
        showError('コメントの読み込みに失敗しました', commentsList);
    }
}

// コメントを表示
function displayComments(comments, container) {
    // 親コメントと子コメントを分ける
    const parentComments = comments.filter(comment => !comment.parent_id);
    const childComments = comments.filter(comment => comment.parent_id);
    
    // 親コメントごとにHTMLを構築
    container.innerHTML = `
        <div class="comments-container">
            ${parentComments.map(comment => {
                // この親コメントの子コメントを探す
                const replies = childComments.filter(child => child.parent_id === comment.id);
                
                return `
                    <div class="comment-item" data-id="${comment.id}">
                        <div class="comment-header">
                            <span class="comment-author">${comment.author?.username || '匿名'}</span>
                            <span class="comment-date">${formatDate(comment.created_at)}</span>
                        </div>
                        <div class="comment-body">
                            ${formatCommentContent(comment.content)}
                        </div>
                        ${displayCommentActions(comment)}
                        ${replies.length > 0 ? `
                            <div class="comment-replies">
                                ${replies.map(reply => `
                                    <div class="comment-item reply" data-id="${reply.id}">
                                        <div class="comment-header">
                                            <span class="comment-author">${reply.author?.username || '匿名'}</span>
                                            <span class="comment-date">${formatDate(reply.created_at)}</span>
                                        </div>
                                        <div class="comment-body">
                                            ${formatCommentContent(reply.content)}
                                        </div>
                                        ${displayCommentActions(reply)}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        <div class="reply-form-container" id="replyForm-${comment.id}" style="display: none;">
                            <form class="reply-form">
                                <textarea placeholder="返信を入力してください..." required rows="3"></textarea>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary btn-sm">返信</button>
                                    <button type="button" class="btn btn-secondary btn-sm cancel-reply-btn">キャンセル</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    // イベントリスナーの追加
    addCommentEventListeners();
}

// コメント内容のフォーマット
function formatCommentContent(content) {
    if (!content) return '';
    
    return content
        .replace(/\n/g, '<br>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

// コメントアクションの表示
function displayCommentActions(comment) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    
    if (!token) return '';
    
    let actionsHtml = `<div class="comment-actions">`;
    
    // 返信ボタンは常に表示
    actionsHtml += `<button class="btn btn-text reply-btn">返信</button>`;
    
    // 編集・削除ボタンはコメント作者か管理者のみ
    if (user.id === comment.author_id || user.role === 'admin') {
        actionsHtml += `
            <button class="btn btn-text edit-comment-btn">編集</button>
            <button class="btn btn-text delete-comment-btn">削除</button>
        `;
    }
    
    actionsHtml += `</div>`;
    return actionsHtml;
}

// コメントイベントリスナーの追加
function addCommentEventListeners() {
    // 返信ボタン
    const replyButtons = document.querySelectorAll('.reply-btn');
    replyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const commentId = this.closest('.comment-item').dataset.id;
            const replyForm = document.getElementById(`replyForm-${commentId}`);
            
            if (replyForm) {
                const isVisible = replyForm.style.display !== 'none';
                replyForm.style.display = isVisible ? 'none' : 'block';
                
                if (!isVisible) {
                    const textarea = replyForm.querySelector('textarea');
                    if (textarea) textarea.focus();
                }
            }
        });
    });
    
    // 返信フォーム
    const replyForms = document.querySelectorAll('.reply-form');
    replyForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const commentItem = this.closest('.comment-item');
            const commentId = commentItem.dataset.id;
            const content = this.querySelector('textarea').value.trim();
            const contentId = window.location.pathname.split('/')[2];
            
            if (content) {
                postReply(contentId, commentId, content);
            }
        });
        
        // キャンセルボタン
        const cancelBtn = form.querySelector('.cancel-reply-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                const replyForm = this.closest('.reply-form-container');
                replyForm.style.display = 'none';
                this.closest('form').reset();
            });
        }
    });
    
    // 編集ボタン
    const editButtons = document.querySelectorAll('.edit-comment-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const commentItem = this.closest('.comment-item');
            const commentId = commentItem.dataset.id;
            const commentBody = commentItem.querySelector('.comment-body');
            const currentContent = commentBody.textContent.trim();
            
            commentBody.innerHTML = `
                <form class="edit-comment-form">
                    <textarea required rows="3">${currentContent}</textarea>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary btn-sm">更新</button>
                        <button type="button" class="btn btn-secondary btn-sm cancel-edit-btn">キャンセル</button>
                    </div>
                </form>
            `;
            
            // 編集フォームのイベント
            const editForm = commentBody.querySelector('.edit-comment-form');
            editForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const newContent = this.querySelector('textarea').value.trim();
                if (newContent) {
                    updateComment(commentId, newContent);
                }
            });
            
            // 編集キャンセルのイベント
            const cancelBtn = commentBody.querySelector('.cancel-edit-btn');
            cancelBtn.addEventListener('click', function() {
                commentBody.innerHTML = formatCommentContent(currentContent);
            });
            
            // テキストエリアにフォーカス
            const textarea = editForm.querySelector('textarea');
            if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
        });
    });
    
    // 削除ボタン
    const deleteButtons = document.querySelectorAll('.delete-comment-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (confirm('このコメントを削除してもよろしいですか？')) {
                const commentId = this.closest('.comment-item').dataset.id;
                deleteComment(commentId);
            }
        });
    });
}

// コメントの投稿
async function postComment(contentId, content) {
    try {
        await fetchFromAPI('/api/comments', {
            method: 'POST',
            body: JSON.stringify({
                content_id: parseInt(contentId),
                content
            })
        });
        
        // コメント入力欄をクリア
        const commentTextarea = document.getElementById('commentText');
        if (commentTextarea) {
            commentTextarea.value = '';
        }
        
        // コメントを再読み込み
        loadComments(contentId);
        
    } catch (error) {
        console.error('コメント投稿エラー:', error);
        alert('コメントの投稿に失敗しました');
    }
}

// 返信の投稿
async function postReply(contentId, parentId, content) {
    try {
        await fetchFromAPI('/api/comments', {
            method: 'POST',
            body: JSON.stringify({
                content_id: parseInt(contentId),
                parent_id: parseInt(parentId),
                content
            })
        });
        
        // コメントを再読み込み
        loadComments(contentId);
        
    } catch (error) {
        console.error('返信投稿エラー:', error);
        alert('返信の投稿に失敗しました');
    }
}

// コメントの更新
async function updateComment(commentId, content) {
    try {
        await fetchFromAPI(`/api/comments/${commentId}`, {
            method: 'PUT',
            body: JSON.stringify({
                content
            })
        });
        
        // コンテンツIDを取得
        const contentId = window.location.pathname.split('/')[2];
        
        // コメントを再読み込み
        loadComments(contentId);
        
    } catch (error) {
        console.error('コメント更新エラー:', error);
        alert('コメントの更新に失敗しました');
    }
}

// コメントの削除
async function deleteComment(commentId) {
    try {
        await fetchFromAPI(`/api/comments/${commentId}`, {
            method: 'DELETE'
        });
        
        // コンテンツIDを取得
        const contentId = window.location.pathname.split('/')[2];
        
        // コメントを再読み込み
        loadComments(contentId);
        
    } catch (error) {
        console.error('コメント削除エラー:', error);
        alert('コメントの削除に失敗しました');
    }
}

// 評価の読み込み
async function loadRatings(contentId) {
    const averageRatingContainer = document.getElementById('averageRating');
    const userRatingContainer = document.getElementById('userRating');
    if (!averageRatingContainer || !userRatingContainer) return;
    
    // 平均評価の取得と表示
    try {
        const avgRating = await fetchFromAPI(`/api/contents/${contentId}/rating/average`);
        
        averageRatingContainer.innerHTML = `
            <div class="average-rating">
                <h3>評価</h3>
                <div class="rating-display">
                    <div class="rating-stars">
                        ${generateStars(avgRating.average || 0)}
                    </div>
                    <span class="rating-value">${avgRating.average ? avgRating.average.toFixed(1) : '---'}</span>
                    <span class="rating-count">(${avgRating.count || 0}件の評価)</span>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('平均評価の読み込みエラー:', error);
        showError('評価の読み込みに失敗しました', averageRatingContainer);
    }
    
    // ユーザー評価フォームの表示
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const ratings = await fetchFromAPI(`/api/users/${user.id}/ratings`);
            const userRating = ratings.find(rating => rating.content_id === parseInt(contentId));
            
            userRatingContainer.innerHTML = `
                <div class="user-rating-form">
                    <h4>あなたの評価</h4>
                    <div class="rating-stars-input">
                        ${[1, 2, 3, 4, 5].map(star => `
                            <span class="star interactive ${userRating && userRating.rating >= star ? 'active' : ''}" 
                                  data-value="${star}" 
                                  title="${star}つ星">★</span>
                        `).join('')}
                    </div>
                    ${userRating ? `<p class="current-rating">現在の評価: ${userRating.rating}つ星</p>` : ''}
                </div>
            `;
            
            // 星のクリックイベント
            const stars = userRatingContainer.querySelectorAll('.star');
            stars.forEach(star => {
                star.addEventListener('click', function() {
                    const rating = parseInt(this.dataset.value);
                    submitRating(contentId, rating);
                });
                
                // ホバーエフェクト
                star.addEventListener('mouseenter', function() {
                    const rating = parseInt(this.dataset.value);
                    highlightStars(stars, rating);
                });
                
                star.addEventListener('mouseleave', function() {
                    const currentRating = userRating ? userRating.rating : 0;
                    highlightStars(stars, currentRating);
                });
            });
            
        } catch (error) {
            console.error('ユーザー評価の読み込みエラー:', error);
            userRatingContainer.innerHTML = `
                <div class="user-rating-form">
                    <p>評価機能を利用できません</p>
                </div>
            `;
        }
    } else {
        userRatingContainer.innerHTML = `
            <div class="login-prompt">
                <p>評価するには<a href="/login">ログイン</a>してください</p>
            </div>
        `;
    }
}

// 星の生成
function generateStars(rating) {
    let starsHtml = '';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    // 満星
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<span class="star full">★</span>';
    }
    
    // 半星
    if (halfStar) {
        starsHtml += '<span class="star half">★</span>';
    }
    
    // 空星
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<span class="star empty">☆</span>';
    }
    
    return starsHtml;
}

// 星のハイライト
function highlightStars(stars, rating) {
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// 評価の送信
async function submitRating(contentId, rating) {
    try {
        await fetchFromAPI('/api/ratings', {
            method: 'POST',
            body: JSON.stringify({
                content_id: parseInt(contentId),
                rating
            })
        });
        
        // 評価を再読み込み
        loadRatings(contentId);
        
        // 成功メッセージを表示
        showSuccess(`${rating}つ星で評価しました`);
        
    } catch (error) {
        console.error('評価送信エラー:', error);
        alert('評価の送信に失敗しました');
    }
}

// コンテンツフォームの初期化
function initializeContentForm(contentId = null) {
    // カテゴリの読み込み
    loadFormCategories();
    
    // フォームの送信イベント
    const contentForm = document.getElementById('contentForm');
    if (contentForm) {
        contentForm.addEventListener('submit', function(e) {
            handleContentFormSubmit(e, contentId);
        });
    }
    
    // 編集の場合、コンテンツを読み込む
    if (contentId) {
        loadContentForEdit(contentId);
    }
    
    // 削除ボタンのイベント（編集ページのみ）
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            if (confirm('このコンテンツを削除してもよろしいですか？\nこの操作は取り消せません。')) {
                deleteContent(contentId);
            }
        });
    }
    
    // プレビュー機能
    const previewBtn = document.getElementById('previewBtn');
    const contentTextarea = document.getElementById('content');
    const previewContainer = document.getElementById('previewContainer');
    
    if (previewBtn && contentTextarea && previewContainer) {
        previewBtn.addEventListener('click', function() {
            togglePreview();
        });
    }
    
    // 自動保存機能（下書き保存）
    if (contentId) {
        setupAutoSave(contentId);
    }
}

// フォーム用カテゴリーの読み込み
async function loadFormCategories() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    
    try {
        const categories = await fetchFromAPI('/api/categories');
        
        // デフォルトオプションをクリア（最初の「選択してください」以外）
        while (categorySelect.children.length > 1) {
            categorySelect.removeChild(categorySelect.lastChild);
        }
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('カテゴリーの読み込みエラー:', error);
        alert('カテゴリーの読み込みに失敗しました');
    }
}

// 編集用のコンテンツを読み込む
async function loadContentForEdit(contentId) {
    const loadingMessage = document.getElementById('formMessage');
    if (loadingMessage) {
        showLoading(loadingMessage);
    }
    
    try {
        const content = await fetchFromAPI(`/api/contents/${contentId}`);
        
        // フォームに値を設定
        const titleField = document.getElementById('title');
        const descriptionField = document.getElementById('description');
        const contentField = document.getElementById('content');
        const thumbnailField = document.getElementById('thumbnail');
        const statusField = document.getElementById('status');
        const categoryField = document.getElementById('category');
        
        if (titleField) titleField.value = content.title || '';
        if (descriptionField) descriptionField.value = content.description || '';
        if (contentField) contentField.value = content.content || '';
        if (thumbnailField) thumbnailField.value = content.thumbnail || '';
        if (statusField) statusField.value = content.status || 'draft';
        
        // カテゴリーの選択（カテゴリーが読み込まれるまで待つ）
        if (content.category_id && categoryField) {
            const waitForCategories = setInterval(() => {
                if (categoryField.children.length > 1) {
                    categoryField.value = content.category_id;
                    clearInterval(waitForCategories);
                }
            }, 100);
            
            // 5秒でタイムアウト
            setTimeout(() => clearInterval(waitForCategories), 5000);
        }
        
        if (loadingMessage) {
            loadingMessage.innerHTML = '';
        }
        
    } catch (error) {
        console.error('コンテンツの読み込みエラー:', error);
        if (loadingMessage) {
            showError('コンテンツの読み込みに失敗しました', loadingMessage);
        }
    }
}

// コンテンツフォーム送信処理
async function handleContentFormSubmit(e, contentId = null) {
    e.preventDefault();
    
    const formMessage = document.getElementById('formMessage');
    const isEdit = !!contentId;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // バリデーション
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    
    if (!title) {
        showError('タイトルを入力してください', formMessage);
        document.getElementById('title').focus();
        return;
    }
    
    if (!content) {
        showError('コンテンツ本文を入力してください', formMessage);
        document.getElementById('content').focus();
        return;
    }
    
    // ボタンを無効化
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? '更新中...' : '作成中...';
    
    // フォームデータの取得
    const formData = {
        title: title,
        description: document.getElementById('description').value.trim(),
        content: content,
        category_id: parseInt(document.getElementById('category').value) || null,
        thumbnail: document.getElementById('thumbnail').value.trim(),
        status: document.getElementById('status').value
    };
    
    try {
        let response;
        
        if (isEdit) {
            // 更新
            response = await fetchFromAPI(`/api/contents/${contentId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
        } else {
            // 新規作成
            response = await fetchFromAPI('/api/contents', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
        }
        
        // 成功メッセージの表示
        showSuccess(isEdit ? 'コンテンツを更新しました' : 'コンテンツを作成しました', formMessage);
        
        // 詳細ページにリダイレクト
        setTimeout(() => {
            window.location.href = `/contents/${isEdit ? contentId : response.id}`;
        }, 1500);
        
    } catch (error) {
        console.error('フォーム送信エラー:', error);
        let errorMessage = isEdit ? 'コンテンツの更新に失敗しました' : 'コンテンツの作成に失敗しました';
        
        // エラーの詳細があれば表示
        if (error.message) {
            errorMessage += ': ' + error.message;
        }
        
        showError(errorMessage, formMessage);
    } finally {
        // ボタンを有効化
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// プレビュー機能の切り替え
function togglePreview() {
    const previewBtn = document.getElementById('previewBtn');
    const contentTextarea = document.getElementById('content');
    const previewContainer = document.getElementById('previewContainer');
    const formContainer = document.querySelector('.content-form');
    
    if (!previewBtn || !contentTextarea || !previewContainer) return;
    
    const isPreviewMode = previewContainer.style.display !== 'none';
    
    if (isPreviewMode) {
        // プレビューを非表示にして編集モードに戻る
        previewContainer.style.display = 'none';
        formContainer.style.display = 'block';
        previewBtn.textContent = 'プレビュー';
    } else {
        // プレビューモードに切り替え
        const title = document.getElementById('title').value;
        const content = contentTextarea.value;
        
        previewContainer.innerHTML = `
            <div class="preview-header">
                <h2>プレビュー</h2>
                <button type="button" id="closePreview" class="btn btn-secondary">編集に戻る</button>
            </div>
            <div class="preview-content">
                <h1 class="preview-title">${title || '（タイトル未入力）'}</h1>
                <div class="preview-body">
                    ${formatContentBody(content) || '<p>（本文未入力）</p>'}
                </div>
            </div>
        `;
        
        formContainer.style.display = 'none';
        previewContainer.style.display = 'block';
        previewBtn.textContent = '編集に戻る';
        
        // 閉じるボタンのイベント
        const closeBtn = document.getElementById('closePreview');
        if (closeBtn) {
            closeBtn.addEventListener('click', togglePreview);
        }
    }
}

// 自動保存機能のセットアップ
function setupAutoSave(contentId) {
    const titleField = document.getElementById('title');
    const descriptionField = document.getElementById('description');
    const contentField = document.getElementById('content');
    
    let autoSaveTimer;
    
    function scheduleAutoSave() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(autoSave, 30000); // 30秒後に自動保存
    }
    
    async function autoSave() {
        const formData = {
            title: titleField?.value.trim() || '',
            description: descriptionField?.value.trim() || '',
            content: contentField?.value.trim() || '',
            status: 'draft' // 自動保存は常に下書き
        };
        
        try {
            await fetchFromAPI(`/api/contents/${contentId}/autosave`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            // 自動保存完了の表示
            showAutoSaveStatus('自動保存しました');
        } catch (error) {
            console.error('自動保存エラー:', error);
            showAutoSaveStatus('自動保存に失敗しました', true);
        }
    }
    
    // フィールドの変更を監視
    [titleField, descriptionField, contentField].forEach(field => {
        if (field) {
            field.addEventListener('input', scheduleAutoSave);
        }
    });
}

// 自動保存ステータスの表示
function showAutoSaveStatus(message, isError = false) {
    let statusElement = document.getElementById('autoSaveStatus');
    
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'autoSaveStatus';
        statusElement.className = 'auto-save-status';
        document.body.appendChild(statusElement);
    }
    
    statusElement.textContent = message;
    statusElement.className = `auto-save-status ${isError ? 'error' : 'success'}`;
    statusElement.style.display = 'block';
    
    // 3秒後に非表示
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

// ユーティリティ関数

// 日付のフォーマット
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return '今日';
    } else if (diffDays === 2) {
        return '昨日';
    } else if (diffDays <= 7) {
        return `${diffDays - 1}日前`;
    } else {
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// ローディング表示
function showLoading(container, message = '読み込み中...') {
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

// エラーメッセージ表示
function showError(message, container) {
    if (!container) {
        alert(message);
        return;
    }
    
    container.innerHTML = `
        <div class="alert alert-error">
            <p>${message}</p>
        </div>
    `;
}

// 成功メッセージ表示
function showSuccess(message, container) {
    if (!container) {
        // 一時的な成功メッセージを表示
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success floating-alert';
        successDiv.innerHTML = `<p>${message}</p>`;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 3000);
        return;
    }
    
    container.innerHTML = `
        <div class="alert alert-success">
            <p>${message}</p>
        </div>
    `;
}

// APIからデータを取得する共通関数
async function fetchFromAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(endpoint, finalOptions);
        
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // JSON解析に失敗した場合はデフォルトメッセージを使用
            }
            
            throw new Error(errorMessage);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
        
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// 検索結果のハイライト
function highlightSearchTerms(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}place(regex, '<mark>$1</mark>');


// 無限スクロール機能（オプション）
function initializeInfiniteScroll() {
    let currentPage = 1;
    let isLoading = false;
    let hasMoreContent = true;
    
    window.addEventListener('scroll', function() {
        if (isLoading || !hasMoreContent) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.offsetHeight;
        
        // ページ底部に近づいたら次のページを読み込み
        if (scrollTop + windowHeight >= documentHeight - 1000) {
            loadMoreContents();
        }
    });
    
    async function loadMoreContents() {
        if (isLoading || !hasMoreContent) return;
        
        isLoading = true;
        currentPage++;
        
        try {
            const contentsContainer = document.getElementById('contentsList');
            const searchQuery = document.getElementById('searchInput')?.value || '';
            const categoryId = document.getElementById('categoryFilter')?.value || '';
            const sort = document.getElementById('sortFilter')?.value || 'created_at:desc';
            
            const limit = 12;
            const offset = (currentPage - 1) * limit;
            let endpoint = `/api/contents/published?limit=${limit}&offset=${offset}&sort=${sort}`;
            
            if (searchQuery) {
                endpoint = `/api/contents/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}&offset=${offset}&sort=${sort}`;
            }
            
            if (categoryId) {
                endpoint = `/api/contents/category/${categoryId}?limit=${limit}&offset=${offset}&sort=${sort}`;
            }
            
            const response = await fetchFromAPI(endpoint);
            const contents = response.contents || response;
            
            if (contents.length === 0) {
                hasMoreContent = false;
                return;
            }
            
            // 新しいコンテンツを追加
            const newContentHtml = contents.map(content => `
                <div class="content-card">
                    <div class="content-image">
                        <img src="${content.thumbnail || '/static/images/placeholder.jpg'}" alt="${content.title}">
                    </div>
                    <div class="content-info">
                        <h3 class="content-title">
                            <a href="/contents/${content.id}">${content.title}</a>
                        </h3>
                        <div class="content-meta">
                            <span>${content.author?.username || '匿名'}</span>
                            <span>${formatDate(content.created_at)}</span>
                        </div>
                        <p class="content-description">${content.description || '説明はありません'}</p>
                        <div class="content-footer">
                            <a href="/contents/${content.id}" class="btn btn-secondary btn-sm">詳細を見る</a>
                        </div>
                    </div>
                </div>
            `).join('');
            
            contentsContainer.insertAdjacentHTML('beforeend', newContentHtml);
            
        } catch (error) {
            console.error('追加コンテンツの読み込みエラー:', error);
        } finally {
            isLoading = false;
        }
    }
}

// エクスポート（モジュール使用時）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeContentList,
        initializeContentSingle,
        initializeContentForm,
        loadContents,
        loadContent,
        loadComments,
        loadRatings,
        formatDate,
        fetchFromAPI
    };
}