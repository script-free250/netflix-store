// ✅ تأكد من تحديث الرابط عند تشغيل السيرفر
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt";

/* =================================================================
   🔐 1. دوال المصادقة وتسجيل الدخول
   ================================================================= */

async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const btn = form.querySelector('button');
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
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userEmail', data.email);
            localStorage.setItem('userName', data.name);
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
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
}

function updateUserSessionUI() {
    const userSessionDiv = document.getElementById('user-session');
    if (!userSessionDiv) return;

    const token = localStorage.getItem('authToken');
    const name = localStorage.getItem('userName');

    if (token && name) {
        userSessionDiv.innerHTML = `<div style="display:flex;align-items:center;gap:15px;"><span style="color:#ccc;">أهلاً، ${name}</span><button onclick="logout()" class="btn" style="width:auto;padding:8px 15px;margin:0;font-size:0.9rem;"><i class="fas fa-sign-out-alt"></i> خروج</button></div>`;
    } else {
        userSessionDiv.innerHTML = `<div style="display:flex;gap:10px;"><a href="login.html" class="btn-outline">تسجيل الدخول</a><a href="register.html" class="btn" style="width:auto;padding:10px 20px;margin:0;">حساب جديد</a></div>`;
    }
}


/* =================================================================
   🛒 2. دوال المتجر والشراء
   ================================================================= */

async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: { 'Bypass-Tunnel-Reminder': 'true' } });
        if (!res.ok) throw new Error(`Network response error: ${res.status}`);
        const products = await res.json();
        container.innerHTML = '';
        if (products.length === 0) {
            container.innerHTML = '<p style="text-align:center;">لا توجد منتجات متاحة حالياً.</p>';
            return;
        }
        products.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${index * 100}ms`;
            card.innerHTML = `
                <span class="tag">${p.type === 'netflix-user' ? '👤 بروفايل' : '💎 حساب كامل'}</span>
                <h3>${p.name}</h3>
                <div style="flex-grow:1;"></div>
                <span class="price">${p.price} ج.م</span>
                <button class="btn" onclick="openBuyModal(${p.id},'${p.name}')">شراء الآن</button>`;
            container.appendChild(card);
        });
    } catch (e) {
        console.error("Product loading failed:", e);
        container.innerHTML = `<p style="text-align:center; color:var(--primary);">خطأ في عرض الباقات.</p>`;
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

async function submitOrder(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert("يجب تسجيل الدخول أولاً لإتمام عملية الشراء.");
        window.location.href = 'login.html';
        return;
    }
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...`;
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
            alert("✅ تم إرسال طلبك بنجاح!");
            loadMyOrdersWidget();
        } else {
            alert(data.message || "حدث خطأ غير متوقع.");
        }
    } catch (error) {
        alert("فشل الاتصال بالسيرفر. يرجى المحاولة مرة أخرى.");
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
        const res = await fetch(`${SERVER_URL}/api/my-orders`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) logout(); //
            throw new Error('Failed to fetch orders');
        }
        let orders = await res.json();
        orders.reverse();
        section.innerHTML = '';
        if (!orders.length) {
            section.innerHTML = '<p style="color:var(--text-muted); text-align:center;">لا توجد طلبات سابقة.</p>';
            return;
        }
        orders.forEach(o => {
            let statusText = o.status === 'approved' ? 'جاهز للعرض' : (o.status === 'completed' ? 'مكتمل' : 'قيد المراجعة');
            const card = document.createElement('div');
            card.className = 'order-mini-card';
            card.setAttribute('onclick', `window.location.href='track.html?id=${o.orderId}'`);
            card.innerHTML = `<div><strong>${o.productName}</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">#${o.orderId}</span></div><span class="order-status ${o.status}">${statusText}</span>`;
            section.appendChild(card);
        });
    } catch (e) {
        section.innerHTML = '<p style="color: var(--primary); text-align: center;">حدث خطأ أثناء جلب الطلبات.</p>';
    }
}


/* =================================================================
   🔧 3. دوال لوحة الأدمن
   ================================================================= */

