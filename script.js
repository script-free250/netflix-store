// ✅ تأكد من تحديث الرابط عند تشغيل السيرفر
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt";

let productsData = []; 

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
   🔐 1. دوال المصادقة وتسجيل الدخول
   ================================================================= */
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target, btn = form.querySelector('button'), name = form.querySelector('#name').value, email = form.querySelector('#email').value, password = form.querySelector('#password').value, errMsg = form.querySelector('#error-message'), okMsg = form.querySelector('#success-message');
    btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`; errMsg.style.display = "none"; okMsg.style.display = "none";
    try {
        const res = await fetch(`${SERVER_URL}/api/register`, { 
            method: "POST", 
            headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "true" }, 
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
        const res = await fetch(`${SERVER_URL}/api/login`, { 
            method: "POST", 
            headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "true" }, 
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
            const availableStock = p.inventory ? p.inventory.filter(i => !i.isSold).length : 0;
            const isOutOfStock = (p.inventory && availableStock === 0);
            
            const btnState = isOutOfStock ? 'disabled' : '';
            const btnText = isOutOfStock ? 'نفدت الكمية 🚫' : 'شراء الآن';
            const btnClass = isOutOfStock ? 'btn btn-disabled' : 'btn';
            
            const imageSrc = p.image ? `${SERVER_URL}${p.image}` : 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png';

            const card = document.createElement("div");
            card.className = "card";
            card.style.animationDelay = `${100 * index}ms`;
            
            card.innerHTML = `
                <img src="${imageSrc}" class="card-img" alt="${p.name}">
                <span class="tag">${p.type === 'netflix-user' ? "👤 بروفايل" : "💎 حساب كامل"}</span>
                <h3>${p.name}</h3>
                <p class="product-description">${p.description || 'لا يتوفر وصف لهذا المنتج.'}</p>
                ${!isOutOfStock ? `<p style="color:var(--success); font-size:0.8rem; margin-top:5px;">متبقي: ${availableStock} قطعة</p>` : ''}
                <div style="flex-grow:1;"></div>
                <span class="price">${p.price} ج.م</span>
                <button class="${btnClass}" onclick="openBuyModal(${p.id})" ${btnState}>${btnText}</button>`;
            container.appendChild(card);
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = "<p>حدث خطأ أثناء تحميل الباقات.</p>";
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
    if (!product) { showNotification("عذراً، المنتج غير موجود.", "error"); return; }
    
    if (product.inventory) {
        const stock = product.inventory.filter(i => !i.isSold).length;
        if (stock <= 0) { showNotification("عذراً، لقد نفد المخزون للتو.", "error"); return; }
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
            loadProducts(); 
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
            let statusText = o.status === 'approved' ? "جاهز للعرض" : (o.status === 'completed' ? "مكتمل" : (o.status === 'rejected' ? "مرفوض" : "قيد المراجعة"));
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
   🔧 3. دوال لوحة الأدمن
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
            document.getElementById('main-image-preview').style.display = 'none';
            document.getElementById('main-image-text').style.display = 'block';
            document.querySelector('.image-upload-box i').style.display = 'block';
            document.getElementById('inventory-container').innerHTML = '';
        } else { showNotification("فشل نشر المنتج.", "error"); }
    } catch (err) { showNotification("خطأ في الاتصال بالسيرفر.", "error"); } 
    finally { btn.disabled = false; btn.innerText = "🚀 نشر المنتج"; }
}

async function loadAdminOrders() {
    const container = document.getElementById("orders-list"); if (!container) return;
    container.innerHTML = '<div class="loader"></div>';
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        if (!res.ok) throw new Error(`E: ${res.status}`);
        let orders = await res.json();
        orders.reverse();
        container.innerHTML = "";
        if (orders.length === 0) { container.innerHTML = "<p style='text-align:center; color: var(--text-muted);'>لا توجد طلبات حالياً.</p>"; return; }
        orders.forEach(o => {
            const receiptUrl = o.receiptImage ? `${SERVER_URL}${o.receiptImage}` : "";
            const receiptHtml = receiptUrl ? `<a href="${receiptUrl}" target="_blank"><img src="${receiptUrl}" class="receipt-thumb"></a>` : "<div class='receipt-thumb' style='background:#111; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.8rem;'>لا يوجد</div>";
            
            // ## تعديل: إضافة زر الرفض ##
            const actionBtn = o.status === 'pending' ? 
                `<div style="display:flex; gap:10px; justify-content:center;">
                    <button class="btn" style="width:auto; padding: 8px 16px; font-size:0.9rem; margin:0; background:var(--success);" onclick="approve(${o.orderId}, this)">قبول</button>
                    <button class="btn" style="width:auto; padding: 8px 16px; font-size:0.9rem; margin:0; background:var(--primary);" onclick="rejectOrder(${o.orderId})">رفض</button>
                 </div>` 
                : `<span style="font-weight:bold; color:${o.status==='approved' || o.status==='completed' ? 'var(--success)' : (o.status==='rejected' ? 'var(--primary)' : '#888')}">${o.status === 'completed' ? "مكتمل" : (o.status === 'approved' ? "مُفعّل" : "مرفوض")}</span>`;
            // ## نهاية التعديل ##

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
                <div class="order-actions">${receiptHtml}<div style="text-align:center;">${actionBtn}</div></div>`;
            container.appendChild(card);
        });
    } catch (e) { container.innerHTML = "<p>خطأ في تحميل الطلبات.</p>"; }
}

