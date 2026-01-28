// ✅ تأكد من تحديث الرابط عند تشغيل السيرفر
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt";

let productsData = []; // Store products to access details later

/* =================================================================
   ✨ 0. نظام الإشعارات (Notification System)
   ================================================================= */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) { alert(message); return; }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const textNode = document.createElement('span');
    textNode.textContent = message;
    notification.appendChild(textNode);
    container.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 5000);
}

/* =================================================================
   🔐 1. دوال المصادقة وتسجيل الدخول (بدون تغيير)
   ================================================================= */
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target, btn = form.querySelector('button'), name = form.querySelector('#name').value, email = form.querySelector('#email').value, password = form.querySelector('#password').value, errMsg = form.querySelector('#error-message'), okMsg = form.querySelector('#success-message');
    btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`; errMsg.style.display = "none"; okMsg.style.display = "none";
    try {
        const res = await fetch(`${SERVER_URL}/api/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
        const data = await res.json();
        if (res.ok) {
            okMsg.innerText = data.message; okMsg.style.display = "block"; form.reset();
            setTimeout(() => { window.location.href = "login.html" }, 2000);
        } else { errMsg.innerText = data.message; errMsg.style.display = "block"; }
    } catch (e) { errMsg.innerText = "فشل الاتصال."; } 
    finally { btn.disabled = false; btn.innerHTML = "إنشاء حساب"; }
}
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target, btn = form.querySelector('button'), email = form.querySelector('#email').value, password = form.querySelector('#password').value, errMsg = form.querySelector('#error-message');
    btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`; errMsg.style.display = "none";
    try {
        const res = await fetch(`${SERVER_URL}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (res.ok && data.success) {
            localStorage.setItem("authToken", data.token); localStorage.setItem("userEmail", data.email); localStorage.setItem("userName", data.name);
            window.location.href = "index.html";
        } else { errMsg.innerText = data.message; errMsg.style.display = "block"; }
    } catch (e) { errMsg.innerText = "فشل الاتصال."; } 
    finally { btn.disabled = false; btn.innerHTML = "دخول"; }
}
function logout() {
    localStorage.removeItem("authToken"); localStorage.removeItem("userEmail"); localStorage.removeItem("userName");
    window.location.href = "index.html";
}
function updateUserSessionUI() {
    const div = document.getElementById("user-session"); if (!div) return;
    const token = localStorage.getItem("authToken"), name = localStorage.getItem("userName");
    if (token && name) {
        const initial = name.charAt(0).toUpperCase();
        div.innerHTML = `<div class="user-session-ui"><span>أهلاً، ${name}</span><div class="user-avatar">${initial}</div><button onclick="logout()" class="logout-btn" title="تسجيل الخروج"><i class="fas fa-sign-out-alt"></i></button></div>`;
    } else {
        div.innerHTML = `<div style="display:flex;gap:10px;"><a href="login.html" class="btn-outline">دخول</a><a href="register.html" class="btn" style="width:auto;padding:10px 20px;margin:0;">حساب جديد</a></div>`;
    }
}
/* =================================================================
   🛒 2. دوال المتجر والشراء (تحديث loadProducts)
   ================================================================= */
async function loadProducts() {
    const container = document.getElementById("products-container"); if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: { "Bypass-Tunnel-Reminder": "true" } });
        if (!res.ok) throw new Error(`E:${res.status}`);
        productsData = await res.json();
        container.innerHTML = "";
        if (productsData.length === 0) { container.innerHTML = "<p>لا توجد منتجات حالياً.</p>"; return; }
        
        productsData.forEach((p, index) => {
            const card = document.createElement("div");
            card.className = "card";
            card.style.animationDelay = `${100 * index}ms`;

            // ## بداية التعديل: التحقق من المخزون ##
            let buyButton;
            const isOutOfStock = (p.type === 'netflix-full' && p.availableStock === 0);
            if(isOutOfStock) {
                buyButton = `<button class="btn" disabled style="background-color: var(--text-muted); cursor: not-allowed;">نفد المخزون</button>`;
            } else {
                buyButton = `<button class="btn" onclick="openBuyModal(${p.id})">شراء الآن</button>`;
            }
            // ## نهاية التعديل ##

            card.innerHTML = `
                <span class="tag">${p.type === 'netflix-user' ? "👤 بروفايل" : "💎 حساب كامل"} <span style="color:var(--text-muted); font-size:0.7rem;">(${isOutOfStock ? 0 : p.availableStock} متاح)</span></span>
                <h3>${p.name}</h3>
                <p class="product-description">${p.description || 'لا يتوفر وصف لهذا المنتج.'}</p>
                <div style="flex-grow:1;"></div>
                <span class="price">${p.price} ج.م</span>
                ${buyButton}`;
            container.appendChild(card);
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = "<p>حدث خطأ أثناء تحميل الباقات. يرجى المحاولة لاحقاً.</p>";
    }
}
function openBuyModal(productId) {
    const token = localStorage.getItem("authToken");
    if (!token) {
        showNotification("يجب تسجيل الدخول أولاً لإتمام الشراء.", "info");
        setTimeout(() => { window.location.href = "login.html"; }, 2500);
        return;
    }
    const product = productsData.find(p => p.id === productId);
    if (!product) {
        showNotification("عذراً، المنتج المحدد غير موجود.", "error"); return;
    }
    document.getElementById("buyModal").style.display = "block";
    document.getElementById("modal-product-name").innerText = product.name;
    document.getElementById("modal-product-id").value = product.id;
    document.getElementById("modal-product-description").innerText = product.description || 'لا يتوفر وصف لهذا المنتج.';
}
function closeModal() { document.getElementById("buyModal").style.display = "none"; }

