// ✅ الرابط الثابت (V5)
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

// --- إدارة التخزين ---
function saveLocalOrder(order) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    if (!orders.find(o => o.id === order.id)) {
        orders.push(order);
        localStorage.setItem('my_orders', JSON.stringify(orders));
    }
}
function getLocalOrders() { return JSON.parse(localStorage.getItem('my_orders') || '[]'); }

// --- الصفحة الرئيسية ---
async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;
    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: {'Bypass-Tunnel-Reminder': 'true'} });
        const products = await res.json();
        container.innerHTML = products.length ? '' : '<p style="text-align:center">لا توجد منتجات</p>';
        products.forEach(p => {
            container.innerHTML += `
                <div class="card">
                    <span class="tag">${p.type === 'netflix-user' ? 'مشترك' : 'كامل'}</span>
                    <h3>${p.name}</h3>
                    <span class="price">${p.price} ج.م</span>
                    <button class="btn" onclick="openPaymentModal(${p.id}, '${p.name}')">شراء الآن</button>
                </div>`;
        });
        loadMyOrdersWidget();
    } catch (e) { container.innerHTML = '<p style="text-align:center; color:red">تأكد من تشغيل السيرفر</p>'; }
}

function loadMyOrdersWidget() {
    const section = document.getElementById('my-orders-list');
    if (!section) return;
    const localOrders = getLocalOrders().reverse();
    if (!localOrders.length) { section.innerHTML = '<p style="text-align:center; color:#555">لا توجد طلبات</p>'; return; }
    
    section.innerHTML = '';
    localOrders.forEach(async (o) => {
        let st = "جاري المراجعة", cls = "bg-pending";
        try {
            const r = await fetch(`${SERVER_URL}/order-status/${o.id}`);
            const d = await r.json();
            if(d.status === 'approved') { st="جاهز للدخول"; cls="bg-success"; }
            if(d.status === 'completed') { st="تم الاستلام"; cls="bg-blue"; }
        } catch(e){}
        section.innerHTML += `<div class="order-mini-card" onclick="location.href='track.html?id=${o.id}'"><div><strong>${o.name}</strong><br><span style="font-size:0.8rem; color:#777">#${o.id}</span></div><span style="${cls}">${st}</span></div>`;
    });
}

// --- نافذة الدفع ---
let selectedProductId, selectedProductName;
function openPaymentModal(id, name) {
    selectedProductId = id; selectedProductName = name;
    document.getElementById('pay-phone').value = '';
    document.getElementById('pay-screenshot').value = '';
    document.getElementById('img-preview').style.display = 'none';
    document.getElementById('payment-modal').style.display = 'flex';
}
function closePaymentModal() { document.getElementById('payment-modal').style.display = 'none'; }

function previewFile() {
    const file = document.getElementById('pay-screenshot').files[0];
    const preview = document.getElementById('img-preview');
    if (file) {
        const reader = new FileReader();
        reader.onloadend = function() { preview.src = reader.result; preview.style.display = 'block'; }
        reader.readAsDataURL(file);
    }
}

async function confirmPurchase() {
    const phone = document.getElementById('pay-phone').value;
    const fileInput = document.getElementById('pay-screenshot');
    const btn = document.getElementById('btn-confirm-pay');

    if (!phone || !fileInput.files[0]) return alert("أدخل الرقم وصورة التحويل");
    
    btn.innerText = "جاري الرفع..."; btn.disabled = true;
    const reader = new FileReader();
    reader.readAsDataURL(fileInput.files[0]);
    reader.onload = async function () {
        try {
            const res = await fetch(`${SERVER_URL}/buy`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ productId: selectedProductId, userPhone: phone, screenshot: reader.result })
            });
            const data = await res.json();
            if (data.success) {
                saveLocalOrder({ id: data.orderId, name: selectedProductName });
                window.location.href = `track.html?id=${data.orderId}`;
            } else alert("خطأ");
        } catch (e) { alert("فشل الاتصال"); }
        btn.innerText = "تأكيد"; btn.disabled = false;
    };
}

