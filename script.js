// ✅ تأكد من تحديث الرابط عند تشغيل السيرفر
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

/* =================================================================
   🛒 دوال المستخدم (المتجر - الشراء)
   ================================================================= */

function saveLocalOrder(order) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    if (!orders.find(o => o.id === order.id)) {
        orders.push(order);
        localStorage.setItem('my_orders', JSON.stringify(orders));
    }
}
function getLocalOrders() { return JSON.parse(localStorage.getItem('my_orders') || '[]'); }

async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return; 

    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: {'Bypass-Tunnel-Reminder': 'true'} });
        const products = await res.json();
        container.innerHTML = products.length ? '' : '<p style="text-align:center; width:100%;">لا توجد منتجات حالياً.</p>';

        products.forEach(p => {
            const isUser = p.type === 'netflix-user';
            // تحديث تصميم الكارت ليتناسب مع index.html الجديد
            container.innerHTML += `
                <div class="card">
                    <div class="card-content">
                        <span class="tag">${isUser ? '👤 مشترك' : '💎 كامل'}</span>
                        <h3>${p.name}</h3>
                        <span class="price">${p.price} ج.م</span>
                        <button class="btn" onclick="openBuyModal(${p.id}, '${p.name}')">شراء الآن</button>
                    </div>
                </div>`;
        });
        
        loadMyOrdersWidget();

    } catch (e) { 
        container.innerHTML = `<p style="text-align:center; color:red; width:100%;">خطأ في الاتصال بالسيرفر.<br>تأكد من تشغيل النفق.</p>`;
    }
}

// نافذة الشراء
function openBuyModal(id, name) {
    document.getElementById('buyModal').style.display = 'block';
    document.getElementById('modal-product-name').innerText = name;
    document.getElementById('modal-product-id').value = id;
}
function closeModal() { document.getElementById('buyModal').style.display = 'none'; }
window.onclick = function(event) { if (event.target == document.getElementById('buyModal')) closeModal(); }

