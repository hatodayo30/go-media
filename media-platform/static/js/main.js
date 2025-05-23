document.addEventListener('DOMContentLoaded', function() {
    // ユーザーナビゲーション表示
    updateUserNavigation();
    
    // トークンチェック
    checkAuthStatus();
});

// ユーザーナビゲーション更新
function updateUserNavigation() {
    const userNavContainer = document.getElementById('userNavContainer');
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
        const dropdownToggle = document.querySelector('.user-dropdown-toggle');
        const dropdown = document.querySelector('.user-dropdown');
        
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

// 認証状態チェック
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // トークンの有効性を検証
    fetch('/api/users/me', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                // トークンが無効ならローカルストレージから削除
                localStorage.removeItem('token');
                updateUserNavigation();
            }
            throw new Error('認証に失敗しました');
        }
        return response.json();
    })
    .then(data => {
        // ユーザー情報をローカルストレージに保存
        localStorage.setItem('user', JSON.stringify(data));
    })
    .catch(error => console.error('認証エラー:', error));
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}