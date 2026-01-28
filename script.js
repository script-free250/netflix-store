// ✅ تأكد أن هذا الرابط مطابق للسيرفر (V5)
const SERVER_URL = "https://hhjk-shop-final-v5.loca.lt"; 

/* =========================================
   🛒 دوال المستخدم (User Side)
   ========================================= */

// تخزين الطلبات محلياً
function saveLocalOrder(order) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    if (!orders.find(o => o.id === order.id)) {
        orders.push(order);
        localStorage.setItem('my_orders', JSON.stringify(orders));
    }
}
function getLocalOrders() { return JSON.parse(localStorage.getItem('my_orders') || '[]'); }

// تحميل الصفحة الرئيسية
async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: {'Bypass-Tunnel-Reminder': 'true'} });
        const products = await res.json();
        container.innerHTML = products.length ? '' : '<p style="text-align:center; color:#777">لا توجد عروض حالياً</p>';

        products.forEach(p => {
            const isUser = p.type === 'netflix-user';
            container.innerHTML += `
                <div class="card">
                    <span class="badge">${isUser ? 'مشترك' : 'كامل'}</span>
                    <div class="card-content">
                        <h3>${p.name}</h3>
                        <span class="price">${p.price} ج.م</span>
                        <p class="desc">شامل الضمان - تسليم فوري وتلقائي</p>
                        <button class="btn" onclick="openPaymentModal(${p.id}, '${p.name}')">اشتري الآن</button>
                    </div>
                </div>`;
        });
        
        loadMyOrdersWidget(); // تحميل الطلبات وتحديث حالتها
    } catch (e) { 
        container.innerHTML = `<p style="text-align:center; color:#e50914;">يرجى تشغيل السيرفر وفتح الرابط</p>`; 
    }
}

// تحميل ويدجت "طلباتي" (مع التحديث الفوري للحالة)
function loadMyOrdersWidget() {
    const section = document.getElementById('my-orders-list');
    if (!section) return;

    const localOrders = getLocalOrders().reverse();
    if (!localOrders.length) { section.innerHTML = '<p style="color:#555">لا توجد طلبات سابقة.</p>'; return; }
    
    section.innerHTML = '';
    
    localOrders.forEach(async (o) => {
        // الحالة الافتراضية
        let statusText = "جاري المراجعة ⏳";
        let statusClass = "status-pending";
        
        try {
            // 🔥 جلب الحالة الحقيقية من السيرفر الآن 🔥
            const r = await fetch(`${SERVER_URL}/order-status/${o.id}`);
            const d = await r.json();
            
            if (d.status === 'approved') { 
                statusText = "جاهز (اضغط للدخول) ✅"; 
                statusClass = "status-approved"; 
            } else if (d.status === 'completed') { 
                statusText = "تم الاستلام 🏁"; 
                statusClass = "status-completed"; 
            }
        } catch(e) { console.log("خطأ في تحديث الحالة"); }
        
        // رسم الكارت
        const cardHtml = `
            <div class="order-item ${statusClass}" onclick="window.location.href='track.html?id=${o.id}'">
                <div>
                    <div style="font-weight:bold; font-size:1.1rem;">${o.name}</div>
                    <div style="color:#777; font-size:0.8rem;">ID: ${o.id}</div>
                </div>
                <div class="status-label ${getStatusClass(statusClass)}">${statusText}</div>
            </div>`;
            
        section.insertAdjacentHTML('beforeend', cardHtml);
    });
}

function getStatusClass(cls) {
    if(cls.includes('approved')) return 'st-done';
    if(cls.includes('completed')) return 'st-comp';
    return 'st-wait';
}

// --- نافذة الدفع ---
let selId, selName;
function openPaymentModal(id, name) {
    selId = id; selName = name;
    document.getElementById('pay-phone').value = '';
    document.getElementById('pay-img').value = '';
    document.getElementById('img-prev').style.display = 'none';
    document.getElementById('payment-modal').style.display = 'flex';
}
function closePaymentModal() { document.getElementById('payment-modal').style.display = 'none'; }

function previewFile() {
    const f = document.getElementById('pay-img').files[0];
    const prev = document.getElementById('img-prev');
    if (f) {
        const r = new FileReader();
        r.onload = () => { prev.src = r.result; prev.style.display = 'block'; }
        r.readAsDataURL(f);
    }
}

