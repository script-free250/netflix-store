// ✅ تأكد من تحديث الرابط عند تشغيل السيرفر
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt";

let productsData = []; // Store products to access details later

/* =================================================================
   ✨ 0. نظام الإشعارات (Notification System)
   ================================================================= */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) {
        alert(message);
        return;
    }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const textNode = document.createElement('span');
    textNode.textContent = message;
    notification.appendChild(textNode);
    container.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

/* =================================================================
   🔐 1. دوال المصادقة وتسجيل الدخول
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
        div.innerHTML = `
            <div class="user-session-ui">
                <span>أهلاً، ${name}</span>
                <div class="user-avatar">${initial}</div>
                <button onclick="logout()" class="logout-btn" title="تسجيل الخروج"><i class="fas fa-sign-out-alt"></i></button>
            </div>`;
    } else {
        div.innerHTML = `<div style="display:flex;gap:10px;"><a href="login.html" class="btn-outline">دخول</a><a href="register.html" class="btn" style="width:auto;padding:10px 20px;margin:0;">حساب جديد</a></div>`;
    }
}

/* =================================================================
   🛒 2. دوال المتجر والشراء
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
            card.innerHTML = `
                <span class="tag">${p.type === 'netflix-user' ? "👤 بروفايل" : "💎 حساب كامل"}</span>
                <h3>${p.name}</h3>
                <p class="product-description">${p.description || 'لا يتوفر وصف لهذا المنتج.'}</p>
                <div style="flex-grow:1;"></div>
                <span class="price">${p.price} ج.م</span>
                <button class="btn" onclick="openBuyModal(${p.id})">شراء الآن</button>`;
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
        showNotification("عذراً، المنتج المحدد غير موجود.", "error");
        return;
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
            closeModal();
            e.target.reset();
            updateFileName(e.target.querySelector('#receipt-file'));
            showNotification("✅ تم إرسال طلبك بنجاح!", "success");
            loadMyOrdersWidget();
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
   🔧 3. دوال لوحة الأدمن (النسخة الكاملة)
   ================================================================= */
// FIX: Full implementation of admin panel functions
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
            showNotification("✅ تم نشر المنتج بنجاح!", "success");
            e.target.reset();
        } else {
            showNotification("فشل نشر المنتج.", "error");
        }
    } catch (err) {
        showNotification("خطأ في الاتصال بالسيرفر.", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "🚀 نشر المنتج";
    }
}