// إرسال الطلب
async function submitOrder(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';

    const formData = new FormData(e.target);

    try {
        const res = await fetch(`${SERVER_URL}/buy`, { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success) {
            const prodName = document.getElementById('modal-product-name').innerText;
            saveLocalOrder({ id: data.orderId, name: prodName, date: new Date() });
            
            closeModal();
            e.target.reset();
            document.getElementById('file-label-text').innerText = "اضغط لإرفاق صورة التحويل";
            document.querySelector('.file-upload-wrapper').style.borderColor = "#333";
            document.getElementById('file-label-text').style.color = "#666";
            
            alert("✅ تم إرسال طلبك بنجاح!");
            loadMyOrdersWidget();
        } else {
            alert("حدث خطأ أثناء الطلب.");
        }
    } catch (error) { alert("فشل الاتصال بالسيرفر"); }
    
    btn.disabled = false; btn.innerHTML = 'تأكيد ودفع <i class="fas fa-check-circle"></i>';
}

function loadMyOrdersWidget() {
    const section = document.getElementById('my-orders-list');
    if (!section) return;
    const localOrders = getLocalOrders().reverse();
    if (!localOrders.length) { section.innerHTML = '<p style="color:#555; text-align:center;">لا توجد طلبات سابقة.</p>'; return; }
    
    section.innerHTML = '';
    localOrders.forEach(async (o) => {
        let status = "مراجعة", colorClass = "pending";
        try {
            const r = await fetch(`${SERVER_URL}/order-status/${o.id}`);
            const d = await r.json();
            if(d.status === 'approved') { status="جاهز"; colorClass="success"; }
            if(d.status === 'completed') { status="مكتمل"; colorClass="completed"; }
        } catch(e){}
        
        section.innerHTML += `
            <div class="order-mini-card" onclick="window.location.href='track.html?id=${o.id}'">
                <div><strong>${o.name}</strong><br><span style="font-size:0.75rem; color:#777">#${o.id}</span></div>
                <span style="color:${colorClass=='success'?'#46d369':'#f5a623'}">${status}</span>
            </div>`;
    });
}

/* =================================================================
   🔐 أدوات الأدمن والدخول
   ================================================================= */

// تسجيل دخول الأدمن
async function adminLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "تحقق...";

    try {
        const res = await fetch(`${SERVER_URL}/admin/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        
        if (data.success) {
            localStorage.setItem('admin_token', data.token); // حفظ التوكن
            window.location.href = 'admin.html';
        } else {
            alert("بيانات خاطئة!");
        }
    } catch (e) { alert("خطأ في الاتصال"); }
    btn.disabled = false; btn.innerText = "دخول";
}

// التحقق من الحماية في صفحة الأدمن
function checkAdminAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = 'login.html'; // طرد المستخدم
    }
}

// إضافة منتج (للأدمن)
async function addProduct(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "جاري النشر...";
    const formData = new FormData(e.target);

    try {
        const res = await fetch(`${SERVER_URL}/admin/add-product`, { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success) { alert("✅ تم النشر!"); e.target.reset(); } 
        else alert("فشل.");
    } catch (e) { alert("خطأ."); }
    btn.disabled = false; btn.innerText = "نشر المنتج";
}

async function loadAdminOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        let orders = await res.json();
        orders.reverse();
        container.innerHTML = '';
        
        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#555;">لا توجد طلبات حتى الآن.</p>';
            return;
        }

        orders.forEach(o => {
            const receiptUrl = o.receiptImage ? `${SERVER_URL}${o.receiptImage}` : '';
            const receiptHtml = receiptUrl ? 
                `<a href="${receiptUrl}" target="_blank"><img src="${receiptUrl}" class="receipt-thumb" title="عرض الإيصال"></a>` 
                : '<div style="width:70px; height:70px; background:#222; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#555; font-size:0.7rem;">بلا صورة</div>';

            const isPending = o.status === 'pending';
            const cardClass = isPending ? 'order-status-pending' : 'order-status-approved';
            const statusIcon = isPending ? '<i class="fas fa-clock"></i>' : '<i class="fas fa-check-circle"></i>';
            const statusText = isPending ? 'بانتظار المراجعة' : 'تم التفعيل';
            const statusColor = isPending ? '#f5a623' : '#46d369';

            const actionBtn = isPending ? 
                `<button class="btn" style="width:auto; padding:8px 20px; font-size:0.9rem; background:#46d369; color:#000; box-shadow:0 0 10px rgba(70,211,105,0.3);" onclick="approve(${o.orderId})">
                    <i class="fas fa-check"></i> تفعيل
                 </button>` 
                : `<span style="color:#46d369; font-weight:bold; border:1px solid #46d369; padding:5px 15px; border-radius:20px;">مفعل</span>`;

            container.innerHTML += `
                <div class="order-card ${cardClass}">
                    <div style="display:flex; gap:20px; align-items:center; flex:1;">
                        ${receiptHtml}
                        <div class="order-info">
                            <h4>${o.productName}</h4>
                            <div class="order-meta">
                                <span class="meta-item"><i class="fas fa-hashtag"></i> ${o.orderId}</span>
                                <span class="meta-item"><i class="fas fa-phone"></i> ${o.userPhone}</span>
                                <span class="meta-item" style="color:${statusColor}">${statusIcon} ${statusText}</span>
                            </div>
                        </div>
                    </div>
                    <div style="margin-right:20px;">${actionBtn}</div>
                </div>`;
        });
    } catch(e) { container.innerHTML = '<p style="text-align:center; color:red;">خطأ في تحميل البيانات.</p>'; }
}

async function approve(id) {
    if(!confirm("هل تأكدت من صحة الإيصال واستلام المبلغ؟")) return;
    try {
        await fetch(`${SERVER_URL}/admin/approve`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderId: id }) });
        loadAdminOrders();
    } catch (e) { alert("Error"); }
}

/* =================================================================
   📡 صفحة التتبع (track.html)
   ================================================================= */
let trackInterval;

async function initTrackPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    const dispId = document.getElementById('disp-id');
    if(dispId) dispId.innerText = id;

    const checkStatus = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${id}`);
            const data = await res.json();

            if (data.status === 'approved' || data.status === 'completed') {
                document.getElementById('pending-view').style.display = 'none';
                document.getElementById('approved-view').style.display = 'block';
                
                const container = document.getElementById('account-display');
                
                if (data.requiresCode) {
                    const imgSrc = data.profileImage ? `${SERVER_URL}${data.profileImage}` : 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png';
                    container.innerHTML = `
                        <img src="${imgSrc}" class="profile-img">
                        <div class="profile-detail"><span>اسم البروفايل:</span> <strong>${data.profileName || 'Unknown'}</strong></div>
                        <div class="profile-detail"><span>PIN الدخول:</span> <strong class="pin-box">${data.profilePin || '----'}</strong></div>
                        <hr style="width:100%; border-color:#333; margin:15px 0;">
                        <div class="profile-detail" style="font-size:0.9rem;"><span>الإيميل:</span> ${data.accountEmail}</div>
                    `;
                    document.getElementById('code-section').style.display = 'block';
                    if (data.savedCode) showFinalCode(data.savedCode);
                } else {
                    container.innerHTML = `
                        <div class="profile-detail"><span>الإيميل:</span> ${data.accountEmail}</div>
                        <div class="profile-detail"><span>كلمة المرور:</span> ${data.accountPassword}</div>
                        <p style="color:#46d369; margin-top:10px;">الحساب بالكامل لك! 🎉</p>
                    `;
                }
                clearInterval(trackInterval);
            }
        } catch(e) {}
    };

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
    btn.disabled = true; btn.innerText = 'جاري الاتصال...';

    try {
        const res = await fetch(`${SERVER_URL}/get-code-secure`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderId: id })
        });
        const data = await res.json();
        if (data.success) showFinalCode(data.code);
        else { alert(data.message); btn.disabled = false; btn.innerText = "محاولة مجدداً"; }
    } catch (e) { btn.disabled = false; btn.innerText = "خطأ"; }
}
