const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

/* ==========================================
   التحكم في سجل الطلبات وتلوين الحالات
   ========================================== */

function saveLocalOrder(order) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    if (!orders.find(o => o.id === order.id)) {
        orders.push(order);
        localStorage.setItem('my_orders', JSON.stringify(orders));
    }
}

async function displayLocalOrders() {
    const container = document.getElementById('my-orders-list');
    if (!container) return;
    
    let localOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    if (localOrders.length === 0) {
        container.innerHTML = '<p style="color:#666; font-size:0.9rem;">لا توجد طلبات سابقة.</p>';
        return;
    }

    container.innerHTML = '';
    
    // جلب الحالات المحدثة من السيرفر لكل طلب محلي
    for (let o of localOrders.reverse()) {
        let statusClass = 'status-pending';
        let statusAr = 'قيد المراجعة';
        
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${o.id}`);
            const data = await res.json();
            if(data.status === 'approved') { statusClass = 'status-approved'; statusAr = 'مفعل'; }
            if(data.status === 'completed') { statusClass = 'status-completed'; statusAr = 'مكتمل'; }
        } catch(e) {}

        container.innerHTML += `
            <div class="order-mini-card ${statusClass}" onclick="window.location.href='track.html?id=${o.id}'">
                <div>
                    <div style="font-weight:bold; font-size:1rem;">${o.name}</div>
                    <div style="font-size:0.8rem; color:#888;">#${o.id}</div>
                </div>
                <div style="text-align:left;">
                    <div style="font-weight:bold; font-size:0.8rem;">${statusAr}</div>
                    <i class="fas fa-chevron-left" style="font-size:0.7rem; color:#444;"></i>
                </div>
            </div>
        `;
    }
}

// تعديل دالة الشراء لمنع التوجيه
async function submitOrder(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

    const formData = new FormData(event.target);
    const productName = document.getElementById('modal-product-name').innerText;

    try {
        const res = await fetch(`${SERVER_URL}/purchase`, {
            method: 'POST',
            body: formData,
            headers: { 'Bypass-Tunnel-Reminder': 'true' }
        });
        const data = await res.json();

        if (data.success) {
            saveLocalOrder({ id: data.orderId, name: productName });
            alert("✅ تم إرسال طلبك بنجاح! يمكنك متابعة حالة الطلب من سجل 'طلباتي الأخيرة' بالأسفل.");
            closeModal();
            displayLocalOrders(); // تحديث السجل فوراً
        } else {
            alert("خطأ: " + data.message);
        }
    } catch (e) {
        alert("تعذر الاتصال بالسيرفر.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد ودفع';
    }
}

/* ==========================================
   دوال الأدمن (تحسين العرض)
   ========================================== */

async function loadAdminOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    container.innerHTML = '<div class="loader"></div>';

    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        const orders = await res.json();
        container.innerHTML = orders.length ? '' : '<p>لا توجد طلبات حالياً.</p>';

        orders.reverse().forEach(o => {
            const receiptHtml = o.receiptPath ? 
                `<img src="${SERVER_URL}${o.receiptPath}" class="receipt-preview" onclick="showReceipt('${SERVER_URL}${o.receiptPath}')">` : 
                '<span style="color:red; font-size:0.7rem;">بدون إيصال</span>';

            const actionBtn = o.status === 'pending' ? 
                `<button class="btn" style="background:#46d369; color:#000;" onclick="approve(${o.orderId})">تفعيل</button>` : 
                `<span style="color:#888;">${o.status === 'approved' ? 'مفعل' : 'مكتمل'}</span>`;

            container.innerHTML += `
                <div class="admin-card">
                    <div style="display:flex; gap:15px; align-items:center;">
                        ${receiptHtml}
                        <div>
                            <div style="color:var(--primary); font-weight:800;">${o.productName}</div>
                            <div style="font-size:0.8rem; color:#888;">رقم الطلب: #${o.orderId}</div>
                            <div style="font-size:0.9rem; color:#fff; font-family:monospace;">📞 ${o.userPhone}</div>
                        </div>
                    </div>
                    <div>${actionBtn}</div>
                </div>`;
        });
    } catch(e) { container.innerHTML = 'خطأ في التحميل.'; }
}

function showReceipt(url) {
    document.getElementById('fullReceipt').src = url;
    document.getElementById('receiptModal').style.display = 'block';
}

// دوال مساعدة أخرى
function openBuyModal(id, name) {
    document.getElementById('modal-product-id').value = id;
    document.getElementById('modal-product-name').innerText = name;
    document.getElementById('buyModal').style.display = 'block';
}

function closeModal() { document.getElementById('buyModal').style.display = 'none'; }

async function loadProducts() {
    displayLocalOrders(); // تحميل السجل عند فتح الصفحة
    const container = document.getElementById('products-container');
    if (!container) return;
    try {
        const res = await fetch(`${SERVER_URL}/products`);
        const products = await res.json();
        container.innerHTML = '';
        products.forEach(p => {
            container.innerHTML += `
                <div class="card">
                    <span class="tag">${p.type === 'netflix-user' ? '👤 بروفايل' : '💎 حساب كامل'}</span>
                    <h3 style="margin:10px 0;">${p.name}</h3>
                    <div class="price">${p.price} ج.م</div>
                    <button class="btn" style="width:100%; margin-top:15px;" onclick="openBuyModal(${p.id}, '${p.name}')">اشترك الآن</button>
                </div>`;
        });
    } catch(e) {}
}

// بقية الدوال (approve, getCode, handleProductSubmit) تظل كما هي في منطقها الأصلي
