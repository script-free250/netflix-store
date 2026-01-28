// ✅ الرابط الثابت للسيرفر
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

/* =========================================
   🛍️ قسم المستخدم (المتجر والتتبع)
   ========================================= */

// تحميل المنتجات في الصفحة الرئيسية
async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: {'Bypass-Tunnel-Reminder': 'true'} });
        const products = await res.json();
        container.innerHTML = '';

        if(products.length === 0) {
            container.innerHTML = '<p style="text-align:center;">لا توجد منتجات حالياً.</p>';
            return;
        }

        products.forEach(p => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <div class="card-body">
                    <span class="tag">${p.type === 'netflix-user' ? '👤 حساب مشترك' : '💎 حساب كامل'}</span>
                    <h3>${p.name}</h3>
                    <span class="price">${p.price} ج.م</span>
                    <p class="desc">تسليم فوري وتلقائي.</p>
                    <button class="btn" onclick="buyProduct(${p.id})">شراء الآن</button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        container.innerHTML = `<p style="text-align:center; color:red;">خطأ في الاتصال بالسيرفر.<br>تأكد من فتح رابط النفق أولاً.</p>`;
    }
}

// عملية الشراء
async function buyProduct(id) {
    const phone = prompt("📞 أدخل رقم فودافون كاش (للتواصل وتأكيد الدفع):");
    if (!phone) return;

    try {
        const res = await fetch(`${SERVER_URL}/buy`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ productId: id, userPhone: phone })
        });
        const data = await res.json();
        
        if (data.success) {
            // 🔥 التوجيه لصفحة التتبع 🔥
            window.location.href = `track.html?id=${data.orderId}`;
        } else {
            alert("حدث خطأ أثناء إنشاء الطلب.");
        }
    } catch (e) {
        alert("فشل الاتصال بالسيرفر.");
    }
}

// تتبع الطلب (في صفحة track.html)
let trackingInterval;
async function trackOrder(orderId) {
    document.getElementById('search-view').style.display = 'none';
    document.getElementById('pending-view').style.display = 'block';
    document.getElementById('disp-order-id').innerText = orderId;

    const checkStatus = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${orderId}`);
            const data = await res.json();

            if (data.status === 'approved') {
                clearInterval(trackingInterval);
                document.getElementById('pending-view').style.display = 'none';
                document.getElementById('approved-view').style.display = 'block';
                document.getElementById('acc-email').innerText = data.accountEmail;
                document.getElementById('acc-pass').innerText = data.accountPassword;

                if (data.requiresCode) {
                    document.getElementById('code-section').style.display = 'block';
                }
            } else if (data.status === 'not-found') {
                document.getElementById('pending-view').innerHTML = "<h3>❌ الطلب غير موجود</h3><a href='index.html' class='btn'>عودة</a>";
                clearInterval(trackingInterval);
            }
        } catch (e) { console.error("Tracking Error", e); }
    };
    checkStatus();
    trackingInterval = setInterval(checkStatus, 3000); // فحص كل 3 ثواني
}

// جلب الكود
async function getCode() {
    const btn = document.getElementById('code-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاتصال...';

    try {
        const res = await fetch(`${SERVER_URL}/get-code`);
        const data = await res.json();

        if (data.success) {
            btn.style.display = 'none';
            document.getElementById('code-result').style.display = 'block';
            document.getElementById('final-code').innerText = data.code;
        } else {
            btn.disabled = false;
            btn.innerText = "لم يصل الكود بعد، اضغط للمحاولة مجدداً";
            alert("لم تصل رسالة الكود بعد. تأكد من ضغط زر الإرسال في نتفلكس وانتظر 10 ثوانٍ.");
        }
    } catch (e) {
        btn.disabled = false;
        btn.innerText = "خطأ في الاتصال";
    }
}

/* =========================================
   🔧 قسم الأدمن (Admin Dashboard)
   ========================================= */

async function addProduct() {
    const type = document.getElementById('p-type').value;
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const email = document.getElementById('p-email').value;
    const pass = document.getElementById('p-pass').value;

    if (!name || !price) { alert("أكمل البيانات!"); return; }

    const btn = document.querySelector('button[onclick="addProduct()"]');
    btn.disabled = true;
    btn.innerText = "جاري النشر...";

    try {
        const res = await fetch(`${SERVER_URL}/admin/add-product`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ type, name, price, accountEmail: email, accountPassword: pass })
        });
        const data = await res.json();
        if(data.success) {
            alert("✅ تم النشر!");
            document.getElementById('p-name').value = '';
            document.getElementById('p-price').value = '';
        } else { alert("فشل."); }
    } catch (e) { alert("خطأ: " + e.message); }
    btn.disabled = false;
    btn.innerText = "نشر المنتج الآن";
}

async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    container.innerHTML = '<p style="color:#aaa;">جاري التحديث...</p>';
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        const orders = await res.json();
        container.innerHTML = '';
        if(orders.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#555;">لا توجد طلبات 💤</div>';
            return;
        }
        orders.forEach(o => {
            const div = document.createElement('div');
            div.className = 'order-card';
            div.innerHTML = `
                <div>
                    <strong style="color:var(--primary);">${o.productName}</strong>
                    <div style="font-size:0.9rem; color:#ccc;">📱 ${o.userPhone}</div>
                </div>
                <button class="btn" style="width:auto; padding:5px 15px; background:var(--success);" onclick="approveOrder(${o.orderId})">قبول</button>
            `;
            container.appendChild(div);
        });
    } catch (e) { container.innerHTML = '<p style="color:red">فشل الاتصال.</p>'; }
}

async function approveOrder(orderId) {
    if(!confirm("تأكيد تفعيل الحساب للعميل؟")) return;
    try {
        await fetch(`${SERVER_URL}/admin/approve`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderId })
        });
        loadOrders();
    } catch (e) { alert("خطأ في الاتصال."); }
}
