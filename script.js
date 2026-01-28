// ✅ الرابط الثابت (تأكد أنه صحيح)
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

/* --- (أكواد المستخدم السابقة loadProducts و buyProduct و trackOrder ... اتركها كما هي) --- */

/* ... (ضع أكواد المستخدم هنا) ... */


/* =========================================
   🔧 قسم الأدمن (Admin Functions) - أضف هذا الجزء
   ========================================= */

// 1. دالة إضافة منتج
async function addProduct() {
    const type = document.getElementById('p-type').value;
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const email = document.getElementById('p-email').value;
    const pass = document.getElementById('p-pass').value;

    // التحقق من البيانات
    if (!name || !price) {
        alert("يرجى كتابة اسم المنتج والسعر على الأقل!");
        return;
    }

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
            alert("✅ تم نشر المنتج في المتجر بنجاح!");
            // تفريغ الحقول
            document.getElementById('p-name').value = '';
            document.getElementById('p-price').value = '';
            document.getElementById('p-email').value = '';
            document.getElementById('p-pass').value = '';
        } else {
            alert("❌ فشل في الإضافة.");
        }
    } catch (e) {
        alert("خطأ في الاتصال بالسيرفر: " + e.message);
    }
    btn.disabled = false;
    btn.innerText = "نشر المنتج الآن";
}

// 2. دالة تحميل الطلبات
async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return; // لسنا في صفحة الأدمن

    container.innerHTML = '<p style="color:#aaa;">جاري التحديث...</p>';

    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        const orders = await res.json();
        container.innerHTML = '';

        if(orders.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">لا توجد طلبات جديدة حالياً 💤</div>';
            return;
        }

        orders.forEach(o => {
            const div = document.createElement('div');
            div.className = 'order-card';
            div.innerHTML = `
                <div>
                    <strong style="color:var(--primary); font-size:1.1rem;">${o.productName}</strong>
                    <div style="font-size:0.9rem; color:#ccc; margin-top:5px;">
                        <i class="fas fa-phone"></i> رقم العميل: <span style="color:white; font-weight:bold;">${o.userPhone}</span>
                    </div>
                    <div style="font-size:0.8rem; color:#555; margin-top:5px;">ID: ${o.orderId}</div>
                </div>
                <button class="btn" style="width:auto; padding:8px 20px; background:var(--success);" onclick="approveOrder(${o.orderId})">
                    <i class="fas fa-check"></i> تأكيد الاستلام
                </button>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = '<p style="color:red">فشل الاتصال بالسيرفر. تأكد أنه يعمل.</p>';
    }
}

// 3. دالة الموافقة على الطلب
async function approveOrder(orderId) {
    if(!confirm("هل تأكدت من وصول المبلغ على فودافون كاش؟\nسيتم إرسال الحساب للعميل فوراً.")) return;

    try {
        const res = await fetch(`${SERVER_URL}/admin/approve`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderId })
        });
        
        const data = await res.json();
        if(data.success) {
            // تحديث القائمة لإخفاء الطلب المكتمل
            loadOrders();
        } else {
            alert("حدث خطأ أثناء الموافقة.");
        }
    } catch (e) {
        alert("خطأ في الاتصال.");
    }
}
