// 認証関連JavaScript
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
        
        // パスワード強度チェック
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', checkPasswordStrength);
        }
        
        // パスワード確認チェック
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', checkPasswordMatch);
        }
    }
    
    // 既にログインしている場合はリダイレクト
    if (localStorage.getItem('token') && 
        (window.location.pathname === '/login' || window.location.pathname === '/register')) {
        window.location.href = '/';
    }
});

// ログイン処理
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authMessage = document.getElementById('authMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // ボタンを無効化
    submitBtn.disabled = true;
    submitBtn.textContent = 'ログイン中...';
    
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
        showAuthMessage('ログインに成功しました。リダイレクトします...', 'success');
        
        // ホームページにリダイレクト
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
        
    } catch (error) {
        // エラーメッセージの表示
        showAuthMessage(error.message, 'error');
    } finally {
        // ボタンを有効化
        submitBtn.disabled = false;
        submitBtn.textContent = 'ログイン';
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
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // バリデーション
    if (!validateRegistrationForm(username, email, password, confirmPassword)) {
        return;
    }
    
    // ボタンを無効化
    submitBtn.disabled = true;
    submitBtn.textContent = '登録中...';
    
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
        showAuthMessage('登録に成功しました。ログインページにリダイレクトします...', 'success');
        
        // ログインページにリダイレクト
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
        
    } catch (error) {
        // エラーメッセージの表示
        showAuthMessage(error.message, 'error');
    } finally {
        // ボタンを有効化
        submitBtn.disabled = false;
        submitBtn.textContent = '登録';
    }
}

// 登録フォームのバリデーション
function validateRegistrationForm(username, email, password, confirmPassword) {
    // ユーザー名チェック
    if (username.length < 3) {
        showAuthMessage('ユーザー名は3文字以上で入力してください', 'error');
        return false;
    }
    
    // メールアドレスチェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAuthMessage('有効なメールアドレスを入力してください', 'error');
        return false;
    }
    
    // パスワードチェック
    if (password.length < 6) {
        showAuthMessage('パスワードは6文字以上で入力してください', 'error');
        return false;
    }
    
    // パスワード確認チェック
    if (password !== confirmPassword) {
        showAuthMessage('パスワードが一致しません', 'error');
        return false;
    }
    
    return true;
}

// パスワード強度チェック
function checkPasswordStrength(e) {
    const password = e.target.value;
    const strengthBar = document.querySelector('.password-strength-bar');
    
    if (!strengthBar) return;
    
    let strength = 0;
    
    // 長さチェック
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    
    // 文字種チェック
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    // 強度に応じてクラスを設定
    strengthBar.className = 'password-strength-bar';
    if (strength >= 2 && strength < 4) {
        strengthBar.classList.add('weak');
    } else if (strength >= 4 && strength < 6) {
        strengthBar.classList.add('medium');
    } else if (strength >= 6) {
        strengthBar.classList.add('strong');
    }
}

// パスワード一致チェック
function checkPasswordMatch(e) {
    const password = document.getElementById('password').value;
    const confirmPassword = e.target.value;
    const input = e.target;
    
    if (confirmPassword === '') {
        input.style.borderColor = '';
        return;
    }
    
    if (password === confirmPassword) {
        input.style.borderColor = 'var(--success-color)';
    } else {
        input.style.borderColor = 'var(--error-color)';
    }
}

// 認証メッセージ表示
function showAuthMessage(message, type) {
    const authMessage = document.getElementById('authMessage');
    if (!authMessage) return;
    
    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
    authMessage.style.display = 'block';
    
    // エラーメッセージは5秒後に非表示
    if (type === 'error') {
        setTimeout(() => {
            authMessage.style.display = 'none';
        }, 5000);
    }
}

// フォームリセット
function resetAuthForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        const authMessage = document.getElementById('authMessage');
        if (authMessage) {
            authMessage.style.display = 'none';
        }
    }
}

// パスワード表示/非表示切り替え
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const toggleBtn = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        input.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}