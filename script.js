// ✅ الرابط الثابت (تأكد أنه نفس الرابط في السيرفر)
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

/* =================================================================
   🛒 1. دوال المستخدم (المتجر - الشراء - عرض الطلبات)
   ================================================================= */

// حفظ الطلب في المتصفح
function saveLocalOrder(order) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    if (!orders.find(o => o.id === order.id)) {
        orders.push(order);
        localStorage.setItem('my_orders', JSON.stringify(orders));
    }
}
function getLocalOrders() { return JSON.parse(localStorage.getItem('my_orders') || '[]'); }

// تحميل المنتجات
async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: {'Bypass-Tunnel-Reminder': 'true'} });
        const products = await res.json();
        container.innerHTML = products.length ? '' : '<p style="text-align:center; width:100%;">لا توجد منتجات حالياً.</p>';

        products.forEach(p => {
            container.innerHTML += `
                <div class="card">
                    <span class="badge">${p.type === 'netflix-user' ? 'مشترك' : 'كامل'}</span>
                    <div class="card-content">
                        <h3>${p.name}</h3>
                        <span class="price">${p.price} ج.م</span>
                        <p class="desc">تسليم فوري وتلقائي</p>
                        <button class="btn" onclick="openPaymentModal(${p.id}, '${p.name}')">شراء الآن</button>
                    </div>
                </div>`;
        });
        
        // تشغيل ودجت الطلبات
        loadMyOrdersWidget();

    } catch (e) { 
        container.innerHTML = `<p style="text-align:center; color:red;">يرجى التأكد من تشغيل السيرفر.</p>`; 
    }
}

// 🔥 إصلاح مشكلة عدم ظهور حالة الطلب في القائمة الرئيسية 🔥
function loadMyOrdersWidget() {
    const section = document.getElementById('my-orders-list');
    if (!section) return;

    const localOrders = getLocalOrders().reverse();
    if (!localOrders.length) { 
        section.innerHTML = '<p style="color:#555; text-align:center;">لا توجد طلبات سابقة.</p>'; 
        return; 
    }
    
    section.innerHTML = ''; // تنظيف

    localOrders.forEach(o => {
        // إنشاء العنصر HTML أولاً (Placeholder)
        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-mini-card';
        itemDiv.onclick = () => window.location.href = `track.html?id=${o.id}`;
        itemDiv.innerHTML = `
            <div>
                <strong>${o.name}</strong><br>
                <span style="font-size:0.75rem; color:#777">#${o.id}</span>
            </div>
            <span id="status-badge-${o.id}" class="status-badge bg-pending">جاري التحميل...</span>
        `;
        section.appendChild(itemDiv);

        // ثم جلب الحالة وتحديثها
        fetch(`${SERVER_URL}/order-status/${o.id}`)
            .then(res => res.json())
            .then(d => {
                const badge = document.getElementById(`status-badge-${o.id}`);
                if (badge) {
                    if(d.status === 'approved') { 
                        badge.innerText = "جاهز (اضغط للدخول)"; 
                        badge.className = "status-badge bg-success"; 
                    } else if(d.status === 'completed') { 
                        badge.innerText = "تم الاستلام ✅"; 
                        badge.className = "status-badge bg-blue"; 
                    } else {
                        badge.innerText = "قيد المراجعة ⏳";
                        badge.className = "status-badge bg-pending";
                    }
                }
            })
            .catch(() => {});
    });
}

// --- نافذة الدفع ---
let selectedProductId = null;
let selectedProductName = null;

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
        if(file.size > 5 * 1024 * 1024) { alert("الصورة كبيرة جداً"); return; }
        const reader = new FileReader();
        reader.onloadend = function() { preview.src = reader.result; preview.style.display = 'block'; }
        reader.readAsDataURL(file);
    }
}

async function confirmPurchase() {
    const phone = document.getElementById('pay-phone').value;
    const fileInput = document.getElementById('pay-screenshot');
    const btn = document.getElementById('btn-confirm-pay');

    if (!phone || !fileInput.files[0]) return alert("يرجى إدخال الرقم والصورة");

    btn.innerText = "جاري الرفع..."; btn.disabled = true;

    const reader = new FileReader();
    reader.readAsDataURL(fileInput.files[0]);
    reader.onload = async function () {
        try {
            const res = await fetch(`${SERVER_URL}/buy`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    productId: selectedProductId, 
                    userPhone: phone, 
                    screenshot: reader.result 
                })
            });
            const data = await res.json();
            
            if (data.success) {
                saveLocalOrder({ id: data.orderId, name: selectedProductName });
                window.location.href = `track.html?id=${data.orderId}`;
            } else { alert("خطأ في السيرفر"); }
        } catch (e) { alert("فشل الاتصال"); }
        btn.innerText = "تأكيد"; btn.disabled = false;
    };
}


/* =================================================================
   📡 2. صفحة التتبع (Track.html) - التحديث المباشر
   ================================================================= */
let trackInterval;

