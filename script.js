// ✅ تأكد أن هذا الرابط مطابق لما يظهر في كونسول السيرفر (V4)
const SERVER_URL = "https://hhjk-shop-final-v4.loca.lt"; 

/* =================================================================
   🛒 الجزء الأول: دوال المستخدم (المتجر - التتبع - الشراء)
   ================================================================= */

// --- إدارة التخزين المحلي للطلبات ---
function saveLocalOrder(order) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    // التأكد من عدم التكرار
    if (!orders.find(o => o.id === order.id)) {
        orders.push(order);
        localStorage.setItem('my_orders', JSON.stringify(orders));
    }
}
function getLocalOrders() { return JSON.parse(localStorage.getItem('my_orders') || '[]'); }


// --- تحميل المنتجات (index.html) ---
async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return; // لسنا في الصفحة الرئيسية

    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: {'Bypass-Tunnel-Reminder': 'true'} });
        const products = await res.json();
        container.innerHTML = products.length ? '' : '<p style="text-align:center; width:100%;">لا توجد منتجات حالياً.</p>';

        products.forEach(p => {
            const isUser = p.type === 'netflix-user';
            container.innerHTML += `
                <div class="card">
                    <span class="tag">${isUser ? '👤 مشترك' : '💎 كامل'}</span>
                    <h3>${p.name}</h3>
                    <span class="price">${p.price} ج.م</span>
                    <p style="color:#888; font-size:0.9rem;">تسليم فوري - ${isUser ? 'يحتاج كود' : 'بيانات كاملة'}</p>
                    <button class="btn" onclick="buyProduct(${p.id}, '${p.name}')">شراء الآن</button>
                </div>`;
        });
        
        // تحميل قسم "طلباتي"
        loadMyOrdersWidget();

    } catch (e) { 
        container.innerHTML = `<p style="text-align:center; color:red; width:100%;">خطأ في الاتصال بالسيرفر.<br>تأكد من تشغيل النفق (Tunnel).</p>`;
    }
}


// --- عرض طلباتي السابقة ---
function loadMyOrdersWidget() {
    const section = document.getElementById('my-orders-list');
    if (!section) return;

    const localOrders = getLocalOrders().reverse(); // الأحدث أولاً
    if (!localOrders.length) { section.innerHTML = '<p style="color:#555; text-align:center;">ليس لديك طلبات سابقة.</p>'; return; }
    
    section.innerHTML = '';
    localOrders.forEach(async (o) => {
        let status = "جاري المراجعة", colorClass = "pending";
        try {
            // تحديث الحالة في الخلفية
            const r = await fetch(`${SERVER_URL}/order-status/${o.id}`);
            const d = await r.json();
            if(d.status === 'approved') { status="جاهز (اضغط للدخول)"; colorClass="approved"; }
            if(d.status === 'completed') { status="تم الاستلام ✅"; colorClass="completed"; }
        } catch(e){}
        
        section.innerHTML += `
            <div class="order-mini-card ${colorClass}" onclick="window.location.href='track.html?id=${o.id}'" style="cursor:pointer;">
                <div>
                    <strong>${o.name}</strong>
                    <br><span style="font-size:0.75rem; color:#777">#${o.id}</span>
                </div>
                <span class="status-badge bg-${colorClass === 'approved' ? 'success' : (colorClass === 'completed' ? 'blue' : 'pending')}">${status}</span>
            </div>`;
    });
}


// --- عملية الشراء ---
async function buyProduct(id, name) {
    const phone = prompt("📞 أدخل رقم فودافون كاش الذي ستحول منه:");
    if (!phone) return;
    
    // تعطيل الزر مؤقتاً
    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "جاري الحجز..."; btn.disabled = true;

    try {
        const res = await fetch(`${SERVER_URL}/buy`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ productId: id, userPhone: phone })
        });
        const data = await res.json();
        
        if (data.success) {
            // حفظ الطلب محلياً
            saveLocalOrder({ id: data.orderId, name: name, date: new Date() });
            // الانتقال لصفحة التتبع
            window.location.href = `track.html?id=${data.orderId}`;
        } else {
            alert("حدث خطأ، حاول مجدداً.");
        }
    } catch (e) { alert("فشل الاتصال بالسيرفر."); }
    
    btn.innerText = oldText; btn.disabled = false;
}