async function confirmPurchase() {
    const phone = document.getElementById('pay-phone').value;
    const file = document.getElementById('pay-img').files[0];
    const btn = document.getElementById('btn-pay');

    if(!phone || !file) return alert("أكمل البيانات");
    
    btn.innerText = "جاري الإرسال..."; btn.disabled = true;
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/buy`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ productId: selId, userPhone: phone, screenshot: reader.result })
            });
            const data = await res.json();
            if(data.success) {
                saveLocalOrder({ id: data.orderId, name: selName });
                window.location.href = `track.html?id=${data.orderId}`;
            } else alert("خطأ");
        } catch(e) { alert("فشل الاتصال"); }
        btn.innerText = "تأكيد"; btn.disabled = false;
    };
}

/* =========================================
   📡 صفحة التتبع (Track.html)
   ========================================= */
let trackTimer;
async function initTrackPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    
    const check = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${id}`);
            const data = await res.json();
            
            if (data.status === 'approved' || data.status === 'completed') {
                document.getElementById('view-pending').style.display = 'none';
                document.getElementById('view-approved').style.display = 'block';
                
                document.getElementById('acc-email').innerText = data.accountEmail;
                document.getElementById('acc-pass').innerText = data.accountPassword;
                
                if (data.requiresCode) {
                    document.getElementById('sec-code').style.display = 'block';
                    // الكود يظهر مرة واحدة فقط
                    if (data.savedCode) showCode(data.savedCode);
                }
                
                if (data.status === 'completed') document.getElementById('status-head').innerText = "تم تسليم الطلب ✅";
                clearInterval(trackTimer);
            }
        } catch(e){}
    };
    check();
    trackTimer = setInterval(check, 3000);
}

function showCode(c) {
    document.getElementById('btn-get-code').style.display = 'none';
    document.getElementById('res-code').style.display = 'block';
    document.getElementById('final-code').innerText = c;
}

async function getCode() {
    const id = new URLSearchParams(window.location.search).get('id');
    const btn = document.getElementById('btn-get-code');
    btn.innerText = "جاري الاتصال..."; btn.disabled = true;
    
    try {
        const res = await fetch(`${SERVER_URL}/get-code-secure`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderId: id })
        });
        const d = await res.json();
        if(d.success) showCode(d.code);
        else { alert(d.message || "انتظر قليلاً"); btn.innerText = "محاولة مجدداً"; btn.disabled = false; }
    } catch(e) { alert("خطأ"); btn.disabled = false; }
}

/* =========================================
   🔧 الأدمن (Admin)
   ========================================= */
async function loadAdminOrders() {
    const list = document.getElementById('admin-list');
    if(!list) return;
    list.innerHTML = '<p style="color:#666">تحميل...</p>';
    
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        const orders = await res.json();
        orders.reverse();
        list.innerHTML = orders.length ? '' : '<p>لا توجد طلبات</p>';
        
        orders.forEach(o => {
            let st = o.status === 'pending' ? '<span class="status-label st-wait">انتظار</span>' : '<span class="status-label st-done">تم</span>';
            let act = o.status === 'pending' ? `<button class="btn" style="width:auto; padding:5px 15px;" onclick="approve(${o.orderId})">تفعيل</button>` : '';
            let imgBtn = o.hasScreenshot ? `<i class="fas fa-image" style="color:#00bcd4; margin-left:5px; cursor:pointer;" onclick="searchOrderDetails(${o.orderId})"></i>` : '';

            list.innerHTML += `
                <div class="order-item">
                    <div>
                        <div style="font-weight:bold; color:var(--text-white)">${o.productName} ${imgBtn}</div>
                        <div style="font-size:0.8rem; color:#777">#${o.orderId} | 📱 ${o.userPhone}</div>
                    </div>
                    <div style="text-align:left">${st}<br>${act}</div>
                </div>`;
        });
    } catch(e) { list.innerHTML = '<p style="color:red">خطأ</p>'; }
}

async function approve(id) {
    if(!confirm("تأكيد التفعيل؟")) return;
    await fetch(`${SERVER_URL}/admin/approve`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderId: id })
    });
    loadAdminOrders();
}

async function addProduct() {
    const d = {
        type: document.getElementById('p-type').value,
        name: document.getElementById('p-name').value,
        price: document.getElementById('p-price').value,
        accountEmail: document.getElementById('p-email').value,
        accountPassword: document.getElementById('p-pass').value
    };
    if(!d.name || !d.price) return alert("ناقص");
    await fetch(`${SERVER_URL}/admin/add-product`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(d) });
    alert("تم");
}

async function searchOrderDetails(directId = null) {
    const id = directId || document.getElementById('search-inp').value;
    if(!id) return alert("الرقم؟");
    
    try {
        const res = await fetch(`${SERVER_URL}/admin/order-details/${id}`);
        const o = await res.json();
        if(o.error) return alert("غير موجود");
        
        document.getElementById('d-id').innerText = o.orderId;
        document.getElementById('d-name').innerText = o.productName;
        document.getElementById('d-phone').innerText = o.userPhone;
        document.getElementById('d-ip').innerText = o.userIp;
        
        const imgDiv = document.getElementById('d-img');
        imgDiv.innerHTML = o.screenshot ? `<img src="${o.screenshot}" style="max-width:100%; border-radius:8px; border:1px solid #333;">` : 'لا يوجد';
        
        document.getElementById('search-res').style.display = 'block';
    } catch(e) { alert("خطأ"); }
}

// Router
document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById('admin-list')) loadAdminOrders();
    else if(window.location.href.includes('track.html')) initTrackPage();
    else if(document.getElementById('products-container')) loadProducts();
});
