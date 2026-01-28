// main.js - The complete frontend logic

// --- Configuration ---
// غيّر هذا الرابط إلى رابط السيرفر الخاص بك عند النشر
const API_URL = "https://hhjk-shop-final-v2.loca.lt/";

// --- Helper Functions ---

/**
 * Shows a toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error'.
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/**
 * Parses JWT token to get user data.
 * @param {string} token - The JWT token.
 * @returns {object|null} - Decoded user data or null.
 */
function parseJwt(token) {
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

/**
 * A wrapper for the fetch API to handle auth and errors.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options.
 * @returns {Promise<any>} - The JSON response.
 */
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(API_URL + url, { ...options, headers });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'An error occurred');
        }
        return await response.json();
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// --- UI Update Functions ---

/**
 * Updates the navigation links based on auth state.
 */
function updateNav() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;
    
    const token = localStorage.getItem('token');
    const user = parseJwt(token);

    let links = '<a href="index.html">الرئيسية</a><a href="contact.html">تواصل معنا</a>';
    if (user) {
        links += `<a href="profile.html">ملفي الشخصي</a>`;
        if (user.role === 'admin') {
            links += `<a href="dashboard.html">لوحة التحكم</a>`;
        }
        links += `<a href="#" onclick="handleLogout()">تسجيل الخروج</a>`;
    } else {
        links += `<a href="login.html" class="btn-nav">تسجيل الدخول</a>`;
    }
    navLinks.innerHTML = links;
}

/**
 * Creates a star rating display.
 * @param {number} rating - The average rating.
 * @param {number} count - The number of reviews.
 * @returns {string} - HTML for the stars.
 */
function createStarRating(rating = 0, count = 0) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i class="fas fa-star ${i <= rating ? 'filled' : ''}"></i>`;
    }
    return `<div class="star-rating">${stars} <span class="review-count">(${count})</span></div>`;
}

// --- Authentication ---

async function handleLogin(event) {
    event.preventDefault();
    const email = event.target.email.value;
    const password = event.target.password.value;
    
    try {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        localStorage.setItem('token', data.token);
        showToast('تم تسجيل الدخول بنجاح!');
        
        const user = parseJwt(data.token);
        window.location.href = user.role === 'admin' ? 'dashboard.html' : 'profile.html';
    } catch (error) {
        // Toast is shown by apiFetch
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const email = event.target.email.value;
    const password = event.target.password.value;

    try {
        await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        showToast('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.');
        setTimeout(() => window.location.href = 'login.html', 1500);
    } catch (error) {
        // Toast is shown by apiFetch
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    showToast('تم تسجيل الخروج.');
    setTimeout(() => window.location.href = 'index.html', 1000);
}


// --- Main App Logic (Products, Orders) ---

async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    try {
        const products = await apiFetch('/products');
        if (products.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><p>لا توجد منتجات متاحة حالياً.</p></div>`;
            return;
        }
        
        container.innerHTML = products.map(p => `
            <div class="card" onclick="openProductModal(${p.id})">
                <h3>${p.name}</h3>
                ${createStarRating(p.averageRating, p.reviewCount)}
                <div style="flex-grow: 1;"></div>
                <p class="price">${p.price} ج.م</p>
                <button class="btn" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'نفدت الكمية' : 'عرض التفاصيل'}</button>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div class="empty-state error"><i class="fas fa-server"></i><p>خطأ في الاتصال بالسيرفر.</p></div>`;
    }
}