async function initTrackPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    
    // عرض الرقم
    const dispId = document.getElementById('disp-id');
    if(dispId) dispId.innerText = id;

    const checkStatus = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${id}`);
            const data = await res.json();

            // 🔥 اللحظة الحاسمة: إذا تمت الموافقة، اقلب الصفحة فوراً 🔥
            if (data.status === 'approved' || data.status === 'completed') {
                
                // إخفاء الانتظار
                document.getElementById('pending-view').style.display = 'none';
                // إظهار الموافقة
                document.getElementById('approved-view').style.display = 'block';
                
                // تعبئة البيانات
                document.getElementById('acc-email').innerText = data.accountEmail || "---";
                document.getElementById('acc-pass').innerText = data.accountPassword || "---";

                // التعامل مع الكود
                if (data.requiresCode) {
                    document.getElementById('code-section').style.display = 'block';
                    if (data.savedCode) {
                        showFinalCode(data.savedCode);
                    }
                }

                if (data.status === 'completed' && !data.requiresCode) {
                    document.getElementById('status-title').innerText = "تم التسليم ✅";
                }

                // إيقاف التحديث المتكرر (عشان ميحملش على السيرفر)
                // إلا لو لسه محتاجين كود، ممكن نسيبه شغال لو في تحديثات تانية
                if (data.status === 'completed' || (data.status === 'approved' && !data.requiresCode)) {
                    clearInterval(trackInterval);
                }
            }
        } catch(e) { console.error("Tracking error:", e); }
    };

    // تشغيل الفحص فوراً ثم كل 3 ثواني
    checkStatus();
    trackInterval = setInterval(checkStatus, 3000);
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
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderId: id })
        });
        const data = await res.json();

        if (data.success) {
            showFinalCode(data.code);
        } else {
            alert(data.message || "لم يصل الكود بعد. تأكد من إرساله من نتفلكس.");
            btn.innerText = "محاولة مجدداً"; btn.disabled = false;
        }
    } catch (e) { 
        alert("خطأ في الاتصال"); btn.disabled = false; 
    }
}


/* =================================================================
   🔧 3. دوال الأدمن (Admin Dashboard)
   ================================================================= */

async function addProduct() {
    const d = {
        type: document.getElementById('p-type').value,
        name: document.getElementById('p-name').value,
        price: document.getElementById('p-price').value,
        accountEmail: document.getElementById('p-email').value,
        accountPassword: document.getElementById('p-pass').value
    };
    if(!d.name || !d.price) return alert("أكمل البيانات");
    
    await fetch(`${SERVER_URL}/admin/add-product`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(d)
    });
    alert("تم النشر");
}

async function loadAdminOrders() {
    const list = document.getElementById('admin-list'); // في صفحة الأدمن فقط
    if(!list) return; // لو مش في الأدمن، اخرج

    list.innerHTML = '<p style="text-align:center; color:#777">جاري التحديث...</p>';
    
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        let orders = await res.json();
        orders.reverse();
        
        list.innerHTML = orders.length ? '' : '<p style="text-align:center">لا توجد طلبات</p>';
        
        orders.forEach(o => {
            let st = o.status === 'pending' ? '<span class="status-badge bg-pending">انتظار</span>' : '<span class="status-badge bg-success">تم</span>';
            let btn = o.status === 'pending' ? `<button class="btn" style="width:auto; padding:5px 15px; font-size:0.8rem;" onclick="approve(${o.orderId})">تفعيل</button>` : '';
            let img = o.hasScreenshot ? '📷' : '';

            list.innerHTML += `
                <div style="background:#1a1a1a; padding:15px; margin-bottom:10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="color:#fff; font-weight:bold;">${o.productName} ${img}</div>
                        <div style="font-size:0.8rem; color:#aaa; cursor:pointer;" onclick="prompt('نسخ المعرف', '${o.orderId}')">#${o.orderId}</div>
                        <div style="font-size:0.9rem; margin-top:5px;">📱 ${o.userPhone}</div>
                    </div>
                    <div style="text-align:left;">${st}<br>${btn}</div>
                </div>`;
        });
    } catch(e) { list.innerHTML = '<p style="color:red; text-align:center">فشل الاتصال</p>'; }
}

async function approve(id) {
    if(!confirm("تأكيد التفعيل؟")) return;
    await fetch(`${SERVER_URL}/admin/approve`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderId: id })
    });
    loadAdminOrders();
}

async function searchOrderDetails() {
    const id = document.getElementById('detail-search-input').value.trim();
    if(!id) return alert("الرقم؟");
    
    try {
        const res = await fetch(`${SERVER_URL}/admin/order-details/${id}`);
        const o = await res.json();
        if(o.error) return alert("غير موجود");
        
        document.getElementById('d-id').innerText = o.orderId;
        document.getElementById('d-status').innerText = o.status;
        document.getElementById('d-name').innerText = o.productName;
        document.getElementById('d-phone').innerText = o.userPhone;
        document.getElementById('d-ip').innerText = o.userIp;
        document.getElementById('d-time-create').innerText = new Date(o.createdAt).toLocaleString();
        document.getElementById('d-time-approve').innerText = o.approvedAt ? new Date(o.approvedAt).toLocaleString() : '--';
        document.getElementById('d-time-code').innerText = o.codeFetchedAt ? new Date(o.codeFetchedAt).toLocaleString() : '--';
        document.getElementById('d-code').innerText = o.fetchedCode || '----';
        
        const imgContainer = document.getElementById('d-img');
        imgContainer.innerHTML = o.screenshot ? `<button class="btn" style="width:auto; background:#00bcd4;" onclick="window.open().document.write('<img src=\\'${o.screenshot}\\' style=\\'width:100%\\'>')">مشاهدة الإيصال</button>` : 'لا يوجد';
        
        document.getElementById('order-details-result').style.display = 'block';
    } catch(e) { alert("خطأ"); }
}

// 🔥 الموجه الذكي (Router) لتشغيل الكود المناسب للصفحة 🔥
document.addEventListener("DOMContentLoaded", () => {
    // لو إحنا في صفحة الأدمن (فيها قائمة الطلبات)
    if(document.getElementById('admin-list')) {
        loadAdminOrders();
    }
    // لو إحنا في صفحة التتبع (فيها عنصر Pending)
    else if(document.getElementById('pending-view')) {
        initTrackPage();
    }
    // لو إحنا في الصفحة الرئيسية (فيها المنتجات)
    else if(document.getElementById('products-container')) {
        loadProducts();
    }
});