async function loadAdminOrders() {
    const container = document.getElementById("orders-list");
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        if (!res.ok) throw new Error(`E: ${res.status}`);
        let orders = await res.json();
        orders.reverse();
        container.innerHTML = "";
        if (orders.length === 0) {
            container.innerHTML = "<p style='text-align:center; color: var(--text-muted);'>لا توجد طلبات حالياً.</p>";
            return;
        }
        orders.forEach(o => {
            const receiptUrl = o.receiptImage ? `${SERVER_URL}${o.receiptImage}` : "";
            const receiptHtml = receiptUrl ? `<a href="${receiptUrl}" target="_blank"><img src="${receiptUrl}" class="receipt-thumb"></a>` : "<div class='receipt-thumb' style='background:#111; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.8rem;'>لا يوجد</div>";
            const actionBtn = o.status === 'pending' ? `<button class="btn" style="width:auto; padding: 8px 16px; font-size:0.9rem; margin:0;" onclick="approve(${o.orderId}, this)">تفعيل</button>` : `<span style="color:var(--success); font-weight:bold;">${o.status === 'completed' ? "مكتمل" : "مُفعّل"}</span>`;
            
            const card = document.createElement('div');
            card.className = `order-card order-status-${o.status}`;
            card.id = `order-${o.orderId}`;
            card.innerHTML = `
                <div class="order-info">
                    <h4>${o.productName}</h4>
                    <div class="order-meta">
                        <span class="meta-item"><i class="fas fa-id-card"></i> #${o.orderId}</span>
                        <span class="meta-item"><i class="fas fa-user"></i> ID: ${o.userId}</span>
                        <span class="meta-item"><i class="fas fa-mobile-alt"></i> ${o.userPhone}</span>
                    </div>
                </div>
                <div class="order-actions">
                    ${receiptHtml}
                    <div style="text-align:center;">${actionBtn}</div>
                </div>`;
            container.appendChild(card);
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = "<p>خطأ في تحميل الطلبات.</p>";
    }
}

async function approve(id, el) {
    if (!confirm("هل أنت متأكد من تفعيل هذا الطلب؟")) return;
    el.disabled = true;
    el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const res = await fetch(`${SERVER_URL}/admin/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: id }) });
        const data = await res.json();
        if (data.success) {
            el.parentElement.innerHTML = "<span style='color:var(--success); font-weight:bold;'>مُفعّل</span>";
            const card = document.getElementById(`order-${id}`);
            card.classList.remove("order-status-pending");
            card.classList.add("order-status-approved");
        } else {
            showNotification("فشل عملية التفعيل.", "error");
            el.disabled = false;
        }
    } catch (e) {
        showNotification("خطأ في الاتصال بالسيرفر.", "error");
        el.disabled = false;
    }
}


/* =================================================================
   📡 4. دوال صفحة التتبع (Track.html)
   ================================================================= */
let trackInterval;
async function initTrackPage() {
    const pendingView = document.getElementById('pending-view'), approvedView = document.getElementById('approved-view'), dispIdElem = document.getElementById('disp-id');
    if (!pendingView || !approvedView || !dispIdElem) return document.body.innerHTML = '<h1>خطأ: الصفحة لا تحتوي على العناصر اللازمة.</h1>';
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return pendingView.innerHTML = '<h1>رقم الطلب غير موجود.</h1>';
    dispIdElem.innerText = '#' + id;

    const checkStatus = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${id}`);
            const data = await res.json();
            if (data.status === 'approved' || data.status === 'completed') {
                clearInterval(trackInterval);
                pendingView.style.display = 'none';
                approvedView.style.display = 'block';
                const accContainer = document.getElementById('account-display');
                
                if (data.requiresCode) {
                     // FIX: Using a reliable public image link as a fallback
                     const imgSrc = data.profileImage ? `${SERVER_URL}${data.profileImage}` : 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png';
                     console.log("Profile Image URL:", imgSrc); // For debugging
                     
                     accContainer.innerHTML = `
                        <img src="${imgSrc}" class="profile-avatar" alt="Profile Avatar">
                        <div class="info-row">
                            <span class="info-label">الإيميل</span>
                            <span class="info-value">${data.accountEmail} <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.accountEmail}')"><i class="fas fa-copy"></i></button></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">البروفايل</span>
                            <span class="info-value">${data.profileName}</span>
                        </div>
                        <div>
                            <span style="font-size:0.8rem;color:#666;">PIN</span>
                            <span class="pin-display">${data.profilePin}</span>
                        </div>`;

                     document.getElementById('code-section').style.display = 'block';
                     if (data.savedCode) {
                         document.getElementById('code-btn').style.display = 'none';
                         document.getElementById('code-result').style.display = 'block';
                         document.getElementById('final-code').innerText = data.savedCode;
                     }
                } else {
                    accContainer.innerHTML = `
                        <div class="info-row">
                            <span class="info-label">الإيميل</span>
                            <span class="info-value">${data.accountEmail} <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.accountEmail}')"><i class="fas fa-copy"></i></button></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">المرور</span>
                            <span class="info-value">${data.accountPassword} <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.accountPassword}')"><i class="fas fa-copy"></i></button></span>
                        </div>`;
                }
            }
        } catch (error) { 
            console.error('[Track] Error fetching status:', error);
            // Stop checking if there's a persistent error to avoid spamming the server
            clearInterval(trackInterval);
        }
    };
    if (trackInterval) clearInterval(trackInterval); 
    checkStatus(); 
    trackInterval = setInterval(checkStatus, 5000); // Increased interval to 5s
}

async function getCode() {
    const id = new URLSearchParams(window.location.search).get("id");
    const btn = document.getElementById("code-btn");
    if (!btn) return;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const res = await fetch(`${SERVER_URL}/get-code-secure`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: id }) });
        const data = await res.json(); 
        if (data.success) {
            document.getElementById("final-code").innerText = data.code;
            document.getElementById("code-result").style.display = "block";
            btn.style.display = "none";
        } else { showNotification(data.message || "فشل جلب الكود.", "error"); }
    } catch (e) { showNotification("خطأ في الاتصال بالسيرفر.", "error"); } 
    finally {
        if (btn.style.display !== 'none') {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-key"></i> جلب كود الدخول';
        }
    }
}

/* =================================================================
   🚀 5. المنظم الرئيسي: تهيئة الصفحات عند التحميل
   ================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'index.html' || currentPage === '') { 
        updateUserSessionUI(); 
        loadProducts(); 
        loadMyOrdersWidget(); 
    }
    if (currentPage === 'admin.html') { 
        const firstNavItem = document.querySelector('.nav-item'); 
        if (firstNavItem) {
            showSection('orders', firstNavItem);
        }
        loadAdminOrders();
        toggleProductFields(); 
    }
    if (currentPage === 'track.html') { 
        initTrackPage(); 
    }
});