async function openProductModal(productId) {
    const modal = document.getElementById('productModal');
    const body = document.getElementById('modal-product-body');
    modal.style.display = 'block';
    body.innerHTML = '<div class="loader"></div>';

    try {
        const p = await apiFetch(`/products/${productId}`);
        document.getElementById('modal-product-title').innerText = p.name;
        
        body.innerHTML = `
            <div class="product-details-grid">
                <div class="product-info">
                    <h4>${p.name}</h4>
                    <p class="price">${p.price} ج.م</p>
                    <p class="description">${p.description || 'لا يوجد وصف متاح لهذا المنتج.'}</p>
                    ${p.stock > 0 ? `<p class="stock-info success">متوفر في المخزون (${p.stock})</p>` : `<p class="stock-info error">نفدت الكمية</p>`}
                    <form id="purchaseForm" onsubmit="handlePurchase(event, ${p.id})">
                        <div class="input-group">
                             <input type="text" name="coupon" class="form-control" placeholder="لديك كوبون خصم؟">
                        </div>
                        <button type="submit" class="btn" ${p.stock === 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> ${p.stock === 0 ? 'غير متاح' : 'إتمام الشراء'}
                        </button>
                    </form>
                </div>
                <div class="product-reviews">
                    <h4><i class="fas fa-star"></i> تقييمات العملاء</h4>
                    ${createStarRating(p.averageRating, p.reviewCount)}
                    <div class="reviews-list">
                        ${p.reviews.length > 0 ? p.reviews.map(r => `
                            <div class="review">
                                <div class="review-header"><strong>${r.userEmail.split('@')[0]}</strong> ${createStarRating(r.rating)}</div>
                                <p class="review-comment">${r.comment}</p>
                            </div>
                        `).join('') : '<p class="empty-text">لا توجد تقييمات بعد.</p>'}
                    </div>
                </div>
            </div>
        `;
    } catch(e) {
        body.innerHTML = `<p class="error">حدث خطأ أثناء جلب تفاصيل المنتج.</p>`;
    }
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

async function handlePurchase(event, productId) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('يجب تسجيل الدخول أولاً لإتمام الشراء.', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const couponCode = event.target.coupon.value;
    try {
        const result = await apiFetch('/orders', {
            method: 'POST',
            body: JSON.stringify({ productId, couponCode }),
        });
        showToast('تم إنشاء طلبك بنجاح!');
        closeProductModal();
        window.location.href = 'profile.html';
    } catch (error) {
        // error toast is handled by apiFetch
    }
}


// --- Profile Page ---
async function loadProfile() {
    const profileContainer = document.getElementById('profile-info');
    const ordersContainer = document.getElementById('orders-history');

    try {
        const data = await apiFetch('/users/profile');
        
        profileContainer.innerHTML = `
            <p><strong>البريد الإلكتروني:</strong> ${data.user.email}</p>
            <p><strong>تاريخ الانضمام:</strong> ${new Date(data.user.createdAt).toLocaleDateString('ar-EG')}</p>
        `;

        if (data.orders.length === 0) {
            ordersContainer.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>لا توجد طلبات سابقة.</p></div>`;
            return;
        }

        ordersContainer.innerHTML = data.orders.map(o => `
            <div class="order-item order-status-${o.status}">
                <div class="order-header">
                    <h4>${o.productName}</h4>
                    <span class="order-price">${o.finalPrice} ج.م</span>
                </div>
                <div class="order-body">
                    <p><strong>رقم الطلب:</strong> #${o.id}</p>
                    <p><strong>التاريخ:</strong> ${new Date(o.createdAt).toLocaleString('ar-EG')}</p>
                    <p><strong>الحالة:</strong> <span class="status-badge ${o.status}">${translateStatus(o.status)}</span></p>
                    ${o.status === 'rejected' && o.rejectionReason ? `<div class="rejection-reason"><i class="fas fa-info-circle"></i> <strong>سبب الرفض:</strong> ${o.rejectionReason}</div>` : ''}
                    ${o.status === 'completed' ? renderAccountDetails(o) : ''}
                </div>
            </div>
        `).join('');
    } catch (e) {
        // Redirect if not authorized
        window.location.href = 'login.html';
    }
}

function translateStatus(status) {
    const map = { pending: 'قيد المراجعة', completed: 'مكتمل', rejected: 'مرفوض' };
    return map[status] || status;
}

function renderAccountDetails(order) {
    let details = '<div class="account-details">';
    if (order.accountDetails.type === 'netflix-full') {
        details += `
            <p><strong>الإيميل:</strong> ${order.accountDetails.email} <button class="copy-btn" onclick="copyToClipboard(this, '${order.accountDetails.email}')"><i class="far fa-copy"></i></button></p>
            <p><strong>كلمة المرور:</strong> ${order.accountDetails.password} <button class="copy-btn" onclick="copyToClipboard(this, '${order.accountDetails.password}')"><i class="far fa-copy"></i></button></p>
        `;
    } else {
        details += `
            <p><strong>الإيميل:</strong> ${order.accountDetails.email} <button class="copy-btn" onclick="copyToClipboard(this, '${order.accountDetails.email}')"><i class="far fa-copy"></i></button></p>
            <p><strong>البروفايل:</strong> ${order.accountDetails.profileName}</p>
            <p><strong>PIN:</strong> ${order.accountDetails.profilePin}</p>
        `;
    }
    return details + '</div>';
}

function copyToClipboard(element, text) {
    navigator.clipboard.writeText(text);
    element.classList.add('copied');
    setTimeout(() => element.classList.remove('copied'), 1500);
}


// --- Admin Dashboard ---
function showSection(id, element) {
    document.querySelectorAll('.admin-section').forEach(sec => sec.style.display = 'none');
    document.getElementById('section-' + id).style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // Load content for the section
    switch(id) {
        case 'dashboard': loadAdminDashboard(); break;
        case 'orders': loadAdminOrders(); break;
        // Add cases for other admin sections later
    }
}

async function loadAdminDashboard() {
    const container = document.getElementById('section-dashboard');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';

    try {
        const stats = await apiFetch('/admin/stats');
        container.innerHTML = `
            <h3><i class="fas fa-tachometer-alt"></i> نظرة عامة</h3>
            <div class="grid-4">
                <div class="stat-card">
                    <h4>الأرباح الكلية</h4>
                    <p style="color: var(--success);">${stats.totalRevenue} ج.م</p>
                </div>
                <div class="stat-card">
                    <h4>الطلبات قيد الانتظار</h4>
                    <p style="color: var(--warning);">${stats.pendingOrders}</p>
                </div>
                <div class="stat-card">
                    <h4>إجمالي الطلبات</h4>
                    <p>${stats.totalOrders}</p>
                </div>
                <div class="stat-card">
                    <h4>عدد المستخدمين</h4>
                    <p>${stats.totalUsers}</p>
                </div>
            </div>
        `;
    } catch(e) {
        container.innerHTML = `<p class="error">خطأ في تحميل الإحصائيات.</p>`;
    }
}

async function loadAdminOrders() {
    const container = document.getElementById('section-orders');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    
    try {
        const orders = await apiFetch('/admin/orders');
        // ... build and render orders table ...
        container.innerHTML = `<h3><i class="fas fa-box-open"></i> إدارة الطلبات (${orders.length})</h3>`;
        // And so on... this part can be very detailed.
    } catch(e) {
        container.innerHTML = `<p class="error">خطأ في تحميل الطلبات.</p>`;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', updateNav);
