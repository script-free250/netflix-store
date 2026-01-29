// ⚠️⚠️ هام: انسخ الرابط اللي طلعلك في التيرمينال (الشاشة السوداء) وحطه هنا ⚠️⚠️
const SERVER_URL = "https://hhjk-shop-repaired-v2.loca.lt"; 

let productsData = []; 
let currentProductId = null;

/* --- دوال المساعدة --- */
function showNotification(msg, type = 'info') {
    const container = document.getElementById('notification-container');
    if(!container) { alert(msg); return; }
    const div = document.createElement('div');
    div.className = `notification ${type}`;
    div.innerHTML = `<span>${msg}</span>`;
    container.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

/* --- المصادقة (Auth) --- */
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = 'جاري الدخول...'; btn.disabled = true;
    
    try {
        const res = await fetch(`${SERVER_URL}/login`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('password').value })
        });
        const data = await res.json();
        if(data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            window.location.href = 'index.html';
        } else {
            document.getElementById('error-message').innerText = data.message;
        }
    } catch(err) { alert('خطأ في الاتصال'); }
    finally { btn.innerHTML = 'دخول'; btn.disabled = false; }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
        const res = await fetch(`${SERVER_URL}/register`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                name: document.getElementById('name').value,
                email: document.getElementById('email').value, 
                password: document.getElementById('password').value 
            })
        });
        const data = await res.json();
        if(data.success) {
            alert('تم الحساب! سجل دخولك الآن.');
            window.location.href = 'login.html';
        } else {
            document.getElementById('error-message').innerText = data.message;
        }
    } catch(err) { alert('خطأ اتصال'); }
    btn.disabled = false;
}

function updateUserSessionUI() {
    const ui = document.getElementById('user-session');
    if(!ui) return;
    const user = JSON.parse(localStorage.getItem('user'));
    if(user) {
        ui.innerHTML = `<div class="user-session-ui"><span>أهلاً ${user.name}</span><button onclick="logout()" class="btn" style="width:auto; padding:5px 15px; margin:0; font-size:0.8rem;">خروج</button></div>`;
    } else {
        ui.innerHTML = `<a href="login.html" class="btn" style="width:auto; margin:0;">دخول</a>`;
    }
}
function logout() { localStorage.clear(); window.location.reload(); }