async function approve(id, el) {
    if (!confirm("هل أنت متأكد من تفعيل هذا الطلب؟")) return;
    el.disabled = true; el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const res = await fetch(`${SERVER_URL}/admin/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: id }) });
        const data = await res.json();
        if (data.success) {
            el.parentElement.innerHTML = "<span style='color:var(--success); font-weight:bold;'>مُفعّل</span>";
            const card = document.getElementById(`order-${id}`);
            card.classList.remove("order-status-pending");
            card.classList.add("order-status-approved");
        } else { showNotification(data.message || "فشل التفعيل (قد يكون المخزون نفد).", "error"); el.disabled = false; }
    } catch (e) { showNotification("خطأ في الاتصال.", "error"); el.disabled = false; }
}

async function rejectOrder(id) {
    const reason = prompt("أدخل سبب الرفض (سيظهر للمستخدم):");
    if (reason === null) return; 
    if (!reason.trim()) { alert("يجب كتابة سبب الرفض!"); return; }

    try {
        const res = await fetch(`${SERVER_URL}/admin/reject`, { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ orderId: id, reason: reason }) 
        });
        const data = await res.json();
        if (data.success) {
            showNotification("تم رفض الطلب.", "info");
            loadAdminOrders();
        } else {
            showNotification("فشل الرفض.", "error");
        }
    } catch (e) { showNotification("خطأ في الاتصال.", "error"); }
}

async function searchOrderFull() {
    const input = document.getElementById('search-input');
    const output = document.getElementById('search-output');
    if(!input || !output) return;
    
    const id = input.value.trim();
    if(!id) { alert("الرجاء إدخال رقم الطلب"); return; }
    
    output.style.display = "block";
    output.innerHTML = '<div class="loader"></div>';
    
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        if(!res.ok) throw new Error("Failed to fetch");
        const orders = await res.json();
        
        const order = orders.find(o => o.orderId == id);
        
        if(!order) {
            output.innerHTML = '<p style="color:var(--primary); font-weight:bold; text-align:center;">❌ الطلب غير موجود</p>';
            return;
        }
        
        let html = '<table style="width:100%; border-collapse: collapse; direction:ltr; font-family:monospace; font-size:0.9rem;">';
        
        function formatValue(val) {
            if (val === null) return '<span style="color:#777;">null</span>';
            if (val === undefined) return '<span style="color:#777;">undefined</span>';
            if (typeof val === 'boolean') return val ? '<span style="color:var(--success);">true</span>' : '<span style="color:var(--primary);">false</span>';
            if (typeof val === 'object') return `<pre style="margin:0; background:#000; padding:5px; border-radius:4px; max-height:200px; overflow:auto; white-space:pre-wrap;">${JSON.stringify(val, null, 2)}</pre>`;
            if (String(val).startsWith('http')) return `<a href="${val}" target="_blank" style="color:#4da3ff; text-decoration:underline;">Link</a>`;
            return `<span style="color:#ddd;">${val}</span>`;
        }

        for (const key in order) {
            html += `
                <tr style="border-bottom:1px solid #222;">
                    <td style="padding:12px; color:#aaa; width:200px; vertical-align:top; border-right:1px solid #222;">${key}</td>
                    <td style="padding:12px; background:rgba(255,255,255,0.02);">${formatValue(order[key])}</td>
                </tr>
            `;
        }
        
        html += '</table>';
        output.innerHTML = html;
        
    } catch(e) {
        output.innerHTML = '<p style="color:var(--primary); text-align:center;">حدث خطأ في الاتصال.</p>';
        console.error(e);
    }
}

/* =================================================================
   🚀 4. دوال صفحة التتبع (Track Page) - تمت الإضافة
   ================================================================= */
async function initTrackPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    
    if (!orderId) {
        document.querySelector('.status-page-box').innerHTML = '<p style="text-align:center; color:#fff;">رقم الطلب غير موجود.</p>';
        return;
    }

    document.getElementById('disp-id').innerText = orderId;

    try {
        const res = await fetch(`${SERVER_URL}/order-status/${orderId}`, { headers: { "Bypass-Tunnel-Reminder": "true" } });
        const data = await res.json();

        // إخفاء كل الواجهات أولاً
        document.getElementById('pending-view').style.display = 'none';
        document.getElementById('rejected-view').style.display = 'none';
        document.getElementById('approved-view').style.display = 'none';

        if (data.status === 'pending') {
            document.getElementById('pending-view').style.display = 'block';
        } 
        else if (data.status === 'rejected') {
            document.getElementById('rejected-view').style.display = 'block';
            const reasonEl = document.getElementById('rejection-reason');
            if(reasonEl) reasonEl.innerText = data.rejectionReason || "لم يتم ذكر سبب.";
        }
        else if (data.status === 'approved' || data.status === 'completed') {
            document.getElementById('approved-view').style.display = 'block';
            
            // عرض وصف المنتج
            if(data.productDescription) {
                const descContainer = document.getElementById('product-description-container');
                if(descContainer) {
                    descContainer.innerHTML = `
                        <div class="product-description-box">
                            <h4><i class="fas fa-info-circle"></i> تفاصيل المنتج</h4>
                            <p>${data.productDescription}</p>
                        </div>
                    `;
                }
            }

            // عرض بيانات الحساب
            const accContainer = document.getElementById('account-display');
            let html = '';

            // تحقق من نوع المنتج (كامل أم بروفايل)
            if (data.accountEmail && data.accountPassword) {
                // حساب كامل
                html = `
                    <img src="https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png" class="profile-avatar">
                    <div class="info-row">
                        <span class="info-label">الإيميل:</span>
                        <span class="info-value">${data.accountEmail}</span>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.accountEmail}')"><i class="fas fa-copy"></i></button>
                    </div>
                    <div class="info-row">
                        <span class="info-label">كلمة المرور:</span>
                        <span class="info-value">${data.accountPassword}</span>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.accountPassword}')"><i class="fas fa-copy"></i></button>
                    </div>
                `;
            } else {
                // بروفايل
                const img = data.profileImage ? `${SERVER_URL}${data.profileImage}` : 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.png';
                html = `
                    <img src="${img}" class="profile-avatar">
                    <div class="info-row">
                        <span class="info-label">الإيميل:</span>
                        <span class="info-value">${data.accountEmail || 'N/A'}</span>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.accountEmail || ''}')"><i class="fas fa-copy"></i></button>
                    </div>
                    <div class="info-row">
                        <span class="info-label">اسم البروفايل:</span>
                        <span class="info-value">${data.profileName}</span>
                    </div>
                    ${data.profilePin ? `<div class="pin-display">${data.profilePin}</div><br><span style="color:#666;font-size:0.8rem;">PIN Code</span>` : ''}
                `;
            }
            accContainer.innerHTML = html;

            // منطق الكود
            if (data.requiresCode) {
                document.getElementById('code-section').style.display = 'block';
                if (data.savedCode) {
                    document.getElementById('code-result').style.display = 'block';
                    document.getElementById('final-code').innerText = data.savedCode;
                    document.getElementById('code-btn').style.display = 'none';
                }
            }
        } 
        else {
            document.querySelector('.status-page-box').innerHTML = '<p style="text-align:center; color:#fff;">حالة الطلب غير معروفة.</p>';
        }

    } catch (e) {
        console.error(e);
        document.querySelector('.status-page-box').innerHTML = '<p style="text-align:center; color:red;">حدث خطأ في الاتصال بالسيرفر.</p>';
    }
}

async function getCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');
    const btn = document.getElementById('code-btn');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الجلب...';

    try {
        const res = await fetch(`${SERVER_URL}/get-code-secure`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('code-result').style.display = 'block';
            document.getElementById('final-code').innerText = data.code;
            btn.style.display = 'none';
            showNotification("تم جلب الكود بنجاح!", "success");
        } else {
            showNotification(data.message || "فشل جلب الكود.", "error");
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-key"></i> جلب كود الدخول';
        }
    } catch (e) {
        showNotification("خطأ في الاتصال.", "error");
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> جلب كود الدخول';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'index.html' || currentPage === '') { updateUserSessionUI(); loadProducts(); loadMyOrdersWidget(); }
    if (currentPage === 'admin.html') { const f = document.querySelector('.nav-item'); if (f) showSection('orders', f); loadAdminOrders(); toggleProductFields(); }
    if (currentPage === 'track.html') { initTrackPage(); }
});