function showSection(id, element) {
    document.querySelectorAll('.content-area > div').forEach(s => s.style.display = 'none');
    document.getElementById('section-' + id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');
}

function toggleProductFields() {
    if (!document.getElementById('p-type')) return;
    const type = document.getElementById('p-type').value;
    document.getElementById('fields-full').style.display = type === 'netflix-full' ? 'block' : 'none';
    document.getElementById('fields-user').style.display = type === 'netflix-user' ? 'block' : 'none';
}

async function addProduct(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = "جاري النشر...";
    const formData = new FormData(e.target);
    try {
        const res = await fetch(`${SERVER_URL}/admin/add-product`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            alert("✅ تم نشر المنتج بنجاح!");
            e.target.reset();
            toggleProductFields();
        } else {
            alert("فشل نشر المنتج.");
        }
    } catch (err) {
        alert("خطأ في الاتصال بالسيرفر.");
    }
    btn.disabled = false;
    btn.innerText = "🚀 نشر المنتج";
}

async function loadAdminOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
        let orders = await res.json();
        orders.reverse();
        container.innerHTML = '';
        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding: 40px; color: #888;">لا توجد طلبات لعرضها.</p>';
            return;
        }
        orders.forEach(o => {
            const receiptUrl = o.receiptImage ? `${SERVER_URL}${o.receiptImage}` : '';
            const receiptHtml = receiptUrl ? `<a href="${receiptUrl}" target="_blank"><img src="${receiptUrl}" class="receipt-thumb"></a>` : `<div class="receipt-thumb"></div>`;
            const isPending = o.status === 'pending';
            const statusText = isPending ? 'بانتظار المراجعة' : (o.status === 'completed' ? 'مكتمل' : 'تم التفعيل');
            const actionBtn = isPending ? `<button class="btn" style="width:auto; padding:8px 15px;" onclick="approve(${o.orderId}, this)">تفعيل</button>` : `<span style="color:var(--success);">${statusText}</span>`;
            
            const card = document.createElement('div');
            card.className = `order-card ${isPending ? 'order-status-pending' : 'order-status-approved'}`;
            card.id = `order-${o.orderId}`;
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px; flex:1;">
                    ${receiptHtml}
                    <div class="order-info">
                        <h4>${o.productName || 'منتج غير معروف'}</h4>
                        <div class="order-meta">
                            <span class="meta-item">#${o.orderId}</span>
                            <span class="meta-item">${o.userPhone}</span>
                        </div>
                    </div>
                </div>
                <div>${actionBtn}</div>`;
            container.appendChild(card);
        });
    } catch (e) {
        console.error("Failed to load admin orders:", e);
        container.innerHTML = '<p style="text-align:center; color:red; padding: 40px;">فشل تحميل الطلبات. تحقق من اتصال السيرفر.</p>';
    }
}

async function approve(id, element) {
    if (!confirm("هل أنت متأكد من تفعيل هذا الطلب؟")) return;
    element.disabled = true;
    element.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    try {
        const res = await fetch(`${SERVER_URL}/admin/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: id }) });
        const data = await res.json();
        if (data.success) {
            const card = document.getElementById(`order-${id}`);
            if(card) {
                card.classList.remove('order-status-pending');
                card.classList.add('order-status-approved');
                element.parentElement.innerHTML = `<span style="color:var(--success);">تم التفعيل</span>`;
            }
        } else {
            alert("فشل تفعيل الطلب.");
            element.disabled = false;
            element.innerHTML = 'تفعيل';
        }
    } catch (e) {
        alert("خطأ في الاتصال.");
        element.disabled = false;
        element.innerHTML = 'تفعيل';
    }
}


/* =================================================================
   📡 4. دوال صفحة التتبع (Track.html)
   ================================================================= */
   
// هذه الدوال تعمل مع الكود المضمن في صفحة track.html
// ولا تحتاج إلى استدعاء من المنظم الرئيسي
async function getCode() {
    const id = new URLSearchParams(window.location.search).get('id');
    const btn = document.getElementById('code-btn');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري جلب الكود...';
    try {
        const res = await fetch(`${SERVER_URL}/get-code-secure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: id })
        });
        const data = await res.json();
        if (data.success) {
            const codeResult = document.getElementById('code-result');
            const finalCode = document.getElementById('final-code');
            if (codeResult && finalCode) {
                finalCode.innerText = data.code;
                codeResult.style.display = 'block';
                btn.style.display = 'none';
            }
        } else {
            alert(data.message || "فشل جلب الكود.");
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-key"></i> محاولة مجدداً';
        }
    } catch (e) {
        alert("خطأ في الاتصال.");
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> محاولة مجدداً';
    }
}


/* =================================================================
   🚀 5. المنظم الرئيسي: تهيئة الصفحات عند التحميل
   ================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    // الحصول على اسم الملف الحالي (مثل: index.html, admin.html)
    const currentPage = window.location.pathname.split('/').pop();

    // تشغيل كود صفحة المتجر الرئيسية
    if (currentPage === 'index.html' || currentPage === '') {
        updateUserSessionUI();
        loadProducts();
        loadMyOrdersWidget();
    }
    
    // تشغيل كود صفحة الأدمن
    if (currentPage === 'admin.html') {
        // عرض القسم الأول (الطلبات) افتراضياً
        const firstNavItem = document.querySelector('.nav-item');
        if(firstNavItem) showSection('orders', firstNavItem);
        
        loadAdminOrders();
        toggleProductFields(); // لضبط الحقول عند تحميل الصفحة
    }

    // لا حاجة لتهيئة track.html هنا لأن الكود الخاص بها مضمن في الصفحة نفسها
});
