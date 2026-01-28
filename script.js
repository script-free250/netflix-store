const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

// --- إدارة الطلبات المحلية (LocalStorage) ---
function saveLocalOrder(order) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    orders.push(order);
    localStorage.setItem('my_orders', JSON.stringify(orders));
}

function getLocalOrders() {
    return JSON.parse(localStorage.getItem('my_orders') || '[]');
}

// --- الصفحة الرئيسية ---
async function loadProducts() {
    const container = document.getElementById('products-container');
    if (container) {
        // تحميل المنتجات
        try {
            const res = await fetch(`${SERVER_URL}/products`, { headers: {'Bypass-Tunnel-Reminder': 'true'} });
            const products = await res.json();
            container.innerHTML = products.length ? '' : '<p>لا توجد منتجات</p>';
            products.forEach(p => {
                container.innerHTML += `
                    <div class="card">
                        <span class="tag">${p.type === 'netflix-user' ? 'مشترك' : 'كامل'}</span>
                        <h3>${p.name}</h3>
                        <span class="price">${p.price} ج.م</span>
                        <button class="btn" onclick="buyProduct(${p.id}, '${p.name}')">شراء</button>
                    </div>`;
            });
        } catch (e) { container.innerHTML = '<p style="color:red">تأكد من تشغيل السيرفر والنفق</p>'; }

        // تحميل طلباتي (الجديد)
        loadMyOrdersWidget();
    }
}

function loadMyOrdersWidget() {
    const section = document.getElementById('my-orders-list');
    if (!section) return;
    
    const localOrders = getLocalOrders().reverse(); // الأحدث أولاً
    if (localOrders.length === 0) {
        section.innerHTML = '<p style="color:#555">ليس لديك طلبات سابقة.</p>';
        return;
    }

    section.innerHTML = '';
    localOrders.forEach(async (order) => {
        // جلب الحالة المحدثة من السيرفر
        let statusText = "جاري المراجعة";
        let statusClass = "pending";
        
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${order.id}`);
            const data = await res.json();
            if (data.status === 'approved') { statusText = "جاهز للاستلام"; statusClass = "approved"; }
            if (data.status === 'completed') { statusText = "تم الاستلام ✅"; statusClass = "completed"; }
        } catch(e){}

        section.innerHTML += `
            <div class="order-mini-card ${statusClass}" onclick="window.location.href='track.html?id=${order.id}'" style="cursor:pointer">
                <div>
                    <strong>${order.name}</strong><br>
                    <span style="font-size:0.8rem; color:#777">#${order.id}</span>
                </div>
                <span class="status-badge bg-${statusClass === 'approved' ? 'success' : (statusClass === 'completed' ? 'blue' : 'pending')}">${statusText}</span>
            </div>
        `;
    });
}

async function buyProduct(id, name) {
    const phone = prompt("رقم فودافون كاش:");
    if (!phone) return;
    try {
        const res = await fetch(`${SERVER_URL}/buy`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ productId: id, userPhone: phone })
        });
        const data = await res.json();
        if (data.success) {
            // حفظ الطلب في المتصفح
            saveLocalOrder({ id: data.orderId, name: name, date: new Date() });
            window.location.href = `track.html?id=${data.orderId}`;
        }
    } catch (e) { alert("خطأ"); }
}

// --- صفحة التتبع (Track) ---
let trackInterval;
async function initTrackPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    document.getElementById('disp-id').innerText = id;

    const check = async () => {
        const res = await fetch(`${SERVER_URL}/order-status/${id}`);
        const data = await res.json();

        if (data.status === 'approved' || data.status === 'completed') {
            document.getElementById('pending-view').style.display = 'none';
            document.getElementById('approved-view').style.display = 'block';
            
            // عرض البيانات
            document.getElementById('acc-email').innerText = data.accountEmail;
            document.getElementById('acc-pass').innerText = data.accountPassword;

            if (data.requiresCode) {
                const codeSec = document.getElementById('code-section');
                codeSec.style.display = 'block';
                
                // لو الكود محفوظ، اظهره علطول
                if (data.savedCode) {
                    showFinalCode(data.savedCode);
                }
            }
            if (data.status === 'completed' && !data.requiresCode) {
                 document.getElementById('status-title').innerText = "تم استلام الطلب بنجاح ✅";
            }
            clearInterval(trackInterval);
        }
    };
    check();
    trackInterval = setInterval(check, 3000);
}

function showFinalCode(code) {
    document.getElementById('code-btn').style.display = 'none';
    document.getElementById('code-result').style.display = 'block';
    document.getElementById('final-code').innerText = code;
    document.getElementById('status-title').innerText = "تم استلام الحساب بنجاح ✅";
    document.getElementById('status-icon').className = "fas fa-check-double big-icon";
    document.getElementById('status-icon').style.color = "#00bcd4";
}

async function getCode() {
    const id = new URLSearchParams(window.location.search).get('id');
    const btn = document.getElementById('code-btn');
    btn.disabled = true; btn.innerText = "جاري الاتصال...";

    try {
        const res = await fetch(`${SERVER_URL}/get-code-secure`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderId: id })
        });
        const data = await res.json();
        if (data.success) {
            showFinalCode(data.code);
        } else {
            alert(data.message || "لم يصل الكود. انتظر قليلاً وحاول.");
            btn.disabled = false; btn.innerText = "جلب الكود";
        }
    } catch (e) { btn.disabled = false; btn.innerText = "خطأ"; }
}

// --- صفحة الأدمن ---
async function addProduct() { /* ...نفس كود الأدمن السابق... */ }

async function loadAdminOrders() {
    const container = document.getElementById('orders-list');
    const searchVal = document.getElementById('admin-search').value; // قيمة البحث
    
    const res = await fetch(`${SERVER_URL}/admin/orders`);
    let orders = await res.json();
    
    // الفلترة بالبحث
    if (searchVal) {
        orders = orders.filter(o => o.orderId.toString().includes(searchVal) || o.userPhone.includes(searchVal));
    }

    // عرض الطلبات المعلقة أولاً
    orders.sort((a,b) => (a.status === 'pending' ? -1 : 1));

    container.innerHTML = '';
    orders.forEach(o => {
        let color = o.status === 'pending' ? 'orange' : 'green';
        let btnHtml = o.status === 'pending' ? `<button class="btn" style="width:auto; padding:5px 10px;" onclick="approve(${o.orderId})">تفعيل</button>` : `<span style="color:green">مفعل</span>`;
        
        container.innerHTML += `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; border-right:4px solid ${color}; margin-bottom:10px;">
                <div>
                    <div style="font-weight:bold">${o.productName}</div>
                    <div style="font-size:0.8rem; color:#888">#${o.orderId} | 📱 ${o.userPhone}</div>
                </div>
                ${btnHtml}
            </div>`;
    });
}
async function approve(id) { await fetch(`${SERVER_URL}/admin/approve`, { method:'POST', body:JSON.stringify({orderId:id}), headers:{'Content-Type':'application/json'} }); loadAdminOrders(); }
