// ✅ تأكد من تحديث الرابط عند تشغيل السيرفر
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt";

/* =================================================================
   🔐 دوال المصادقة وتسجيل الدخول (Authentication)
   ================================================================= */
   
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const btn = form.querySelector('button');
    // ## تعديل: إضافة الاسم ##
    const name = form.querySelector('#name').value;
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
            // ## تعديل: إرسال الاسم ##
            body: JSON.stringify({ name, email, password })
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
            // ## تعديل: حفظ الاسم ##
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userEmail', data.email);
            localStorage.setItem('userName', data.name); // <-- حفظ الاسم
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
    localStorage.removeItem('userName'); // ## تعديل: حذف الاسم ##
    window.location.href = 'index.html';
}

function updateUserSessionUI() {
    const userSessionDiv = document.getElementById('user-session');
    if (!userSessionDiv) return;

    const token = localStorage.getItem('authToken');
    const name = localStorage.getItem('userName'); // ## تعديل: استخدام الاسم ##

    if (token && name) {
        // ## تعديل: عرض رسالة ترحيب بالاسم ##
        userSessionDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="color: #ccc;">أهلاً، ${name}</span>
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
   🛒 دوال المتجر والشراء
   ================================================================= */

/**
 * ## إصلاح: إعادة دالة تحميل المنتجات التي حُذفت بالخطأ
 */
async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: {'Bypass-Tunnel-Reminder': 'true'} });
        if (!res.ok) {
             console.error('Network response was not ok');
             throw new Error('Network response was not ok');
        }
        const products = await res.json();
        
        container.innerHTML = products.length ? '' : '<p style="text-align:center; width:100%;">لا توجد منتجات متاحة حالياً.</p>';

        products.forEach((p, index) => {
            const isUser = p.type === 'netflix-user';
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${index * 100}ms`;
            
            card.innerHTML = `
                <span class="tag">${isUser ? '👤 بروفايل مشترك' : '💎 حساب كامل'}</span>
                <h3>${p.name}</h3>
                <div style="flex-grow: 1;"></div>
                <span class="price">${p.price} ج.م</span>
                <button class="btn" onclick="openBuyModal(${p.id}, '${p.name}')">شراء الآن</button>
            `;
            container.appendChild(card);
        });
        
    } catch (e) { 
        console.error("Fetch Error:", e);
        container.innerHTML = `<p style="text-align:center; color:var(--primary); width:100%;">خطأ في الاتصال بالسيرفر.<br>تأكد من أن السيرفر يعمل وأن الرابط صحيح.</p>`;
    }
}

function openBuyModal(id, name) {
    document.getElementById('buyModal').style.display = 'block';
    document.getElementById('modal-product-name').innerText = name;
    document.getElementById('modal-product-id').value = id;
}

function closeModal() { 
    document.getElementById('buyModal').style.display = 'none'; 
}
window.onclick = function(event) { 
    if (event.target == document.getElementById('buyModal')) {
        closeModal();
    }
}

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
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData 
        });
        const data = await res.json();
        if (res.ok) {
            closeModal();
            e.target.reset();
            document.getElementById('file-label-text').innerText = "اضغط لإرفاق صورة التحويل";
            document.querySelector('.upload-content').style.color = "var(--text-muted)";
            alert("✅ تم إرسال طلبك بنجاح!");
            loadMyOrdersWidget();
        } else {
            alert(data.message || "حدث خطأ أثناء إرسال الطلب.");
        }
    } catch (error) { 
        alert("فشل الاتصال بالسيرفر."); 
    }
    btn.disabled = false; 
    btn.innerHTML = `<i class="fas fa-check-circle"></i> تأكيد الشراء`;
}

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
             if(res.status === 401 || res.status === 403) logout();
             throw new Error('Failed to fetch orders');
        }
        const orders = await res.json();
        orders.reverse();
        if (!orders.length) { 
            section.innerHTML = '<p style="color:var(--text-muted); text-align:center;">لا توجد طلبات سابقة.</p>'; 
            return; 
        }
        section.innerHTML = '';
        orders.forEach((o, index) => {
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
   📡 دوال صفحات التتبع والأدمن (بدون تغيير)
   ================================================================= */
async function initTrackPage() { /* الكود الأصلي */ }
function showFinalCode(code) { /* الكود الأصلي */ }
async function getCode() { /* الكود الأصلي */ }
async function addProduct(e) { /* الكود الأصلي */ }
async function loadAdminOrders() { /* الكود الأصلي */ }
async function approve(id) { /* الكود الأصلي */ }


/* =================================================================
   🚀 تهيئة الصفحات عند التحميل
   ================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    // تشغيل الدوال بناءً على الصفحة الحالية
    const path = window.location.pathname;

    if (document.getElementById('products-container')) {
        updateUserSessionUI();
        loadProducts(); // <-- استدعاء الدالة الصحيحة
        loadMyOrdersWidget();
    }
    if (path.includes('track.html')) {
        // initTrackPage(); // تم نقل هذا المنطق إلى الصفحة نفسها
    }
    if (document.getElementById('section-orders')) {
       // loadAdminOrders(); // تم نقل هذا المنطق إلى الصفحة نفسها
    }
});