/* --- المتجر (Store) --- */
async function loadProducts() {
    const container = document.getElementById('products-container');
    if(!container) return;
    container.innerHTML = '<div class="loader"></div>';
    
    try {
        const res = await fetch(`${SERVER_URL}/products`);
        productsData = await res.json();
        container.innerHTML = '';
        
        if(productsData.length === 0) { container.innerHTML = '<p style="text-align:center; color:#fff;">لا توجد منتجات حالياً.</p>'; return; }

        productsData.forEach(p => {
            const isSoldOut = !p.inStock;
            const btnHtml = isSoldOut 
                ? `<button class="btn" disabled style="background:#444; cursor:not-allowed;">نفذت الكمية</button>`
                : `<button class="btn" onclick="openBuyModal(${p.id})">شراء الآن</button>`;
            
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <span class="tag">${p.type === 'netflix-user' ? 'بروفايل' : 'كامل'}</span>
                <h3>${p.name}</h3>
                <div class="price">${p.price} ج.م</div>
                <p class="product-description">${p.description || ''}</p>
                <div style="margin-top:auto;">${btnHtml}</div>
            `;
            container.appendChild(card);
        });
    } catch(e) { container.innerHTML = '<p style="color:red; text-align:center;">تأكد من تشغيل السيرفر وتحديث الرابط في script.js</p>'; }
}

function openBuyModal(id) {
    if(!localStorage.getItem('user')) {
        showNotification('يجب تسجيل الدخول أولاً', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }
    currentProductId = id;
    const p = productsData.find(x => x.id === id);
    document.getElementById('modal-product-name').innerText = p.name;
    document.getElementById('modal-product-description').innerText = p.description || '';
    document.getElementById('buyModal').style.display = 'block';
}
function closeModal() { document.getElementById('buyModal').style.display = 'none'; }

// ✅ الدالة دي كانت اسمها غلط، عشان كدة الزرار مكنش شغال. صلحتها لـ submitOrder
async function submitOrder(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = 'جاري الإرسال...'; btn.disabled = true;

    const formData = new FormData();
    formData.append('productId', currentProductId);
    formData.append('userEmail', JSON.parse(localStorage.getItem('user')).email);
    formData.append('userPhone', e.target.userPhone.value);
    formData.append('receipt', e.target.receipt.files[0]);

    try {
        const res = await fetch(`${SERVER_URL}/buy`, { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success) {
            closeModal();
            showNotification('✅ تم الطلب بنجاح! راجع صفحة طلباتي.', 'success');
            loadMyOrdersWidget();
        } else {
            showNotification(data.message, 'error');
        }
    } catch(err) { showNotification('خطأ في الاتصال', 'error'); }
    finally { btn.innerHTML = 'تأكيد الشراء'; btn.disabled = false; }
}

async function loadMyOrdersWidget() {
    const list = document.getElementById('my-orders-list');
    if(!list) return;
    const user = JSON.parse(localStorage.getItem('user'));
    if(!user) return;

    try {
        const res = await fetch(`${SERVER_URL}/my-orders?email=${user.email}`);
        const orders = await res.json();
        list.innerHTML = '';
        if(orders.length === 0) { list.innerHTML = '<p style="color:#777">لا توجد طلبات.</p>'; return; }
        
        orders.reverse().forEach(o => {
            const div = document.createElement('div');
            div.className = `order-mini-card`;
            div.onclick = () => window.location.href = `track.html?id=${o.orderId}`;
            div.innerHTML = `<div><strong>${o.productName}</strong><br><small>#${o.orderId}</small></div>
                             <span class="order-status ${o.status}">${o.status === 'approved' ? 'جاهز' : 'مراجعة'}</span>`;
            list.appendChild(div);
        });
    } catch(e) {}
}

/* --- صفحة التتبع (Track) --- */
async function initTrackPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    if(!id) return;
    document.getElementById('disp-id').innerText = '#' + id;
    
    try {
        const res = await fetch(`${SERVER_URL}/track-order`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderId: id })
        });
        const data = await res.json();
        
        if(data.status === 'approved') {
            document.getElementById('pending-view').style.display = 'none';
            document.getElementById('approved-view').style.display = 'block';
            
            // عرض بيانات الحساب
            let html = '';
            if(data.accountEmail) html += `<div class="info-row"><span class="info-label">Email</span><span class="info-value">${data.accountEmail}</span></div>`;
            if(data.accountPassword) html += `<div class="info-row"><span class="info-label">Pass</span><span class="info-value">${data.accountPassword}</span></div>`;
            if(data.profileName) html += `<div class="info-row"><span class="info-label">Profile</span><span class="info-value">${data.profileName}</span></div>`;
            if(data.profilePin) html += `<div style="text-align:center; margin-top:10px;"><span class="pin-display">${data.profilePin}</span></div>`;
            
            document.getElementById('account-display').innerHTML = html;
            if(data.productDescription) document.getElementById('product-description-container').innerHTML = `<div class="product-description-box"><p>${data.productDescription}</p></div>`;
        }
    } catch(e) {}
}

/* --- Admin Panel --- */
async function loadAdminOrders() {
    const list = document.getElementById('orders-list');
    if(!list) return;
    list.innerHTML = 'Loading...';
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        const orders = await res.json();
        list.innerHTML = '';
        orders.reverse().forEach(o => {
            const btn = o.status === 'pending' ? `<button class="btn" style="width:auto; padding:5px 15px;" onclick="approveOrder(${o.orderId})">تفعيل</button>` : '<span>✅</span>';
            const img = o.receiptImage ? `<a href="${SERVER_URL}${o.receiptImage}" target="_blank">صورة</a>` : '-';
            const div = document.createElement('div');
            div.className = 'order-card';
            div.innerHTML = `<div class="order-info"><h4>${o.productName}</h4><small>${o.userEmail} | ${o.userPhone || ''}</small></div>
                             <div class="order-actions">${img} ${btn}</div>`;
            list.appendChild(div);
        });
    } catch(e) { list.innerHTML = 'Error'; }
}

async function approveOrder(id) {
    if(!confirm('تفعيل الطلب وسحب من المخزون؟')) return;
    try {
        const res = await fetch(`${SERVER_URL}/admin/approve`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderId: id })
        });
        const data = await res.json();
        if(data.success) { alert('تم التفعيل'); loadAdminOrders(); }
        else { alert('فشل: ' + data.message); }
    } catch(e) { alert('خطأ'); }
}

// دالة توليد الخانات في صفحة الأدمن
function generateStockFields() {
    const container = document.getElementById('dynamic-stock-container');
    const type = document.getElementById('p-type').value;
    const qty = document.getElementById('stock-qty').value;
    if(!container) return;
    container.innerHTML = '';
    for(let i=0; i<qty; i++) {
        let fields = '';
        if(type === 'netflix-full') {
            fields = `<input type="email" name="accountEmails[]" class="form-control" placeholder="Email #${i+1}" required>
                      <input type="text" name="accountPasswords[]" class="form-control" placeholder="Pass #${i+1}" required>`;
        } else {
            fields = `<input type="text" name="profileNames[]" class="form-control" placeholder="Profile Name #${i+1}" required>
                      <input type="text" name="profilePins[]" class="form-control" placeholder="PIN #${i+1}" required>
                      <input type="file" name="profileImages" class="form-control">`;
        }
        container.innerHTML += `<div class="stock-item-box"><h5>نسخة رقم ${i+1}</h5>${fields}</div>`;
    }
}

// تشغيل الدوال حسب الصفحة
document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split('/').pop();
    updateUserSessionUI();
    
    if(page === 'index.html' || page === '') { loadProducts(); loadMyOrdersWidget(); }
    if(page === 'track.html') initTrackPage();
    if(page === 'admin.html') { loadAdminOrders(); generateStockFields(); }
});
