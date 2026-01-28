const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

// حفظ الطلب محلياً
function saveLocalOrder(order) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    if (!orders.find(o => o.id === order.id)) {
        orders.push(order);
        localStorage.setItem('my_orders', JSON.stringify(orders));
    }
}
function getLocalOrders() { return JSON.parse(localStorage.getItem('my_orders') || '[]'); }

// تحميل المنتجات مع أنيميشن
async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return; 

    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: {'Bypass-Tunnel-Reminder': 'true'} });
        const products = await res.json();
        container.innerHTML = products.length ? '' : '<p style="text-align:center; width:100%;">لا توجد منتجات حالياً.</p>';

        products.forEach((p, index) => {
            const isUser = p.type === 'netflix-user';
            const card = document.createElement('div');
            card.className = 'card reveal';
            card.style.animationDelay = `${index * 0.1}s`;
            card.innerHTML = `
                <span class="tag">${isUser ? '👤 مشترك' : '💎 حساب كامل'}</span>
                <h3>${p.name}</h3>
                <span class="price">${p.price} ج.م</span>
                <button class="btn" onclick="openBuyModal(${p.id}, '${p.name}')">
                    <i class="fas fa-shopping-bag"></i> شراء الآن
                </button>
            `;
            container.appendChild(card);
        });
        
        loadMyOrdersWidget();
    } catch (e) { 
        container.innerHTML = `<p style="text-align:center; color:red;">فشل الاتصال بالسيرفر.</p>`;
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
    btn.disabled = true; btn.innerText = "جاري الإرسال...";

    const formData = new FormData(e.target);
    try {
        const res = await fetch(`${SERVER_URL}/buy`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            saveLocalOrder({ id: data.orderId, name: document.getElementById('modal-product-name').innerText });
            closeModal();
            alert("✅ تم استلام طلبك! تابع حالته من الأسفل.");
            loadMyOrdersWidget();
        }
    } catch (error) { alert("حدث خطأ!"); }
    btn.disabled = false; btn.innerText = "تأكيد ودفع";
}

// تحميل طلبات المستخدم
async function loadMyOrdersWidget() {
    const section = document.getElementById('my-orders-list');
    if (!section) return;
    const localOrders = getLocalOrders().reverse();
    section.innerHTML = localOrders.length ? '' : '<p style="color:#444; text-align:center;">لا توجد طلبات سابقة.</p>';
    
    for (let o of localOrders) {
        let statusText = "مراجعة", color = "#f5a623";
        try {
            const r = await fetch(`${SERVER_URL}/order-status/${o.id}`);
            const d = await r.json();
            if(d.status === 'approved') { statusText="جاهز ✅"; color="#46d369"; }
        } catch(e){}
        
        section.innerHTML += `
            <div class="order-mini-card reveal" onclick="window.location.href='track.html?id=${o.id}'">
                <div><strong>${o.name}</strong><br><small style="color:#666">#${o.id}</small></div>
                <span style="color:${color}; font-weight:bold;">${statusText}</span>
            </div>`;
    }
}

// دوال الأدمن
async function loadAdminOrders() {
    const container = document.getElementById('admin-orders-container');
    const res = await fetch(`${SERVER_URL}/admin/orders`);
    const orders = await res.json();
    container.innerHTML = '';
    orders.reverse().forEach(o => {
        container.innerHTML += `
            <div class="order-card reveal" style="background:#111; border:1px solid #222; padding:20px; margin-bottom:10px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <img src="${SERVER_URL}${o.receiptImg}" style="width:50px; height:50px; border-radius:5px; margin-left:15px; vertical-align:middle;">
                    <span>طلب #${o.orderId} - هاتف: ${o.userPhone}</span>
                </div>
                <div>
                    ${o.status === 'pending' ? `<button onclick="approveOrder(${o.orderId})" class="btn" style="width:auto; margin:0; padding:5px 15px; background:var(--success)">قبول</button>` : '<span style="color:var(--success)">تم القبول</span>'}
                </div>
            </div>`;
    });
}

async function approveOrder(id) {
    await fetch(`${SERVER_URL}/admin/approve`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ orderId: id })
    });
    loadAdminOrders();
}

async function addProduct(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    await fetch(`${SERVER_URL}/admin/add-product`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    alert("تمت إضافة المنتج!");
    e.target.reset();
}
