// 🔴 تأكد إن الرابط ده هو نفس الرابط اللي طالعلك في الشاشة السوداء في السيرفر
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

/* =========================================
   🛒 دوال المستخدم (User)
   ========================================= */

// حفظ الطلبات في المتصفح
function saveLocalOrder(order) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    orders.push(order);
    localStorage.setItem('my_orders', JSON.stringify(orders));
}
function getLocalOrders() { return JSON.parse(localStorage.getItem('my_orders') || '[]'); }

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
                    <button class="btn" onclick="buyProduct(${p.id}, '${p.name}')">شراء</button>
                </div>`;
        });
        loadMyOrdersWidget(); // تحميل قائمة طلباتي
    } catch (e) { 
        container.innerHTML = '<p style="text-align:center; color:red">تأكد أن السيرفر يعمل!</p>';
    }
}

function loadMyOrdersWidget() {
    const section = document.getElementById('my-orders-list');
    if (!section) return;
    const localOrders = getLocalOrders().reverse();
    if (!localOrders.length) { section.innerHTML = '<p style="color:#777">لا توجد طلبات سابقة.</p>'; return; }
    
    section.innerHTML = '';
    localOrders.forEach(async (o) => {
        let status = "جاري المراجعة", color = "pending";
        try {
            const r = await fetch(`${SERVER_URL}/order-status/${o.id}`);
            const d = await r.json();
            if(d.status === 'approved') { status="جاهز للاستلام"; color="approved"; }
            if(d.status === 'completed') { status="تم الاستلام"; color="completed"; }
        } catch(e){}
        
        section.innerHTML += `
            <div class="order-mini-card ${color}" onclick="window.location.href='track.html?id=${o.id}'" style="cursor:pointer;">
                <div><strong>${o.name}</strong><br><span style="font-size:0.8rem; color:#888">#${o.id}</span></div>
                <span class="status-badge bg-${color}">${status}</span>
            </div>`;
    });
}

async function buyProduct(id, name) {
    const phone = prompt("📞 أدخل رقم فودافون كاش:");
    if (!phone) return;
    
    const btn = event.target;
    btn.innerText = "جاري الطلب...";
    btn.disabled = true;

    try {
        const res = await fetch(`${SERVER_URL}/buy`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ productId: id, userPhone: phone })
        });
        const data = await res.json();
        if (data.success) {
            saveLocalOrder({ id: data.orderId, name: name, date: new Date() });
            window.location.href = `track.html?id=${data.orderId}`;
        } else { alert("حدث خطأ"); }
    } catch (e) { alert("فشل الاتصال"); }
    btn.innerText = "شراء"; btn.disabled = false;
}

/* =========================================
   📡 دوال التتبع (Track)
   ========================================= */
let trackInterval;
async function initTrackPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    if(document.getElementById('disp-id')) document.getElementById('disp-id').innerText = id;

    const check = async () => {
        try {
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
                clearInterval(trackInterval);
            }
        } catch(e){}
    };
    check();
    trackInterval = setInterval(check, 3000);
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
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderId: id })
        });
        const data = await res.json();
        if (data.success) showFinalCode(data.code);
        else { alert(data.message); btn.innerText = "محاولة مجدداً"; btn.disabled = false; }
    } catch(e) { btn.innerText = "خطأ"; btn.disabled = false; }
}

/* =========================================
   🔧 دوال الأدمن (Admin)
   ========================================= */

async function addProduct() {
    const type = document.getElementById('p-type').value;
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const email = document.getElementById('p-email').value;
    const pass = document.getElementById('p-pass').value;

    if(!name || !price) { alert("بيانات ناقصة"); return; }

    try {
        const res = await fetch(`${SERVER_URL}/admin/add-product`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ type, name, price, accountEmail: email, accountPassword: pass })
        });
        const data = await res.json();
        if(data.success) { alert("تم النشر ✅"); loadAdminOrders(); }
    } catch(e) { alert("خطأ"); }
}

async function loadAdminOrders() {
    const container = document.getElementById('orders-list');
    const searchVal = document.getElementById('admin-search') ? document.getElementById('admin-search').value : "";
    
    if(!container) return;
    container.innerHTML = '<p style="color:#777">جاري التحديث...</p>';

    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        let orders = await res.json();

        // فلترة
        if (searchVal) orders = orders.filter(o => o.orderId.toString().includes(searchVal) || o.userPhone.includes(searchVal));
        // ترتيب (الجديد فوق)
        orders.reverse();

        container.innerHTML = '';
        if (orders.length === 0) { container.innerHTML = '<p>لا توجد طلبات</p>'; return; }

        orders.forEach(o => {
            let statusBadge = o.status === 'pending' ? '<span style="color:orange">انتظار</span>' : '<span style="color:green">تم</span>';
            let actionBtn = o.status === 'pending' ? `<button class="btn" style="width:auto; padding:5px 15px;" onclick="approve(${o.orderId})">تفعيل</button>` : '';

            container.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:15px;">
                    <div>
                        <div style="font-weight:bold; color:var(--primary)">${o.productName}</div>
                        <div style="font-size:0.8rem; color:#aaa">#${o.orderId}</div>
                        <div style="font-size:0.9rem; margin-top:5px;">📱 ${o.userPhone}</div>
                    </div>
                    <div style="text-align:left">
                        ${statusBadge}<br>
                        ${actionBtn}
                    </div>
                </div>`;
        });
    } catch(e) { container.innerHTML = '<p style="color:red">فشل الاتصال</p>'; }
}

async function approve(id) {
    if(!confirm("تأكيد تفعيل الطلب؟")) return;
    await fetch(`${SERVER_URL}/admin/approve`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ orderId: id })
    });
    loadAdminOrders();
}

/* =========================================
   🚀 الموجه الذكي (Router) - أهم جزء
   ========================================= */
document.addEventListener("DOMContentLoaded", function() {
    // 1. نحن في صفحة الأدمن
    if (document.getElementById('orders-list')) {
        loadAdminOrders();
    } 
    // 2. نحن في صفحة التتبع
    else if (window.location.href.includes('track.html')) {
        initTrackPage();
    }
    // 3. نحن في الصفحة الرئيسية
    else if (document.getElementById('products-container')) {
        loadProducts();
    }
});