/* =================================================================
   📡 الجزء الثاني: صفحة التتبع (track.html)
   ================================================================= */
let trackInterval;

async function initTrackPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return; // لا يوجد رقم طلب

    // عرض الرقم في الواجهة
    const dispId = document.getElementById('disp-id');
    if(dispId) dispId.innerText = id;

    const checkStatus = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${id}`);
            const data = await res.json();

            // إذا تمت الموافقة أو اكتمل الطلب
            if (data.status === 'approved' || data.status === 'completed') {
                document.getElementById('pending-view').style.display = 'none';
                document.getElementById('approved-view').style.display = 'block';
                
                // عرض بيانات الحساب
                document.getElementById('acc-email').innerText = data.accountEmail;
                document.getElementById('acc-pass').innerText = data.accountPassword;
                
                // لو الحساب يتطلب كود (نتفلكس يوزر)
                if (data.requiresCode) {
                    document.getElementById('code-section').style.display = 'block';
                    
                    // لو الكود محفوظ (تم جلبه سابقاً)، اعرضه فوراً واخف الزر
                    if (data.savedCode) {
                        showFinalCode(data.savedCode);
                    }
                }
                
                // لو مكتمل (سواء بكود أو بدونه)
                if (data.status === 'completed' && !data.requiresCode) {
                    document.getElementById('status-title').innerText = "تم تسليم الطلب ✅";
                }
                
                clearInterval(trackInterval); // وقف الفحص
            }
        } catch(e) {}
    };

    checkStatus();
    trackInterval = setInterval(checkStatus, 3000); // تحديث كل 3 ثواني
}

function showFinalCode(code) {
    const btn = document.getElementById('code-btn');
    if(btn) btn.style.display = 'none'; // إخفاء الزر
    
    const resultDiv = document.getElementById('code-result');
    if(resultDiv) resultDiv.style.display = 'block';
    
    const codeSpan = document.getElementById('final-code');
    if(codeSpan) codeSpan.innerText = code;
}

// دالة جلب الكود عند الضغط
async function getCode() {
    const id = new URLSearchParams(window.location.search).get('id');
    const btn = document.getElementById('code-btn');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاتصال...';

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
            alert(data.message || "لم يصل الكود. تأكد من إرساله في نتفلكس.");
            btn.disabled = false;
            btn.innerText = "محاولة مجدداً";
        }
    } catch (e) {
        btn.disabled = false;
        btn.innerText = "خطأ في الاتصال";
    }
}


/* =================================================================
   🔧 الجزء الثالث: لوحة التحكم والأدمن (admin.html)
   ================================================================= */

// إضافة منتج
async function addProduct() {
    const type = document.getElementById('p-type').value;
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const email = document.getElementById('p-email').value;
    const pass = document.getElementById('p-pass').value;

    if (!name || !price) { alert("أدخل الاسم والسعر!"); return; }

    const btn = document.querySelector('button[onclick="addProduct()"]');
    btn.disabled = true; btn.innerText = "جاري النشر...";

    try {
        const res = await fetch(`${SERVER_URL}/admin/add-product`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ type, name, price, accountEmail: email, accountPassword: pass })
        });
        const data = await res.json();
        if(data.success) {
            alert("✅ تم نشر المنتج!");
            // تفريغ الحقول
            document.getElementById('p-name').value = '';
            document.getElementById('p-price').value = '';
        } else alert("فشل.");
    } catch (e) { alert("خطأ: " + e.message); }
    
    btn.disabled = false; btn.innerText = "نشر المنتج";
}

// تحميل الطلبات في لوحة الأدمن
async function loadAdminOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return; // لسنا في صفحة الأدمن

    container.innerHTML = '<p style="color:#777; text-align:center;">جاري التحديث...</p>';

    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        let orders = await res.json();
        
        // الترتيب: الأحدث أولاً
        orders.reverse();
        
        container.innerHTML = '';
        if (orders.length === 0) { 
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">لا توجد طلبات واردة 💤</div>'; 
            return; 
        }

        orders.forEach(o => {
            const isPending = o.status === 'pending';
            const statusBadge = isPending 
                ? '<span class="status-badge badge-pending">انتظار التفعيل</span>' 
                : '<span class="status-badge badge-done">تم التفعيل</span>';
            
            const actionBtn = isPending 
                ? `<button class="btn" style="width:auto; padding:6px 15px; font-size:0.85rem; background:#46d369; color:black;" onclick="approve(${o.orderId})">✅ تفعيل</button>` 
                : '';

            // كارد الطلب
            container.innerHTML += `
                <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:15px; background:#1a1a1a; border:1px solid #333;">
                    <div>
                        <div style="font-weight:bold; color:var(--primary); font-size:1.1rem;">${o.productName}</div>
                        <div style="font-size:0.85rem; color:#888; cursor:pointer;" onclick="navigator.clipboard.writeText('${o.orderId}'); alert('تم النسخ')" title="اضغط لنسخ الرقم">#${o.orderId}</div>
                        <div style="font-size:0.9rem; margin-top:5px; color:#ddd;"><i class="fas fa-phone"></i> ${o.userPhone}</div>
                    </div>
                    <div style="text-align:left;">
                        ${statusBadge}
                        <div style="margin-top:8px;">${actionBtn}</div>
                    </div>
                </div>`;
        });
    } catch(e) { container.innerHTML = '<p style="color:red; text-align:center;">فشل الاتصال بالسيرفر.</p>'; }
}

// الموافقة على الطلب
async function approve(id) {
    if(!confirm("هل تأكدت من استلام المبلغ؟\nسيتم إرسال الحساب للعميل فوراً.")) return;
    try {
        await fetch(`${SERVER_URL}/admin/approve`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderId: id })
        });
        loadAdminOrders(); // تحديث القائمة
    } catch (e) { alert("خطأ في الاتصال."); }
}

// 🔥 البحث عن تفاصيل الطلب (Logs) 🔥
async function searchOrderDetails() {
    const id = document.getElementById('detail-search-input').value.trim();
    if (!id) return alert("الرجاء إدخال رقم الطلب (ID).");

    const resultBox = document.getElementById('order-details-result');
    resultBox.style.display = 'none'; // إخفاء مؤقت

    try {
        // نجلب كل الطلبات ونبحث فيها (لأن قاعدة البيانات صغيرة)
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        const orders = await res.json();
        
        const order = orders.find(o => o.orderId == id); // == للمقارنة المرنة (نص ورقم)

        if (!order) return alert("❌ لم يتم العثور على هذا الطلب.");

        // دالة تنسيق الوقت
        const fmt = (iso) => iso ? new Date(iso).toLocaleString('ar-EG', {month:'numeric', day:'numeric', hour:'numeric', minute:'numeric', hour12:true}) : '<span style="color:#444">--</span>';

        // ملء البيانات
        document.getElementById('d-id').innerText = order.orderId;
        document.getElementById('d-product').innerText = order.productName;
        document.getElementById('d-phone').innerText = order.userPhone;
        document.getElementById('d-ip').innerText = order.userIp || "N/A";
        
        // الحالة والنص
        let stText = "غير معروف";
        if(order.status === 'pending') stText = "⏳ قيد المراجعة";
        if(order.status === 'approved') stText = "✅ مفعل (لم يسحب الكود)";
        if(order.status === 'completed') stText = "🏁 مكتمل (تم سحب الكود)";
        document.getElementById('d-status').innerText = stText;

        // الأوقات
        document.getElementById('d-time-create').innerHTML = fmt(order.createdAt);
        document.getElementById('d-time-approve').innerHTML = fmt(order.approvedAt);
        document.getElementById('d-time-code').innerHTML = fmt(order.codeFetchedAt);

        // الكود
        const cEl = document.getElementById('d-code');
        if(order.fetchedCode) { cEl.innerText = order.fetchedCode; cEl.style.color = "#46d369"; }
        else { cEl.innerText = "----"; cEl.style.color = "#fff"; }

        // إظهار النتيجة
        resultBox.style.display = 'block';

    } catch (e) { alert("حدث خطأ أثناء البحث."); }
}


/* =================================================================
   🚀 الموجه الذكي (Router)
   ================================================================= */
document.addEventListener("DOMContentLoaded", function() {
    // تحديد الصفحة الحالية وتشغيل دالتها
    
    // 1. لوحة الأدمن
    if (document.getElementById('orders-list')) {
        loadAdminOrders();
    }
    // 2. صفحة التتبع
    else if (window.location.href.includes('track.html')) {
        initTrackPage();
    }
    // 3. الصفحة الرئيسية
    else if (document.getElementById('products-container')) {
        loadProducts();
    }
});