// --- التتبع ---
let trackInterval;
async function initTrackPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    if(document.getElementById('disp-id')) document.getElementById('disp-id').innerText = id;

    const check = async () => {
        const res = await fetch(`${SERVER_URL}/order-status/${id}`);
        const data = await res.json();
        if (data.status === 'approved' || data.status === 'completed') {
            document.getElementById('pending-view').style.display = 'none';
            document.getElementById('approved-view').style.display = 'block';
            document.getElementById('acc-email').innerText = data.accountEmail;
            document.getElementById('acc-pass').innerText = data.accountPassword;
            if (data.requiresCode) {
                document.getElementById('code-section').style.display = 'block';
                if (data.savedCode) showFinalCode(data.savedCode);
            }
            if (data.status === 'completed' && !data.requiresCode) document.getElementById('status-title').innerText = "تم التسليم ✅";
            clearInterval(trackInterval);
        }
    };
    check(); trackInterval = setInterval(check, 3000);
}

function showFinalCode(code) {
    document.getElementById('code-btn').style.display = 'none';
    document.getElementById('code-result').style.display = 'block';
    document.getElementById('final-code').innerText = code;
}

async function getCode() {
    const id = new URLSearchParams(window.location.search).get('id');
    const btn = document.getElementById('code-btn');
    btn.innerText = "جاري الاتصال..."; btn.disabled = true;
    try {
        const res = await fetch(`${SERVER_URL}/get-code-secure`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderId: id })
        });
        const data = await res.json();
        if (data.success) showFinalCode(data.code);
        else { alert(data.message); btn.innerText = "محاولة مجدداً"; btn.disabled = false; }
    } catch(e) { btn.innerText = "خطأ"; btn.disabled = false; }
}

// --- الأدمن ---
async function addProduct() { /* نفس كود الأدمن السابق */
    const type = document.getElementById('p-type').value;
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const email = document.getElementById('p-email').value;
    const pass = document.getElementById('p-pass').value;
    await fetch(`${SERVER_URL}/admin/add-product`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ type, name, price, accountEmail: email, accountPassword: pass }) });
    alert("تم");
}

async function loadAdminOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    const res = await fetch(`${SERVER_URL}/admin/orders`);
    let orders = await res.json();
    orders.reverse();
    container.innerHTML = orders.length ? '' : '<p>لا توجد طلبات</p>';
    orders.forEach(o => {
        let st = o.status === 'pending' ? '<span style="color:orange">انتظار</span>' : '<span style="color:green">تم</span>';
        let btn = o.status === 'pending' ? `<button class="btn" style="width:auto; padding:5px 15px;" onclick="approve(${o.orderId})">تفعيل</button>` : '';
        container.innerHTML += `<div class="order-mini-card"><div><strong>${o.productName}</strong><br><span style="font-size:0.8rem; color:#aaa">#${o.orderId}</span><br>📱 ${o.userPhone}</div><div>${st}<br>${btn}</div></div>`;
    });
}

async function approve(id) {
    if(!confirm("تأكيد؟")) return;
    await fetch(`${SERVER_URL}/admin/approve`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderId: id }) });
    loadAdminOrders();
}

async function searchOrderDetails() {
    const id = document.getElementById('detail-search-input').value;
    if (!id) return alert("الرقم؟");
    try {
        const res = await fetch(`${SERVER_URL}/admin/order-details/${id}`);
        const order = await res.json();
        if (order.error) return alert("غير موجود");
        
        document.getElementById('d-id').innerText = order.orderId;
        document.getElementById('d-product').innerText = order.productName;
        document.getElementById('d-phone').innerText = order.userPhone;
        document.getElementById('d-ip').innerText = order.userIp;
        document.getElementById('d-status').innerText = order.status;
        document.getElementById('d-time-create').innerText = new Date(order.createdAt).toLocaleString();
        document.getElementById('d-time-approve').innerText = order.approvedAt ? new Date(order.approvedAt).toLocaleString() : '--';
        document.getElementById('d-time-code').innerText = order.codeFetchedAt ? new Date(order.codeFetchedAt).toLocaleString() : '--';
        document.getElementById('d-code').innerText = order.fetchedCode || '----';
        
        const imgDiv = document.getElementById('d-img-container');
        imgDiv.innerHTML = order.screenshot ? `<button class="btn" style="background:#00bcd4; width:auto;" onclick="window.open('${order.screenshot}').document.write('<img src=${order.screenshot}>')">📷 مشاهدة الإيصال</button>` : 'لا يوجد صورة';
        
        document.getElementById('order-details-result').style.display = 'block';
    } catch(e) { alert("خطأ"); }
}

document.addEventListener("DOMContentLoaded", function() {
    if (document.getElementById('orders-list')) loadAdminOrders();
    else if (window.location.href.includes('track.html')) initTrackPage();
    else if (document.getElementById('products-container')) loadProducts();
});
