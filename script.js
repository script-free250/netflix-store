const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

/* ================= USER FUNCTIONS ================= */

async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return; 

    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: {'Bypass-Tunnel-Reminder': 'true'} });
        const products = await res.json();
        container.innerHTML = '';
        
        // تأثير تأخير للأنيميشن
        let delay = 0;
        products.forEach(p => {
            const isUser = p.type === 'netflix-user';
            container.innerHTML += `
                <div class="card" style="animation-delay: ${delay}s">
                    <span class="tag">${isUser ? '👤 مشترك' : '💎 كامل'}</span>
                    <h3>${p.name}</h3>
                    <span class="price">${p.price} <small style="font-size:1rem">ج.م</small></span>
                    <button class="btn" onclick="openBuyModal(${p.id}, '${p.name}')">شراء الآن</button>
                </div>`;
            delay += 0.1;
        });
        if(!products.length) container.innerHTML = '<p style="text-align:center;width:100%">لا توجد منتجات.</p>';
        loadMyOrdersWidget();
    } catch (e) { 
        container.innerHTML = `<p style="text-align:center; color:var(--primary);">خطأ في الاتصال.</p>`;
    }
}

function openBuyModal(id, name) {
    document.getElementById('buyModal').style.display = 'block';
    document.getElementById('modal-product-name').innerText = name;
    document.getElementById('modal-product-id').value = id;
}
function closeModal() { document.getElementById('buyModal').style.display = 'none'; }

async function submitOrder(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<div class="loader" style="width:20px;height:20px;margin:0;border-width:2px;"></div>';

    const formData = new FormData(e.target);
    try {
        const res = await fetch(`${SERVER_URL}/buy`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            saveLocalOrder({ id: data.orderId, name: document.getElementById('modal-product-name').innerText });
            closeModal();
            e.target.reset();
            document.getElementById('file-label-text').innerText = "اضغط لإرفاق الصورة";
            alert("✅ تم إرسال طلبك! انتظر التفعيل.");
            loadMyOrdersWidget();
        }
    } catch (error) { alert("حدث خطأ"); }
    btn.disabled = false; btn.innerHTML = originalText;
}

function saveLocalOrder(order) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    orders.push(order);
    localStorage.setItem('my_orders', JSON.stringify(orders));
}
function getLocalOrders() { return JSON.parse(localStorage.getItem('my_orders') || '[]'); }

function loadMyOrdersWidget() {
    const section = document.getElementById('my-orders-list');
    if(!section) return;
    const orders = getLocalOrders().reverse();
    section.innerHTML = '';
    orders.forEach(async (o) => {
        let statusHtml = '<span style="color:#f5a623"><i class="fas fa-clock"></i> مراجعة</span>';
        try {
            const r = await fetch(`${SERVER_URL}/order-status/${o.id}`);
            const d = await r.json();
            if(d.status === 'approved') statusHtml = '<span style="color:#46d369"><i class="fas fa-check"></i> جاهز</span>';
        } catch(e){}
        section.innerHTML += `
            <div class="order-mini-card" onclick="window.location.href='track.html?id=${o.id}'">
                <div><strong>${o.name}</strong><br><small style="color:#777">#${o.id}</small></div>
                ${statusHtml}
            </div>`;
    });
}

/* ================= ADMIN FUNCTIONS ================= */

// التحقق من الدخول عند تحميل صفحة الأدمن
if (window.location.pathname.includes('admin.html')) {
    const savedPass = localStorage.getItem('admin_pass');
    if (savedPass) {
        verifyAdmin(savedPass).then(valid => {
            if (valid) unlockAdmin();
            else document.getElementById('loginOverlay').style.display = 'flex';
        });
    }
}

async function adminLogin(e) {
    e.preventDefault();
    const pass = document.getElementById('adminPass').value;
    const valid = await verifyAdmin(pass);
    if(valid) {
        localStorage.setItem('admin_pass', pass);
        unlockAdmin();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

async function verifyAdmin(password) {
    try {
        const res = await fetch(`${SERVER_URL}/admin/login`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        return data.success;
    } catch(e) { return false; }
}

function unlockAdmin() {
    document.getElementById('loginOverlay').style.opacity = '0';
    setTimeout(() => document.getElementById('loginOverlay').style.display = 'none', 500);
    document.getElementById('dashboardWrapper').classList.add('active');
    loadAdminOrders();
}

async function loadAdminOrders() {
    const pass = localStorage.getItem('admin_pass');
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`, { headers: { 'admin-auth': pass } });
        const orders = await res.json();
        const container = document.getElementById('orders-list');
        
        container.innerHTML = '';
        let totalRev = 0;
        
        // حساب الاحصائيات
        document.getElementById('stat-total').innerText = orders.length;

        orders.reverse().forEach(o => {
            const isPending = o.status === 'pending';
            // تقدير السعر بشكل بسيط (يمكن تحسينه لو حفظنا السعر مع الطلب)
            totalRev += 50; // افتراض متوسط سعر
            
            const badge = isPending ? 'badge-pending' : 'badge-approved';
            const statusTxt = isPending ? 'قيد الانتظار' : 'مكتمل';
            const btn = isPending ? `<button class="btn" style="padding:5px 15px; font-size:0.8rem; width:auto;" onclick="approve(${o.orderId})">تفعيل</button>` : '';
            
            const img = o.receiptImage ? `<a href="${SERVER_URL}${o.receiptImage}" target="_blank" style="color:var(--primary); font-size:0.8rem;">[صورة التحويل]</a>` : '';

            container.innerHTML += `
                <div class="admin-order-card">
                    <div>
                        <div style="font-weight:bold; color:#fff;">${o.productName} <span class="badge ${badge}">${statusTxt}</span></div>
                        <div style="font-size:0.85rem; color:#888; margin-top:5px;">
                            ${o.userPhone} | #${o.orderId} ${img}
                        </div>
                    </div>
                    <div>${btn}</div>
                </div>`;
        });
        
        // تحديث اجمالي الارباح (مجرد رقم افتراضي للعرض)
        document.getElementById('stat-revenue').innerText = (orders.length * 150) + " ج.م"; 

    } catch(e) { console.log(e); }
}

async function addProduct(e) {
    e.preventDefault();
    const pass = localStorage.getItem('admin_pass');
    const formData = new FormData(e.target);
    await fetch(`${SERVER_URL}/admin/add-product`, { 
        method: 'POST', 
        headers: { 'admin-auth': pass }, // لا نضع Content-Type مع FormData
        body: formData 
    });
    alert("تم النشر!");
    e.target.reset();
}

async function approve(id) {
    const pass = localStorage.getItem('admin_pass');
    await fetch(`${SERVER_URL}/admin/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'admin-auth': pass },
        body: JSON.stringify({ orderId: id })
    });
    loadAdminOrders();
}

function showSection(id) {
    document.querySelectorAll('.content-area > div').forEach(d => d.style.display = 'none');
    document.getElementById('section-'+id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function toggleProductFields() {
    const type = document.getElementById('p-type').value;
    document.getElementById('fields-full').style.display = type === 'netflix-full' ? 'block' : 'none';
    document.getElementById('fields-user').style.display = type === 'netflix-user' ? 'block' : 'none';
}
