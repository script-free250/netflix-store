const API_BASE_URL = '/api/v2';
let userToken = localStorage.getItem('token');
let userEmail = localStorage.getItem('email');

document.addEventListener('DOMContentLoaded', () => {
    updateNavUI();
    const path = window.location.pathname;
    if (path === '/' || path.endsWith('index.html')) loadProducts();
    if (path.startsWith('/profile')) loadUserProfile();
    if (path.startsWith('/login') || path.startsWith('/register')) setupAuthForms();
});

// --- UI & Auth Management ---
function updateNavUI() {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;
    if (userToken) {
        navAuth.innerHTML = `
            <a href="/profile.html" class="nav-item">صفحتي الشخصية</a>
            <a href="#" onclick="logout()" class="nav-item">تسجيل الخروج</a>
        `;
    } else {
        navAuth.innerHTML = `
            <a href="/login.html" class="nav-item">تسجيل الدخول</a>
            <a href="/register.html" class="nav-btn">حساب جديد</a>
        `;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    userToken = null; userEmail = null;
    showToast('تم تسجيل الخروج بنجاح.');
    setTimeout(() => window.location.href = '/', 1000);
}

function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if(loginForm) loginForm.addEventListener('submit', (e) => handleAuth(e, 'login'));
    if(registerForm) registerForm.addEventListener('submit', (e) => handleAuth(e, 'register'));
}

async function handleAuth(event, type) {
    event.preventDefault();
    const form = event.target;
    const btn = form.querySelector('button');
    btn.disabled = true;
    const email = form.email.value;
    const password = form.password.value;
    const endpoint = type === 'login' ? 'login' : 'register';

    try {
        const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            if (type === 'login') {
                localStorage.setItem('token', data.token);
                localStorage.setItem('email', data.email);
                showToast('أهلاً بك مجددًا!', 'success');
                setTimeout(() => window.location.href = (data.isAdmin ? '/admin.html' : '/'), 1000);
            } else {
                showToast('تم التسجيل بنجاح!', 'success');
                setTimeout(() => window.location.href = '/login.html', 1000);
            }
        } else {
            showToast(data.message || 'حدث خطأ', 'error');
        }
    } catch (err) { showToast('خطأ في الشبكة.', 'error'); }
    finally { btn.disabled = false; }
}

// --- Product Loading & Modal ---
async function loadProducts() {
    const container = document.getElementById('products-container');
    container.innerHTML = '<div class="loader"></div>';
    try {
        const res = await fetch(`${API_BASE_URL}/products`);
        const products = await res.json();
        container.innerHTML = '';
        if (products.length === 0) {
            container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><i class="fas fa-store-slash"></i><p>لا توجد منتجات حاليًا.</p></div>`;
            return;
        }
        products.forEach((p, i) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${i * 100}ms`;
            card.innerHTML = `
                <div class="rating">${'★'.repeat(Math.round(p.avg_rating || 0))}${'☆'.repeat(5 - Math.round(p.avg_rating || 0))} <span class="review-count">(${p.review_count || 0})</span></div>
                <h3>${p.name}</h3>
                <p class="price">${p.price} ج.م</p>
                <button class="btn" onclick="openProductModal(${p.id})">عرض التفاصيل</button>
            `;
            container.appendChild(card);
        });
    } catch(err) { container.innerHTML = `<p>فشل تحميل المنتجات.</p>`; }
}

async function openProductModal(id) {
    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('product-modal-content');
    content.innerHTML = '<div class="loader"></div>';
    modal.style.display = 'block';

    try {
        const res = await fetch(`${API_BASE_URL}/products/${id}`);
        const { product, reviews } = await res.json();
        
        content.innerHTML = `
            <div class="modal-header"><h3>${product.name}</h3><span class="close" onclick="closeModal('productDetailModal')">&times;</span></div>
            <div class="product-detail-grid">
                <div class="product-info">
                    <p>${product.description || 'لا يوجد وصف متاح.'}</p>
                    <div class="reviews-section">
                        <h4>التقييمات (${reviews.length})</h4>
                        <div id="reviews-list"></div>
                        ${userToken ? `
                            <form id="review-form">
                                <h5>أضف تقييمك</h5>
                                <div class="form-group">
                                    <div class="star-rating" id="add-rating">
                                        <span data-value="5">☆</span><span data-value="4">☆</span><span data-value="3">☆</span><span data-value="2">☆</span><span data-value="1">☆</span>
                                    </div>
                                    <input type="hidden" name="rating" id="rating-value" value="0">
                                </div>
                                <div class="form-group">
                                    <textarea name="comment" class="form-control" placeholder="اكتب تعليقك..."></textarea>
                                </div>
                                <button type="submit" class="btn">إرسال التقييم</button>
                            </form>
                        ` : '<p><a href="/login.html">سجل الدخول</a> لإضافة تقييم.</p>'}
                    </div>
                </div>
                <div class="product-actions">
                    <p class="price" id="final-price">${product.price} ج.م</p>
                    <div class="form-group coupon-input">
                        <input type="text" id="coupon-code" class="form-input" placeholder="أدخل كوبون الخصم">
                        <button class="btn btn-secondary" style="width: auto; margin-top: 0;" onclick="applyCoupon(${product.price})">تطبيق</button>
                    </div>
                    <div id="coupon-status"></div>
                    <div class="form-group">
                        <label>رقم هاتف فودافون كاش</label>
                        <input type="tel" id="customer-phone" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label>إيصال التحويل (اختياري)</label>
                        <input type="file" id="receipt-image" class="form-input">
                    </div>
                    <button class="btn" onclick="createOrder(${product.id})">تأكيد الشراء</button>
                </div>
            </div>
        `;

        const reviewsList = document.getElementById('reviews-list');
        if(reviews.length > 0) {
            reviews.forEach(r => reviewsList.innerHTML += `<div class="review-card"><p class="author">${r.email.split('@')[0]}</p><div class="rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><p>${r.comment}</p></div>`);
        } else {
            reviewsList.innerHTML = '<p>لا توجد تقييمات لهذا المنتج بعد.</p>';
        }

        // Add event listeners for star rating and review form
        document.querySelectorAll('#add-rating span').forEach(star => {
            star.addEventListener('click', () => {
                const ratingValue = star.dataset.value;
                document.getElementById('rating-value').value = ratingValue;
                document.querySelectorAll('#add-rating span').forEach(s => {
                    s.classList.toggle('active', s.dataset.value <= ratingValue);
                });
            });
        });

        document.getElementById('review-form')?.addEventListener('submit', (e) => submitReview(e, product.id));

    } catch (err) { content.innerHTML = '<p>فشل تحميل تفاصيل المنتج.</p>'; }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ... Rest of the functions for coupons, orders, profile, etc. ...

// --- Toast Notifications ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'none';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
