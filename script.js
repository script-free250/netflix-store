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
/* =================================================================
   دوال المصادقة بعد التعديل (الحل)
   ================================================================= */

async function handleRegister(event) {
    event.preventDefault();
    const form = event.target, btn = form.querySelector('button'), name = form.querySelector('#name').value, email = form.querySelector('#email').value, password = form.querySelector('#password').value, errMsg = form.querySelector('#error-message'), okMsg = form.querySelector('#success-message');
    btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`; errMsg.style.display = "none"; okMsg.style.display = "none";
    try {
        // ✅ تم الإصلاح: إضافة الهيدر لتجاوز صفحة localtunnel
        const res = await fetch(`${SERVER_URL}/api/register`, { 
            method: "POST", 
            headers: { 
                "Content-Type": "application/json",
                "Bypass-Tunnel-Reminder": "true" 
            }, 
            body: JSON.stringify({ name, email, password }) 
        });
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
        // ✅ تم الإصلاح: إضافة الهيدر لتجاوز صفحة localtunnel
        const res = await fetch(`${SERVER_URL}/api/login`, { 
            method: "POST", 
            headers: { 
                "Content-Type": "application/json",
                "Bypass-Tunnel-Reminder": "true" 
            }, 
            body: JSON.stringify({ email, password }) 
        });
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
   🛒 2. دوال المتجر والمنتجات
   ================================================================= */
async function loadProducts() {
    try {
        const container = document.getElementById("products-container");
        if (!container) return;
        container.innerHTML = '<div class="loader"></div>';
        const res = await fetch(`${SERVER_URL}/products`);
        const products = await res.json();
        productsData = products; // Store for later use
        container.innerHTML = '';
        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-header">
                    <span class="product-tag">${p.type === 'netflix-user' ? 'بروفايل' : 'حساب كامل'}</span>
                    <i class="fas fa-heart"></i>
                </div>
                <h3>${p.name}</h3>
                <p class="product-price">${p.price} ج.م</p>
                <p class="product-stock">متوفر: ${p.stock.length}</p>
                <p class="product-sold">مباع: ${p.soldCount || 0}</p>
                <button class="btn" onclick="openBuyModal(${p.id})"><i class="fas fa-shopping-cart"></i> شراء الآن</button>
            `;
            container.appendChild(card);
        });
    } catch (e) { showNotification("فشل تحميل المنتجات.", "error"); }
}

function openBuyModal(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    document.getElementById("modal-product-name").innerText = product.name;
    document.getElementById("modal-product-id").value = productId;
    document.getElementById("modal-product-description").innerHTML = product.description ? `<p>${product.description}</p>` : '';
    document.getElementById("buyModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("buyModal").style.display = "none";
    document.getElementById("purchaseForm").reset();
    document.getElementById("file-label-text").textContent = "اضغط لإرفاق صورة التحويل";
}

async function submitOrder(event) {
    event.preventDefault();
    const form = event.target, btn = form.querySelector('button'), formData = new FormData(form);
    btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...`;
    try {
        const token = localStorage.getItem("authToken");
        if (!token) {
            showNotification("يرجى تسجيل الدخول أولاً.", "error");
            btn.disabled = false; btn.innerHTML = `<i class="fas fa-check-circle"></i> تأكيد الشراء`;
            return;
        }
        // التعديل هنا: إزالة formData.append("authToken", token); وإضافة headers بدلاً من ذلك
        const res = await fetch(`${SERVER_URL}/submit-order`, { 
            method: "POST", 
            headers: { 
                "Authorization": `Bearer ${token}`,  // إضافة التوكن كـ Authorization header
                "Bypass-Tunnel-Reminder": "true"    // إضافة header لتجاوز localtunnel
            }, 
            body: formData 
        });
        const data = await res.json();
        if (data.success) {
            showNotification("تم إرسال الطلب بنجاح! جاري المراجعة.", "success");
            closeModal();
            loadMyOrdersWidget(); // تحديث قائمة الطلبات
            form.reset();
        } else { showNotification(data.message || "حدث خطأ أثناء إرسال الطلب.", "error"); }
    } catch (e) { showNotification("خطأ في الاتصال بالسيرفر.", "error"); } 
    finally { btn.disabled = false; btn.innerHTML = `<i class="fas fa-check-circle"></i> تأكيد الشراء`; }
}

/* =================================================================
   📋 3. دوال الطلبات والأوامر
   ================================================================= */
async function loadMyOrdersWidget() {
    const container = document.getElementById("my-orders-list");
    if (!container) return;
    const token = localStorage.getItem("authToken");
    if (!token) {
        container.innerHTML = `<p style="text-align:center; color:var(--text-muted);">يرجى تسجيل الدخول لعرض طلباتك.</p>`;
        return;
    }
    container.innerHTML = '<div class="loader" style="margin:20px auto;"></div>';
    try {
        const res = await fetch(`${SERVER_URL}/my-orders`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const orders = await res.json();
        container.innerHTML = '';
        if (orders.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:var(--text-muted);">لا توجد طلبات سابقة.</p>`;
            return;
        }
        orders.forEach(order => {
            const product = productsData.find(p => p.id === order.productId) || { name: "منتج غير معروف" };
            const card = document.createElement('div');
            card.className = 'order-mini-card';
            card.onclick = () => window.location.href = `track.html?id=${order.orderId}`;
            card.innerHTML = `
                <div>
                    <h4>${product.name}</h4>
                    <span class="order-status ${order.status}">${order.status === 'pending' ? 'قيد المراجعة' : order.status === 'approved' ? 'مقبول' : 'مكتمل'}</span>
                </div>
                <div style="text-align:left; color:#888; font-size:0.8rem;">${new Date(order.createdAt).toLocaleString('ar-EG')}</div>
            `;
            container.appendChild(card);
        });
    } catch (e) { container.innerHTML = `<p style="text-align:center; color:var(--primary);">فشل تحميل الطلبات.</p>`; }
}

