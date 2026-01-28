const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

// --- دوال المستخدم ---

async function loadProducts() {
    const container = document.getElementById('products-container');
    if(!container) return;
    try {
        const res = await fetch(`${SERVER_URL}/products`);
        const products = await res.json();
        container.innerHTML = products.map(p => `
            <div class="card" data-aos="fade-up">
                <span class="tag">${p.type === 'netflix-user' ? 'بروفايل' : 'حساب كامل'}</span>
                <h3>${p.name}</h3>
                <span class="price">${p.price} ج.م</span>
                <button class="btn" onclick="openBuyModal(${p.id}, '${p.name}')">اشترك الآن</button>
            </div>
        `).join('');
        loadMyOrdersWidget();
    } catch(e) { container.innerHTML = "خطأ في الاتصال بالسيرفر"; }
}

function openBuyModal(id, name) {
    document.getElementById('buyModal').style.display = 'flex';
    document.getElementById('modal-product-name').innerText = name;
    document.getElementById('modal-product-id').value = id;
    document.getElementById('modal-product-hidden-name').value = name;
}

function closeModal() { document.getElementById('buyModal').style.display = 'none'; }

async function submitOrder(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
        const res = await fetch(`${SERVER_URL}/buy`, { method: 'POST', body: fd });
        const data = await res.json();
        if(data.success) {
            alert("✅ تم استلام طلبك! سيتم المراجعة فوراً.");
            saveLocalOrder({ id: data.orderId, name: fd.get('productName') });
            closeModal();
            loadMyOrdersWidget();
        }
    } catch(e) { alert("فشل الإرسال"); }
}

function saveLocalOrder(o) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    orders.push(o);
    localStorage.setItem('my_orders', JSON.stringify(orders));
}

function loadMyOrdersWidget() {
    const list = document.getElementById('my-orders-list');
    if(!list) return;
    const orders = JSON.parse(localStorage.getItem('my_orders') || '[]').reverse();
    list.innerHTML = orders.map(o => `
        <div class="btn" style="background:#1a1a1a; margin-top:10px; width:100%; text-align:right;" onclick="window.location.href='track.html?id=${o.id}'">
            #${o.id} - ${o.name} <span style="float:left; color:var(--primary)">متابعة <i class="fas fa-chevron-left"></i></span>
        </div>
    `).join('') || '<p style="color:#555">لا توجد طلبات سابقة.</p>';
}

// --- دوال الأدمن ---

async function adminLogin() {
    const user = document.getElementById('adm-user').value;
    const pass = document.getElementById('adm-pass').value;
    const res = await fetch(`${SERVER_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass })
    });
    const data = await res.json();
    if(data.success) {
        localStorage.setItem('admin_token', data.token);
        checkAdminAuth();
    } else {
        const msg = document.getElementById('login-msg');
        msg.innerText = data.message;
        msg.style.display = 'block';
    }
}

function checkAdminAuth() {
    const token = localStorage.getItem('admin_token');
    if(token) {
        document.getElementById('admin-login-overlay').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
        loadAdminOrders();
    }
}

function adminLogout() {
    localStorage.removeItem('admin_token');
    location.reload();
}

function showTab(tab) {
    document.getElementById('tab-orders').style.display = tab === 'orders' ? 'block' : 'none';
    document.getElementById('tab-add').style.display = tab === 'add' ? 'block' : 'none';
}

async function loadAdminOrders() {
    const res = await fetch(`${SERVER_URL}/admin/orders`);
    const orders = await res.json();
    const list = document.getElementById('admin-orders-list');
    list.innerHTML = orders.map(o => `
        <div class="card" style="text-align:right; margin-bottom:15px; border-right:5px solid ${o.status==='pending'?'#f5a623':'#46d369'}">
            <h4>${o.productName} (#${o.orderId})</h4>
            <p>واتساب: ${o.userPhone}</p>
            <a href="${SERVER_URL}${o.receipt}" target="_blank" class="btn" style="padding:5px 10px; font-size:0.8rem; background:#333">رؤية الإيصال</a>
            ${o.status === 'pending' ? `<button onclick="approveOrder(${o.orderId})" class="btn" style="padding:5px 10px; font-size:0.8rem; margin-right:10px;">تفعيل</button>` : '✅ تم التفعيل'}
        </div>
    `).join('');
}

async function approveOrder(id) {
    await fetch(`${SERVER_URL}/admin/approve`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ orderId: id })
    });
    loadAdminOrders();
}
