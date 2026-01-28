// ✅ الرابط الثابت الذي قمنا بتفعيله
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt";
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
                    <p class="desc">تسليم فوري وتلقائي. استمتع بأفضل جودة مشاهدة.</p>
                    <button class="btn" onclick="buyProduct(${p.id})">شراء الآن</button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        container.innerHTML = `<p style="text-align:center; color:red;">خطأ في الاتصال بالسيرفر.<br>تأكد من فتح رابط النفق أولاً.</p>`;
    }
}

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
            // 🔥 التوجيه للصفحة الجديدة مع رقم الطلب 🔥
            window.location.href = `track.html?id=${data.orderId}`;
        } else {
            alert("حدث خطأ أثناء إنشاء الطلب.");
        }
    } catch (e) {
        alert("فشل الاتصال بالسيرفر.");
    }
}

/* --- صفحة المتابعة: تتبع الطلب وجلب الكود --- */
let trackingInterval;

async function trackOrder(orderId) {
    // إخفاء البحث وإظهار الانتظار
    document.getElementById('search-view').style.display = 'none';
    document.getElementById('pending-view').style.display = 'block';
    document.getElementById('disp-order-id').innerText = orderId;

    // دالة الفحص
    const checkStatus = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${orderId}`);
            const data = await res.json();

            if (data.status === 'approved') {
                clearInterval(trackingInterval); // إيقاف الفحص
                
                // الانتقال لواجهة الموافقة
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

    // فحص كل 3 ثواني
    checkStatus();
    trackingInterval = setInterval(checkStatus, 3000);
}

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
            btn.innerText = "لم يصل الكود بعد، حاول مجدداً";
            alert("لم تصل رسالة الكود بعد. تأكد أنك ضغطت زر الإرسال في نتفلكس.");
        }
    } catch (e) {
        btn.disabled = false;
        btn.innerText = "خطأ في الاتصال";
    }
}

/* --- صفحة الأدمن (مختصرة للضرورة) --- */
// (أكواد الأدمن كما هي في النسخ السابقة، فقط تأكد من ربطها بـ admin.html)
