document.addEventListener('DOMContentLoaded', function() {
    // ログインフォーム
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 登録フォーム
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// ログイン処理
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authMessage = document.getElementById('authMessage');
    
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'ログインに失敗しました');
        }
        
        // トークンの保存
        localStorage.setItem('token', data.token);
        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        // 成功メッセージの表示
        authMessage.textContent = 'ログインに成功しました。リダイレクトします...';
        authMessage.className = 'auth-message success';
        
        // ホームページにリダイレクト
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        // エラーメッセージの表示
        authMessage.textContent = error.message;
        authMessage.className = 'auth-message error';
    }
}

// 登録処理
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const authMessage = document.getElementById('authMessage');
    
    // パスワード確認
    if (password !== confirmPassword) {
        authMessage.textContent = 'パスワードが一致しません';
        authMessage.className = 'auth-message error';
        return;
    }
    
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || '登録に失敗しました');
        }
        
        // 成功メッセージの表示
        authMessage.textContent = '登録に成功しました。ログインページにリダイレクトします...';
        authMessage.className = 'auth-message success';
        
        // ログインページにリダイレクト
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
        
    } catch (error) {
        // エラーメッセージの表示
        authMessage.textContent = error.message;
        authMessage.className = 'auth-message error';
    }
}