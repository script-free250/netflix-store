// !!! مهم جدًا: ضع هنا رابط السيرفر الخلفي الخاص بك !!!
const API_BASE_URL = "https://hhjk-shop-final-v2.loca.lt/"; // مثال: https://my-store-backend.onrender.com

let userToken = localStorage.getItem('token');
let userEmail = localStorage.getItem('email');
let appliedCoupon = null;

// --- Main Initializer ---
document.addEventListener('DOMContentLoaded', () => {
    updateNavUI();
    const path = window.location.pathname;
    if (path.endsWith('/') || path.endsWith('index.html')) {
        loadProducts();
    }
    if (path.includes('profile.html')) {
        loadUserProfile();
    }
    if (path.includes('login.html') || path.includes('register.html')) {
        setupAuthForms();
    }
});

// --- UI & Auth Management ---
function updateNavUI() {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;
    if (userToken) {
        navAuth.innerHTML = `
            <a href="profile.html" class="nav-item">صفحتي الشخصية</a>
            <a href="#" onclick="logout()" class="nav-item">تسجيل الخروج</a>
        `;
    } else {
        navAuth.innerHTML = `
            <a href="login.html" class="nav-item">تسجيل الدخول</a>
            <a href="register.html" class="nav-btn">حساب جديد</a>
        `;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    userToken = null; userEmail = null;
    showToast('تم تسجيل الخروج بنجاح.');
    setTimeout(() => window.location.href = 'index.html', 1000);
}

function setupAuthForms() {
    const form = document.querySelector('form');
    if (form) {
        const type = form.id.includes('login') ? 'login' : 'register';
        form.addEventListener('submit', (e) => handleAuth(e, type));
    }
}

async function handleAuth(event, type) {
    event.preventDefault();
    const form = event.target;
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    const email = form.email.value;
    const password = form.password.value;
    const endpoint = type === 'login' ? 'login' : 'register';

    try {
        const res = await fetch(`${API_BASE_URL}/api/v2/${endpoint}`, {
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
                setTimeout(() => window.location.href = (data.isAdmin ? 'admin.html' : 'index.html'), 1000);
            } else {
                showToast('تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول.', 'success');
                setTimeout(() => window.location.href = 'login.html', 1500);
            }
        } else {
            showToast(data.message || 'حدث خطأ', 'error');
        }
    } catch (err) { showToast('خطأ في الشبكة.', 'error'); }
    finally { btn.disabled = false; btn.textContent = type === 'login' ? 'دخول' : 'إنشاء الحساب'; }
}

// --- Product Loading & Modal ---
async function loadProducts() {
    const container = document.getElementById('products-container');
    if(!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const res = await fetch(`${API_BASE_URL}/api/v2/products`);
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
                <div class="rating">${'★'.repeat(Math.round(p.avg_rating || 0))}${'☆'.repeat(5 - Math.round(p.avg_rating || 0))} <span class="review-count">(${p.review_count || 0} مراجعات)</span></div>
                <h3>${p.name}</h3>
                <p class="price">${p.price} ج.م</p>
                <button class="btn" onclick="openProductModal(${p.id})">عرض التفاصيل</button>
            `;
            container.appendChild(card);
        });
    } catch(err) { container.innerHTML = `<p style="color:var(--primary);">فشل تحميل المنتجات. تأكد من أن السيرفر يعمل.</p>`; }
}

async function openProductModal(id) {
    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('product-modal-content');
    content.innerHTML = '<div class="loader"></div>';
    modal.style.display = 'block';
    appliedCoupon = null; // Reset coupon on new modal open

    try {
        const res = await fetch(`${API_BASE_URL}/api/v2/products/${id}`);
        const { product, reviews } = await res.json();
        
        content.innerHTML = `
            <div class="modal-header"><h3>${product.name}</h3><span class="close" onclick="closeModal('productDetailModal')">&times;</span></div>
            <div class="product-detail-grid">
                <div class="product-info">
                    <p>${product.description || 'لا يوجد وصف متاح.'}</p>
                    <div class="reviews-section">
                        <h4>التقييمات (${reviews.length})</h4>
                        <div id="reviews-list" class="reviews-list-container"></div>
                        ${userToken ? `
                            <form id="review-form" onsubmit="submitReview(event, ${product.id})">
                                <h5>أضف تقييمك</h5>
                                <div class="form-group">
                                    <div class="star-rating" id="add-rating">
                                        <span data-value="5">☆</span><span data-value="4">☆</span><span data-value="3">☆</span><span data-value="2">☆</span><span data-value="1">☆</span>
                                    </div>
                                    <input type="hidden" name="rating" id="rating-value" value="0">
                                </div>
                                <div class="form-group"><textarea name="comment" class="form-control" placeholder="اكتب تعليقك..."></textarea></div>
                                <button type="submit" class="btn">إرسال التقييم</button>
                            </form>
                        ` : '<p>يجب <a href="login.html">تسجيل الدخول</a> لإضافة تقييم.</p>'}
                    </div>
                </div>
                <div class="product-actions">
                    <p class="price" id="final-price">${product.price} ج.م</p>
                    <div class="form-group coupon-input">
                        <input type="text" id="coupon-code-input" class="form-input" placeholder="أدخل كوبون الخصم">
                        <button class="btn btn-secondary" style="width: auto; margin-top: 0;" onclick="applyCoupon(${product.price})">تطبيق</button>
                    </div>
                    <div id="coupon-status"></div>
                    <div class="form-group"><label>رقم هاتف فودافون كاش</label><input type="tel" id="customer-phone" class="form-input" required></div>
                    <div class="form-group"><label>إيصال التحويل (اختياري)</label><input type="file" id="receipt-image" class="form-input" accept="image/*"></div>
                    <button class="btn" onclick="createOrder(${product.id}, ${product.price})">تأكيد الشراء</button>
                </div>
            </div>`;
        
        const reviewsList = document.getElementById('reviews-list');
        reviewsList.innerHTML = reviews.length ? reviews.map(r => `<div class="review-card"><p class="author">${r.email.split('@')[0]}</p><div class="rating">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><p>${r.comment}</p></div>`).join('') : '<p>لا توجد تقييمات لهذا المنتج بعد.</p>';
        setupStarRating();
    } catch (err) { content.innerHTML = '<p>فشل تحميل تفاصيل المنتج.</p>'; }
}

function closeModal(modalId) { document.getElementById(modalId).style.display = 'none'; }

function setupStarRating() {
    const stars = document.querySelectorAll('#add-rating span');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const ratingValue = star.dataset.value;
            document.getElementById('rating-value').value = ratingValue;
            stars.forEach(s => s.classList.toggle('active', s.dataset.value <= ratingValue));
        });
    });
}

// --- Reviews, Coupons, Orders ---
async function submitReview(event, productId) {
    event.preventDefault();
    if (!userToken) return showToast('يجب تسجيل الدخول أولاً', 'error');
    const form = event.target;
    const rating = form.rating.value;
    if (rating === "0") return showToast('الرجاء تحديد تقييم (عدد النجوم)', 'error');
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/v2/products/${productId}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
            body: JSON.stringify({ rating, comment: form.comment.value })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('شكراً لك، تم إضافة تقييمك!', 'success');
            openProductModal(productId);
        } else throw new Error(data.message);
    } catch(err) { showToast(err.message || 'فشل إرسال التقييم', 'error'); }
}

async function applyCoupon(originalPrice) {
    const code = document.getElementById('coupon-code-input').value;
    const statusEl = document.getElementById('coupon-status');
    const priceEl = document.getElementById('final-price');
    if (!code) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/v2/apply-coupon`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (res.ok) {
            const newPrice = originalPrice * (1 - data.discount / 100);
            priceEl.innerHTML = `<del style="color:var(--text-muted);">${originalPrice} ج.م</del> ${newPrice.toFixed(2)} ج.م`;
            statusEl.textContent = `تم تطبيق خصم ${data.discount}% بنجاح!`;
            statusEl.style.color = 'var(--success)';
            appliedCoupon = data.code;
        } else {
            priceEl.textContent = `${originalPrice} ج.م`;
            statusEl.textContent = data.message;
            statusEl.style.color = 'var(--primary)';
            appliedCoupon = null;
        }
    } catch (err) { statusEl.textContent = 'خطأ في الشبكة.'; }
}

async function createOrder(productId) {
    if (!userToken) return showToast('الرجاء تسجيل الدخول أولاً لإكمال الشراء', 'error');
    const phone = document.getElementById('customer-phone').value;
    if (!phone) return showToast('الرجاء إدخال رقم الهاتف', 'error');

    const formData = new FormData();
    formData.append('productId', productId);
    formData.append('customerPhone', phone);
    if (appliedCoupon) formData.append('couponCode', appliedCoupon);
    
    const receiptFile = document.getElementById('receipt-image').files[0];
    if (receiptFile) formData.append('receiptImage', receiptFile);

    try {
        const res = await fetch(`${API_BASE_URL}/api/v2/create-order`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${userToken}` }, body: formData
        });
        const data = await res.json();
        if (res.ok) {
            showToast('تم إنشاء طلبك بنجاح!', 'success');
            closeModal('productDetailModal');
            setTimeout(() => window.location.href = 'profile.html', 1500);
        } else {
            showToast(data.message || 'فشل إنشاء الطلب', 'error');
        }
    } catch (err) { showToast('خطأ في الشبكة.', 'error'); }
}

// --- Profile Page ---
async function loadUserProfile() {
    const container = document.getElementById('profile-container');
    if (!userToken) return window.location.href = 'login.html';
    container.innerHTML = '<div class="loader"></div>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/v2/profile`, { headers: { 'Authorization': `Bearer ${userToken}` }});
        if (!res.ok) throw new Error('Failed to fetch profile');
        const data = await res.json();
        
        container.innerHTML = `
            <h2>أهلاً بك، ${data.user.email}</h2>
            <h3 class="section-title" style="margin-top: 30px;">سجل طلباتك:</h3>
            <div id="user-orders-list"></div>`;
        
        const ordersList = document.getElementById('user-orders-list');
        if (data.orders.length === 0) {
            ordersList.innerHTML = '<p>لم تقم بأي طلبات بعد.</p>';
        } else {
            ordersList.innerHTML = data.orders.map(order => `
                <div class="order-history-card">
                    <div>
                        <strong>الطلب #${order.id}</strong>
                        <p style="color:var(--text-dark);">المنتجات: ${order.product_names}</p>
                    </div>
                    <div>
                        <p>${new Date(order.created_at).toLocaleDateString()}</p>
                        <p>${order.total_amount.toFixed(2)} ج.م</p>
                    </div>
                    <span class="order-status-tag ${order.status}">${order.status}</span>
                </div>
            `).join('');
        }
    } catch(err) { logout(); }
}

// --- Toast Notifications ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animationName = 'slide-out';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

