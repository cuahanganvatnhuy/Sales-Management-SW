// ===== LOGIN PAGE LOGIC =====

// DOM elements
let loginForm, usernameInput, passwordInput, loginBtn, loginLoading, notification;

// Initialize login page
document.addEventListener('DOMContentLoaded', function() {
    initializeLoginPage();
});

function initializeLoginPage() {
    // Get DOM elements
    loginForm = document.getElementById('loginForm');
    usernameInput = document.getElementById('username');
    passwordInput = document.getElementById('password');
    loginBtn = document.getElementById('loginBtn');
    loginLoading = document.getElementById('loginLoading');
    notification = document.getElementById('notification');
    
    // Check if already logged in
    console.log('🔍 Checking if already authenticated...');
    console.log('Simple Auth available:', typeof simpleIsAuthenticated !== 'undefined');
    
    // Check if user is already authenticated
    if (typeof simpleIsAuthenticated !== 'undefined' && simpleIsAuthenticated()) {
        console.log('✅ User already authenticated, redirecting to dashboard');
        
        // Redirect to dashboard
        const dashboardUrl = window.location.origin.includes('localhost') || window.location.protocol === 'file:' 
            ? 'index.html' 
            : '/index.html';
        
        window.location.href = dashboardUrl;
        return;
    }
    
    // Add event listeners
    setupEventListeners();
    
    // Focus on username input
    usernameInput.focus();
    
    console.log('🔐 Login page initialized');
}

function setupEventListeners() {
    // Form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Enter key handling
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });
    
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
    
    // Input validation
    usernameInput.addEventListener('input', validateForm);
    passwordInput.addEventListener('input', validateForm);
    
    // Clear error states on input
    usernameInput.addEventListener('input', clearErrorStates);
    passwordInput.addEventListener('input', clearErrorStates);
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Validate inputs
    if (!validateInputs(username, password)) {
        return;
    }
    
    try {
        // Show loading
        showLoading(true);
        setFormDisabled(true);
        
        // Attempt login using simple auth
        const user = await simpleLogin(username, password, rememberMe);
        
        // Verify session was saved immediately after login
        const savedSessionCheck = rememberMe ? 
            localStorage.getItem('simpleUser') : 
            sessionStorage.getItem('simpleUser');
        console.log('🔍 Session check after login:', !!savedSessionCheck);
        console.log('🔍 Simple auth authenticated:', simpleIsAuthenticated());
        
        if (!savedSessionCheck) {
            console.error('❌ Session not saved after login!');
            showNotification('Lỗi lưu phiên đăng nhập. Vui lòng thử lại.', 'error');
            return;
        }
        
        // Show success message
        showNotification('Đăng nhập thành công!', 'success');
        
        // Redirect after short delay
        setTimeout(() => {
            // Try different redirect methods
            const redirectUrl = window.location.origin.includes('localhost') || window.location.protocol === 'file:' 
                ? 'index.html' 
                : '/index.html';
            
            console.log('🚀 Redirecting to:', redirectUrl);
            console.log('🚀 Session before redirect:', !!localStorage.getItem('simpleUser') || !!sessionStorage.getItem('simpleUser'));
            window.location.href = redirectUrl;
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Đăng nhập thất bại', 'error');
        
        // Add error states to inputs
        addErrorState(usernameInput);
        addErrorState(passwordInput);
        
        // Focus on username for retry
        usernameInput.focus();
        usernameInput.select();
        
    } finally {
        showLoading(false);
        setFormDisabled(false);
    }
}

// Validate form inputs
function validateInputs(username, password) {
    let isValid = true;
    
    // Clear previous error states
    clearErrorStates();
    
    // Validate username
    if (!username) {
        addErrorState(usernameInput);
        showNotification('Vui lòng nhập tên đăng nhập', 'warning');
        usernameInput.focus();
        isValid = false;
    } else if (username.length < 3) {
        addErrorState(usernameInput);
        showNotification('Tên đăng nhập phải có ít nhất 3 ký tự', 'warning');
        usernameInput.focus();
        isValid = false;
    }
    
    // Validate password
    if (!password) {
        addErrorState(passwordInput);
        showNotification('Vui lòng nhập mật khẩu', 'warning');
        if (isValid) passwordInput.focus();
        isValid = false;
    } else if (password.length < 3) {
        addErrorState(passwordInput);
        showNotification('Mật khẩu phải có ít nhất 3 ký tự', 'warning');
        if (isValid) passwordInput.focus();
        isValid = false;
    }
    
    return isValid;
}

// Validate form for button state
function validateForm() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    const isValid = username.length >= 3 && password.length >= 3;
    
    loginBtn.disabled = !isValid;
    
    if (isValid) {
        loginBtn.classList.remove('disabled');
    } else {
        loginBtn.classList.add('disabled');
    }
}

// Add error state to input
function addErrorState(input) {
    input.style.borderColor = '#e74c3c';
    input.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.1)';
}

// Clear error states
function clearErrorStates() {
    [usernameInput, passwordInput].forEach(input => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    });
}

// Show/hide loading state
function showLoading(show) {
    if (show) {
        loginLoading.classList.remove('hidden');
    } else {
        loginLoading.classList.add('hidden');
    }
}

// Enable/disable form
function setFormDisabled(disabled) {
    usernameInput.disabled = disabled;
    passwordInput.disabled = disabled;
    loginBtn.disabled = disabled;
    
    const rememberMe = document.getElementById('rememberMe');
    if (rememberMe) rememberMe.disabled = disabled;
}

// Show notification
function showNotification(message, type = 'info') {
    const notificationIcon = notification.querySelector('.notification-icon');
    const notificationMessage = notification.querySelector('.notification-message');
    
    // Set icon based on type
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    
    notificationIcon.className = `notification-icon ${iconClass}`;
    notificationMessage.textContent = message;
    
    // Set notification type class
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

// Hide notification
function hideNotification() {
    notification.classList.add('hidden');
}

// Toggle password visibility
function togglePassword() {
    const toggleBtn = document.querySelector('.toggle-password');
    const toggleIcon = toggleBtn.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// Show forgot password modal/form
function showForgotPassword() {
    showNotification('Vui lòng liên hệ quản trị viên để đặt lại mật khẩu', 'info');
}

// Show create account info
function showCreateAccount() {
    showNotification('Vui lòng liên hệ quản trị viên để tạo tài khoản mới', 'info');
}

// Demo login (for testing)
function demoLogin() {
    usernameInput.value = 'admin';
    passwordInput.value = 'admin123';
    validateForm();
    
    showNotification('Đã điền thông tin demo. Nhấn Đăng nhập để tiếp tục.', 'info');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl + D for demo login
    if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        demoLogin();
    }
    
    // Escape to clear form
    if (e.key === 'Escape') {
        usernameInput.value = '';
        passwordInput.value = '';
        clearErrorStates();
        validateForm();
        usernameInput.focus();
    }
});

// Global functions
window.togglePassword = togglePassword;
window.showForgotPassword = showForgotPassword;
window.showCreateAccount = showCreateAccount;
window.demoLogin = demoLogin;

console.log('🔐 Login page logic loaded');
