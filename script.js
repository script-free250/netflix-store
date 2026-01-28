// ✅ الرابط الثابت الذي قمنا بتفعيله
const SERVER_URL = "https://hhjk-store-v1.loca.lt/";

// --- دوال الصفحة الرئيسية (للمستخدم) ---

async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return; // نحن في صفحة الأدمن

    container.innerHTML = '<p style="color:#888;">جاري تحميل المنتجات...</p>';

    try {
        const res = await fetch(`${SERVER_URL}/products`, {
            headers: { 'Bypass-Tunnel-Reminder': 'true' } // لتخطي صفحة النفق إن أمكن
        });
        const products = await res.json();
        container.innerHTML = '';
        
        if(products.length === 0) {
            container.innerHTML = '<p>لا توجد منتجات حالياً.</p>';
            return;
        }

        products.forEach(p => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <div class="card-header">
                    <h3>${p.name}</h3>
                    <span class="price-tag">${p.price} جنيه</span>
                </div>
                <p style="color:#ccc; font-size:0.9em;">
                    ${p.type === 'netflix-user' ? '👤 حساب يوزر (يتطلب كود)' : '🔥 حساب كامل / مميز'}
                </p>
                <button class="btn" onclick="buyProduct(${p.id})">شراء الآن 🛒</button>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        container.innerHTML = `<p style="color:red">فشل الاتصال بالسيرفر. تأكد أنك فتحت الرابط الأزرق مرة واحدة.<br>Error: ${err.message}</p>`;
    }
}

async function buyProduct(id) {
    const phone = prompt("📞 أدخل رقم فودافون كاش الذي ستحول منه:");
    if (!phone) return;
    
    document.getElementById('wait-modal').style.display = 'flex';
    
    try {
        const res = await fetch(`${SERVER_URL}/buy`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ productId: id, userPhone: phone })
        });
        
        const data = await res.json();
        if (data.success) {
            startPolling(data.orderId);
        } else {
            alert("حدث خطأ في الطلب");
            document.getElementById('wait-modal').style.display = 'none';
        }
    } catch (e) {
        alert("خطأ في الاتصال");
        document.getElementById('wait-modal').style.display = 'none';
    }
}

function startPolling(orderId) {
    const statusDiv = document.getElementById('status-msg');
    const resultDiv = document.getElementById('result-area');
    const loadingSpinner = document.querySelector('.loader');

    const interval = setInterval(async () => {
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${orderId}`);
            const data = await res.json();
            
            if (data.status === 'approved') {
                clearInterval(interval);
                loadingSpinner.style.display = 'none';
                statusDiv.innerHTML = "✅ تمت الموافقة بنجاح!";
                statusDiv.style.color = "#46d369";
                
                resultDiv.style.display = 'block';
                document.getElementById('acc-email').innerText = data.accountEmail;
                document.getElementById('acc-pass').innerText = data.accountPassword;
                
                if (data.requiresCode) {
                    document.getElementById('code-section').style.display = 'block';
                }
            }
        } catch (e) { console.error("Polling error", e); }
    }, 4000); // فحص كل 4 ثواني
}

async function getCode() {
    const btn = document.getElementById('code-btn');
    const display = document.getElementById('code-display');
    
    btn.disabled = true;
    btn.innerText = "جاري الاتصال بنفلكس...";
    display.innerText = "";
    
    try {
        const res = await fetch(`${SERVER_URL}/get-code`);
        const data = await res.json();
        if (data.success) {
            display.innerText = data.code;
            display.className = "code-success";
            btn.innerText = "تم الجلب ✅";
        } else {
            display.innerText = "لم يصل الكود بعد، حاول مرة أخرى خلال دقيقة.";
            display.style.color = "orange";
            btn.disabled = false;
            btn.innerText = "طلب الكود مرة أخرى";
        }
    } catch (e) {
        display.innerText = "خطأ في الاتصال";
        btn.disabled = false;
        btn.innerText = "حاول مرة أخرى";
    }
}

// --- دوال الأدمن ---

async function addProduct() {
    const type = document.getElementById('p-type').value;
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const email = document.getElementById('p-email').value;
    const pass = document.getElementById('p-pass').value;

    if(!name || !price || !email) { alert("أكمل البيانات!"); return; }

    await fetch(`${SERVER_URL}/admin/add-product`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ type, name, price, accountEmail: email, accountPassword: pass })
    });
    alert("تمت الإضافة بنجاح!");
    location.reload();
}

async function loadOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    const res = await fetch(`${SERVER_URL}/admin/orders`);
    const orders = await res.json();
    container.innerHTML = '';
    
    if(orders.length === 0) container.innerHTML = '<p>لا توجد طلبات معلقة.</p>';

    orders.forEach(o => {
        const div = document.createElement('div');
        div.className = 'order-item';
        div.innerHTML = `
            <div class="order-info">
                <strong>📦 ${o.productName}</strong><br>
                <span>📱 فودافون: <span style="color:#e50914; font-weight:bold;">${o.userPhone}</span></span>
            </div>
            <button class="btn-approve" onclick="approve(${o.orderId})">موافقة ✅</button>
        `;
        container.appendChild(div);
    });
}

async function approve(orderId) {
    if(!confirm("هل تأكدت من وصول المبلغ؟")) return;
    
    await fetch(`${SERVER_URL}/admin/approve`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ orderId })
    });
    loadOrders(); // تحديث القائمة
}

// التشغيل التلقائي عند فتح الصفحة
window.onload = function() {
    if(document.getElementById('products-container')) loadProducts();
    if(document.getElementById('orders-list')) loadOrders();
};