async function submitOrder(e) {
    e.preventDefault();
    const token = localStorage.getItem("authToken");
    if (!token) { showNotification("يرجى تسجيل الدخول مرة أخرى.", "error"); return; }
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const formData = new FormData(e.target);
    try {
        const res = await fetch(`${SERVER_URL}/buy`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
        const data = await res.json();
        if (res.ok) {
            closeModal(); e.target.reset();
            updateFileName(e.target.querySelector('#receipt-file'));
            showNotification("✅ تم إرسال طلبك بنجاح!", "success");
            loadMyOrdersWidget();
            loadProducts(); // Reload products to update stock count
        } else { showNotification(data.message || "حدث خطأ ما.", "error"); }
    } catch (err) { showNotification("فشل الاتصال بالسيرفر.", "error"); } 
    finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الشراء'; }
}
async function loadMyOrdersWidget() {
    const section = document.getElementById("my-orders-list"); if (!section) return;
    const token = localStorage.getItem("authToken");
    if (!token) { section.innerHTML = '<p>يرجى <a href="login.html">تسجيل الدخول</a> لعرض طلباتك.</p>'; return; }
    section.innerHTML = '<div class="loader"></div>';
    try {
        const res = await fetch(`${SERVER_URL}/api/my-orders`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { if (res.status === 401 || res.status === 403) logout(); throw new Error(""); }
        let orders = await res.json();
        orders.reverse(); section.innerHTML = "";
        if (!orders.length) { section.innerHTML = "<p>لا توجد طلبات سابقة.</p>"; return; }
        orders.forEach(o => {
            let statusText = o.status === 'approved' ? "جاهز للعرض" : (o.status === 'completed' ? "مكتمل" : "قيد المراجعة");
            const card = document.createElement("div");
            card.className = "order-mini-card";
            card.setAttribute("onclick", `window.location.href='track.html?id=${o.orderId}'`);
            card.innerHTML = `<div><strong>${o.productName}</strong><br><span style="font-family:monospace; color:var(--text-muted);">#${o.orderId}</span></div><span class="order-status ${o.status}">${statusText}</span>`;
            section.appendChild(card);
        });
    } catch (e) { section.innerHTML = "<p>خطأ في جلب الطلبات.</p>"; }
}
window.onclick = function (event) { if (event.target == document.getElementById("buyModal")) closeModal(); };

/* =================================================================
   🔧 3. دوال لوحة الأدمن (تعديلات كبيرة)
   ================================================================= */
function showSection(id, el) {
    document.querySelectorAll(".content-area > div").forEach(s => s.style.display = "none");
    document.getElementById("section-" + id).style.display = "block";
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    el.classList.add("active");
}
function toggleProductFields() {
    if (!document.getElementById("p-type")) return;
    const type = document.getElementById("p-type").value;
    document.getElementById("fields-full").style.display = type === 'netflix-full' ? "block" : "none";
    document.getElementById("fields-user").style.display = type === 'netflix-user' ? "block" : "none";
    if (type === 'netflix-full') { generateStockInputs(); }
}
async function addProduct(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.innerText = "جاري النشر...";
    const formData = new FormData(e.target);
    try {
        const res = await fetch(`${SERVER_URL}/admin/add-product`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
            showNotification("✅ تم نشر المنتج بنجاح!", "success"); e.target.reset();
            document.getElementById('stock-accounts-container').innerHTML = ''; // Clear dynamic fields
            generateStockInputs();
        } else { showNotification(data.message || "فشل نشر المنتج.", "error"); }
    } catch (err) { showNotification("خطأ في الاتصال بالسيرفر.", "error"); } 
    finally { btn.disabled = false; btn.innerText = "🚀 نشر المنتج"; }
}
async function loadAdminOrders() { /* ... same as before ... */ }
async function approve(id, el) { /* ... same as before ... */ }

// ## بداية الإضافة: دوال المخزون والبحث ##
function generateStockInputs() {
    const container = document.getElementById('stock-accounts-container');
    const quantity = parseInt(document.getElementById('p-stock-quantity').value, 10);
    if (!container || isNaN(quantity) || quantity < 1) {
        if(container) container.innerHTML = '';
        return;
    }
    container.innerHTML = ''; // Clear existing
    for (let i = 0; i < quantity; i++) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'stock-account-item';
        itemDiv.innerHTML = `
            <label class="form-label" style="font-size: 0.8rem; color: #888;">حساب رقم ${i + 1}</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="email" name="accounts[${i}][email]" class="form-control" placeholder="Email" required>
                <input type="text" name="accounts[${i}][password]" class="form-control" placeholder="Password" required>
            </div>
        `;
        container.appendChild(itemDiv);
    }
}
async function searchOrder(event) {
    event.preventDefault();
    const orderId = document.getElementById('search-order-id').value;
    const resultContainer = document.getElementById('search-result-container');
    const modal = document.getElementById('searchResultModal');
    
    if (!orderId) { showNotification("الرجاء إدخال رقم طلب.", "error"); return; }
    
    resultContainer.innerHTML = '<div class="loader"></div>';
    modal.style.display = 'block';

    try {
        const res = await fetch(`${SERVER_URL}/admin/search-order/${orderId}`);
        const data = await res.json();

        if (!res.ok) {
            resultContainer.innerHTML = `<p style="color:var(--primary); text-align:center;">${data.message || 'خطأ'}</p>`;
            return;
        }

        const formatDate = (dateString) => new Date(dateString).toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' });
        
        document.getElementById('search-modal-title').innerText = `تفاصيل الطلب #${data.order.orderId}`;
        resultContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:8px;">
                <h4><i class="fas fa-box" style="color:var(--primary);"></i> تفاصيل المنتج</h4>
                <div class="info-row"><span class="info-label">اسم المنتج</span><span class="info-value">${data.order.productName}</span></div>
                <div class="info-row"><span class="info-label">الحالة</span><span class="info-value">${data.order.status}</span></div>
                ${data.order.assignedAccount ? `
                    <div class="info-row"><span class="info-label">الإيميل المسلم</span><span class="info-value">${data.order.assignedAccount.email}</span></div>
                    <div class="info-row"><span class="info-label">الباسورد المسلم</span><span class="info-value">${data.order.assignedAccount.password}</span></div>
                ` : ''}

                <h4 style="margin-top:20px;"><i class="fas fa-user" style="color:var(--primary);"></i> تفاصيل المشتري</h4>
                <div class="info-row"><span class="info-label">اسم المشتري</span><span class="info-value">${data.user.name}</span></div>
                <div class="info-row"><span class="info-label">إيميل المشتري</span><span class="info-value">${data.user.email}</span></div>
                <div class="info-row"><span class="info-label">رقم الهاتف</span><span class="info-value">${data.order.userPhone}</span></div>
                
                <h4 style="margin-top:20px;"><i class="fas fa-calendar-alt" style="color:var(--primary);"></i> التواريخ</h4>
                <div class="info-row"><span class="info-label">تاريخ الشراء</span><span class="info-value">${formatDate(data.order.createdAt)}</span></div>
                ${data.order.approvedAt ? `<div class="info-row"><span class="info-label">تاريخ التفعيل</span><span class="info-value">${formatDate(data.order.approvedAt)}</span></div>` : ''}
            </div>
        `;

    } catch (e) {
        resultContainer.innerHTML = `<p style="color:var(--primary); text-align:center;">فشل الاتصال بالسيرفر.</p>`;
    }
}
function closeSearchModal() {
    document.getElementById('searchResultModal').style.display = 'none';
}
// ## نهاية الإضافة ##

/* =================================================================
   📡 4. دوال صفحة التتبع (Track.html) (بدون تغيير)
   ================================================================= */
// ... (All functions are the same as before) ...

/* =================================================================
   🚀 5. المنظم الرئيسي: تهيئة الصفحات عند التحميل
   ================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'index.html' || currentPage === '') { 
        updateUserSessionUI(); loadProducts(); loadMyOrdersWidget(); 
    }
    if (currentPage === 'admin.html') { 
        const firstNavItem = document.querySelector('.nav-item'); 
        if (firstNavItem) { showSection('orders', firstNavItem); }
        loadAdminOrders();
        toggleProductFields();
    }
    if (currentPage === 'track.html') { initTrackPage(); }

    window.onclick = function (event) {
        if (event.target == document.getElementById("buyModal")) closeModal();
        if (event.target == document.getElementById("searchResultModal")) closeSearchModal();
    };
});
