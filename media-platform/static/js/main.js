// メインJavaScriptファイル
document.addEventListener('DOMContentLoaded', function() {
    // ユーザーナビゲーション表示
    updateUserNavigation();
    
    // サイドバーの初期化
    initializeSidebar();
    
    // ホームページの場合、コンテンツを読み込み
    if (window.location.pathname === '/') {
        loadHomeContent();
    }
});

// ユーザーナビゲーション更新
function updateUserNavigation() {
    const userNavContainer = document.getElementById('userNavContainer');
    if (!userNavContainer) return;
    
    const token = localStorage.getItem('token');
    
    if (token) {
        // ログイン済み
        userNavContainer.innerHTML = `
            <a href="#" class="user-dropdown-toggle">マイページ ▼</a>
            <div class="user-dropdown">
                <a href="/profile">プロフィール</a>
                <a href="/contents/create">新規投稿</a>
                <a href="#" id="logoutBtn">ログアウト</a>
            </div>
        `;
        
        // ドロップダウンの動作
        const dropdownToggle = userNavContainer.querySelector('.user-dropdown-toggle');
        const dropdown = userNavContainer.querySelector('.user-dropdown');
        
        if (dropdownToggle && dropdown) {
            dropdownToggle.addEventListener('click', function(e) {
                e.preventDefault();
                dropdown.classList.toggle('active');
            });
            
            // クリック外でドロップダウンを閉じる
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.user-nav')) {
                    dropdown.classList.remove('active');
                }
            });
            
            // ログアウト処理
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    logout();
                });
            }
        }
    } else {
        // 未ログイン
        userNavContainer.innerHTML = `
            <div class="auth-buttons">
                <a href="/login" class="btn-text">ログイン</a>
                <a href="/register" class="btn btn-primary btn-sm">登録</a>
            </div>
        `;
    }
}

// サイドバーの初期化
function initializeSidebar() {
    // カテゴリの読み込み
    loadSidebarCategories();
    
    // 人気タグの読み込み
    loadPopularTags();
    
    // 最近の活動の読み込み
    loadRecentActivity();
}

// サイドバーカテゴリの読み込み
async function loadSidebarCategories() {
    const container = document.getElementById('sidebarCategories');
    if (!container) return;
    
    try {
        const categories = await fetchFromAPI('/api/categories');
        
        // デフォルトの「すべて」リンクを保持
        const defaultItem = container.querySelector('li');
        container.innerHTML = '';
        if (defaultItem) {
            container.appendChild(defaultItem);
        }
        
        categories.forEach(category => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="/contents?category=${category.id}">${category.name}</a>`;
            container.appendChild(li);
        });
        
    } catch (error) {
        console.error('サイドバーカテゴリの読み込みエラー:', error);
    }
}

// 人気タグの読み込み
async function loadPopularTags() {
    const container = document.getElementById('popularTags');
    if (!container) return;
    
    try {
        // TODO: 人気タグAPIの実装後に更新
        const mockTags = ['写真', '動画', 'アート', 'テクノロジー', '音楽'];
        
        container.innerHTML = mockTags.map(tag => 
            `<a href="/contents?tag=${encodeURIComponent(tag)}" class="tag">${tag}</a>`
        ).join('');
        
    } catch (error) {
        console.error('人気タグの読み込みエラー:', error);
    }
}

// 最近の活動の読み込み
async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    try {
        // TODO: 最近の活動APIの実装後に更新
        const mockActivities = [
            '新しいコンテンツが投稿されました',
            'ユーザーAがコメントしました',
            '人気のコンテンツが更新されました'
        ];
        
        container.innerHTML = mockActivities.map(activity => 
            `<li>${activity}</li>`
        ).join('');
        
    } catch (error) {
        console.error('最近の活動の読み込みエラー:', error);
    }
}

// ホームページコンテンツの読み込み
function loadHomeContent() {
    // トレンドコンテンツの読み込み
    loadTrendingContents();
    
    // カテゴリリストの読み込み
    loadCategories();
    
    // 最新コンテンツの読み込み
    loadLatestContents();
}

// トレンドコンテンツを読み込む
async function loadTrendingContents() {
    const trendingContainer = document.getElementById('trendingContents');
    if (!trendingContainer) return;
    
    try {
        const contents = await fetchFromAPI('/api/contents/trending');
        
        if (contents.length === 0) {
            trendingContainer.innerHTML = '<p class="no-content">トレンドコンテンツはありません</p>';
            return;
        }
        
        trendingContainer.innerHTML = contents.slice(0, 6).map(content => `
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
        
    } catch (error) {
        console.error('トレンドコンテンツの読み込みエラー:', error);
        trendingContainer.innerHTML = '<p class="error-message">コンテンツの読み込みに失敗しました</p>';
    }
}

// カテゴリーを読み込む
async function loadCategories() {
    const categoriesContainer = document.getElementById('categoriesList');
    if (!categoriesContainer) return;
    
    try {
        const categories = await fetchFromAPI('/api/categories');
        
        if (categories.length === 0) {
            categoriesContainer.innerHTML = '<p class="no-content">カテゴリーはありません</p>';
            return;
        }
        
        categoriesContainer.innerHTML = categories.map(category => `
            <a href="/contents?category=${category.id}" class="category-card">
                <h3>${category.name}</h3>
                <p>${category.description || 'このカテゴリーに関するコンテンツ'}</p>
            </a>
        `).join('');
        
    } catch (error) {
        console.error('カテゴリーの読み込みエラー:', error);
        categoriesContainer.innerHTML = '<p class="error-message">カテゴリーの読み込みに失敗しました</p>';
    }
}

// 最新コンテンツを読み込む
async function loadLatestContents() {
    const latestContainer = document.getElementById('latestContents');
    if (!latestContainer) return;
    
    try {
        const contents = await fetchFromAPI('/api/contents/published?limit=6&sort=created_at:desc');
        
        if (contents.length === 0) {
            latestContainer.innerHTML = '<p class="no-content">コンテンツはありません</p>';
            return;
        }
        
        latestContainer.innerHTML = contents.map(content => `
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
        
    } catch (error) {
        console.error('最新コンテンツの読み込みエラー:', error);
        latestContainer.innerHTML = '<p class="error-message">コンテンツの読み込みに失敗しました</p>';
    }
}

// ログアウト処理
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUserNavigation();
    
    // ホームページにリダイレクト
    window.location.href = '/';
}

// APIからデータを取得する汎用関数
async function fetchFromAPI(url, options = {}) {
    try {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API fetch error:', error);
        throw error;
    }
}

// 日付フォーマット
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// エラー表示
function showError(message, container) {
    if (container) {
        container.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// 成功表示
function showSuccess(message, container) {
    if (container) {
        container.innerHTML = `<div class="success-message">${message}</div>`;
    }
}

// ローディング表示
function showLoading(container) {
    if (container) {
        container.innerHTML = '<div class="loader"></div>';
    }
}