// ✅ تأكد من تحديث الرابط عند تشغيل السيرفر
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

/* =================================================================
   🔐 دوال المصادقة وتسجيل الدخول (Authentication)
   ================================================================= */
   
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const btn = form.querySelector('button');
    const email = form.querySelector('#email').value;
    const password = form.querySelector('#password').value;
    const errorMessage = form.querySelector('#error-message');
    const successMessage = form.querySelector('#success-message');

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    try {
        const res = await fetch(`${SERVER_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            successMessage.innerText = data.message;
            successMessage.style.display = 'block';
            form.reset();
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        } else {
            errorMessage.innerText = data.message;
            errorMessage.style.display = 'block';
        }
    } catch (e) {
        errorMessage.innerText = 'فشل الاتصال بالسيرفر.';
        errorMessage.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'إنشاء حساب';
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const btn = form.querySelector('button');
    const email = form.querySelector('#email').value;
    const password = form.querySelector('#password').value;
    const errorMessage = form.querySelector('#error-message');

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    errorMessage.style.display = 'none';

    try {
        const res = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userEmail', data.email);
            window.location.href = 'index.html';
        } else {
            errorMessage.innerText = data.message;
            errorMessage.style.display = 'block';
        }
    } catch (e) {
        errorMessage.innerText = 'فشل الاتصال بالسيرفر.';
        errorMessage.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'دخول';
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    window.location.href = 'index.html';
}

function updateUserSessionUI() {
    const userSessionDiv = document.getElementById('user-session');
    if (!userSessionDiv) return;

    const token = localStorage.getItem('authToken');
    const email = localStorage.getItem('userEmail');

    if (token && email) {
        userSessionDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="color: #ccc;">أهلاً، ${email}</span>
                <button onclick="logout()" class="btn" style="width: auto; padding: 8px 15px; margin: 0; font-size: 0.9rem;">
                    <i class="fas fa-sign-out-alt"></i> خروج
                </button>
            </div>
        `;
    } else {
        userSessionDiv.innerHTML = `
            <div style="display: flex; gap: 10px;">
                <a href="login.html" class="btn-outline">تسجيل الدخول</a>
                <a href="register.html" class="btn" style="width: auto; padding: 10px 20px; margin: 0;">حساب جديد</a>
            </div>
        `;
    }
}


/* =================================================================
   🛒 دوال المستخدم (المتجر - الشراء) - نسخة محسنة
   ================================================================= */

// (loadProducts, openBuyModal, closeModal and window.onclick remain the same)
async function loadProducts() { /* ... الكود الأصلي بدون تغيير ... */ }
function openBuyModal(id, name) { /* ... الكود الأصلي بدون تغيير ... */ }
function closeModal() { /* ... الكود الأصلي بدون تغيير ... */ }
window.onclick = function(event) { if (event.target == document.getElementById('buyModal')) closeModal(); }

async function submitOrder(e) {
    e.preventDefault();

    const token = localStorage.getItem('authToken');
    if (!token) {
        alert("يجب تسجيل الدخول أولاً لإكمال عملية الشراء.");
        window.location.href = 'login.html';
        return;
    }

    const btn = e.target.querySelector('button');
    btn.disabled = true; 
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الرفع...`;

    const formData = new FormData(e.target);

    try {
        const res = await fetch(`${SERVER_URL}/buy`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }, // <-- إضافة التوكن
            body: formData 
        });
        const data = await res.json();
        
        if (res.ok) {
            closeModal();
            e.target.reset();
            document.getElementById('file-label-text').innerText = "اضغط لإرفاق صورة التحويل";
            document.querySelector('.upload-content').style.color = "var(--text-muted)";
            alert("✅ تم إرسال طلبك بنجاح!\nيمكنك متابعة حالة الطلب من 'سجل طلباتك'.");
            loadMyOrdersWidget();
        } else {
            alert(data.message || "حدث خطأ أثناء إرسال الطلب.");
        }
    } catch (error) { 
        alert("فشل الاتصال بالسيرفر. يرجى المحاولة مرة أخرى."); 
    }
    
    btn.disabled = false; 
    btn.innerHTML = `<i class="fas fa-check-circle"></i> تأكيد الشراء`;
}

// تعديل: جلب الطلبات من السيرفر بدلاً من التخزين المحلي
async function loadMyOrdersWidget() {
    const section = document.getElementById('my-orders-list');
    if (!section) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
        section.innerHTML = '<p style="color:var(--text-muted); text-align:center;">يرجى <a href="login.html" style="color: var(--primary);">تسجيل الدخول</a> لعرض طلباتك.</p>'; 
        return;
    }

    section.innerHTML = '<div class="loader"></div>';

    try {
        const res = await fetch(`${SERVER_URL}/api/my-orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
             if(res.status === 401 || res.status === 403) logout(); // تسجيل الخروج إذا كان التوكن غير صالح
             throw new Error('Failed to fetch orders');
        }

        const orders = await res.json();
        orders.reverse();
        
        if (!orders.length) { 
            section.innerHTML = '<p style="color:var(--text-muted); text-align:center;">لا توجد طلبات سابقة.</p>'; 
            return; 
        }

        section.innerHTML = '';
        orders.forEach(async (o, index) => {
            let statusText = "قيد المراجعة";
            if (o.status === 'approved') statusText = "جاهز للعرض";
            if (o.status === 'completed') statusText = "مكتمل";

            const card = document.createElement('div');
            card.className = 'order-mini-card';
            card.style.animationDelay = `${index * 100}ms`;
            card.setAttribute('onclick', `window.location.href='track.html?id=${o.orderId}'`);
            
            card.innerHTML = `
                <div>
                    <strong>${o.productName}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-muted)">#${o.orderId}</span>
                </div>
                <span class="order-status ${o.status}">${statusText}</span>
            `;
            section.appendChild(card);
        });
    } catch (e) {
        section.innerHTML = '<p style="color: var(--primary); text-align: center;">حدث خطأ أثناء جلب الطلبات.</p>';
    }
}


/* =================================================================
   📡 دوال صفحة التتبع (track.html) - بدون تغيير
   ================================================================= */
// All functions related to track page and admin page remain the same
// initTrackPage, showFinalCode, getCode, addProduct, loadAdminOrders, approve
async function initTrackPage() { /* ... الكود الأصلي بدون تغيير ... */ }
function showFinalCode(code) { /* ... الكود الأصلي بدون تغيير ... */ }
async function getCode() { /* ... الكود الأصلي بدون تغيير ... */ }
async function addProduct(e) { /* ... الكود الأصلي بدون تغيير ... */ }
async function loadAdminOrders() { /* ... الكود الأصلي بدون تغيير ... */ }
async function approve(id) { /* ... الكود الأصلي بدون تغيير ... */ }


/* =================================================================
   🚀 تهيئة الصفحات عند التحميل
   ================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    // تشغيل الدوال بناءً على الصفحة الحالية
    if (document.getElementById('products-container')) {
        updateUserSessionUI();
        loadProducts();
    }
    if (window.location.pathname.includes('track.html')) {
        initTrackPage();
    }
    if (document.getElementById('section-orders')) {
        loadAdminOrders();
    }
});