/* =================================================================
   ⚙️ 4. دوال لوحة التحكم (Admin)
   ================================================================= */
function showSection(sectionId, element) {
    document.querySelectorAll('.content-area > div').forEach(div => div.style.display = 'none');
    document.getElementById(`section-${sectionId}`).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
}

async function loadAdminOrders() {
    const container = document.getElementById("orders-list");
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        const orders = await res.json();
        container.innerHTML = '';
        orders.forEach(order => {
            const product = db.products.find(p => p.id === order.productId) || { name: "منتج غير معروف" }; // افتراضياً، db غير موجود في الـ client، لكن يمكن تعديله إذا لزم
            const user = db.users.find(u => u.id === order.userId) || { name: "مستخدم غير معروف" };
            const card = document.createElement('div');
            card.className = `order-card order-status-${order.status}`;
            card.innerHTML = `
                <div class="order-info">
                    <h4>${product.name} - ${order.orderId}</h4>
                    <div class="order-meta">
                        <span class="meta-item"><i class="fas fa-user"></i> ${user.name}</span>
                        <span class="meta-item"><i class="fas fa-phone"></i> ${order.userPhone}</span>
                        <span class="meta-item"><i class="fas fa-clock"></i> ${new Date(order.createdAt).toLocaleString('ar-EG')}</span>
                    </div>
                </div>
                <div class="order-actions">
                    ${order.receiptPath ? `<img src="${SERVER_URL}${order.receiptPath}" class="receipt-thumb" onclick="window.open('${SERVER_URL}${order.receiptPath}', '_blank')">` : ''}
                    ${order.status === 'pending' ? `<button class="btn" style="padding:10px 20px;" onclick="approveOrder(${order.orderId})">قبول</button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) { container.innerHTML = '<p style="color:var(--primary);">فشل تحميل الطلبات.</p>'; }
}

async function approveOrder(orderId) {
    try {
        const res = await fetch(`${SERVER_URL}/admin/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId })
        });
        const data = await res.json();
        if (data.success) {
            showNotification("تم قبول الطلب بنجاح.", "success");
            loadAdminOrders();
        } else { showNotification("فشل قبول الطلب.", "error"); }
    } catch (e) { showNotification("خطأ في الاتصال.", "error"); }
}

function toggleProductFields() {
    const type = document.getElementById("p-type").value;
    // يمكن توسيع هذا لإخفاء/إظهار حقول حسب النوع، لكن حالياً غير مستخدم
}

let stockItemCount = 0;
function addStockItem() {
    const container = document.getElementById("stock-items-container");
    const item = document.createElement('div');
    item.className = 'stock-item';
    item.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; border-bottom:1px solid #333; padding-bottom:20px;">
            <div>
                <label class="form-label">الإيميل</label>
                <input type="email" name="stock[${stockItemCount}][email]" class="form-control" required>
            </div>
            <div>
                <label class="form-label">كلمة المرور</label>
                <input type="text" name="stock[${stockItemCount}][password]" class="form-control" required>
            </div>
            <div>
                <label class="form-label">اسم البروفايل</label>
                <input type="text" name="stock[${stockItemCount}][profileName]" class="form-control">
            </div>
            <div>
                <label class="form-label">PIN</label>
                <input type="text" name="stock[${stockItemCount}][profilePin]" class="form-control">
            </div>
            <div style="grid-column: span 2;">
                <label class="form-label">صورة البروفايل (اختياري)</label>
                <input type="file" name="stockImage_${stockItemCount}" accept="image/*" class="form-control">
            </div>
        </div>
    `;
    container.appendChild(item);
    stockItemCount++;
}

async function addProduct(event) {
    event.preventDefault();
    const form = event.target, btn = form.querySelector('button'), formData = new FormData(form);
    btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    try {
        const res = await fetch(`${SERVER_URL}/admin/add-product`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
            showNotification("تم إضافة المنتج بنجاح.", "success");
            form.reset();
            document.getElementById("stock-items-container").innerHTML = '';
            stockItemCount = 0;
        } else { showNotification("فشل إضافة المنتج.", "error"); }
    } catch (e) { showNotification("خطأ في الاتصال.", "error"); } 
    finally { btn.disabled = false; btn.innerHTML = "🚀 نشر المنتج"; }
}

/* =================================================================
   📦 5. دوال صفحة التتبع (Track)
   ================================================================= */
let trackInterval = null;
function initTrackPage() {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return window.location.href = "index.html";
    document.getElementById("disp-id").innerText = id;
    const checkStatus = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${id}`);
            const data = await res.json();
            if (data.status === 'approved' || data.status === 'completed') {
                document.getElementById("pending-view").style.display = 'none';
                document.getElementById("approved-view").style.display = 'block';
                const descContainer = document.getElementById('product-description-container');
                if (data.productDescription) {
                    descContainer.innerHTML = `
                        <div class="product-description-box">
                            <h4><i class="fas fa-info-circle"></i> تفاصيل المنتج</h4>
                            <p>${data.productDescription}</p>
                        </div>
                    `;
                }
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
