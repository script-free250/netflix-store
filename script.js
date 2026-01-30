/* =================================================================
   PROJECT: HHJK SHOP V2 - FRONTEND LOGIC (FULL)
   ================================================================= */

// 🔴 هام: يجب تحديث هذا الرابط ليطابق ما يظهر في شاشة السيرفر الأسود
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt";

let productsData = []; 
let currentUser = null;
/* =================================================================
   🛠️ UTILITIES & NOTIFICATIONS
   ================================================================= */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return alert(message);
    
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerHTML = `<span>${message}</span>`;
    container.appendChild(notif);
    
    setTimeout(() => notif.remove(), 4000);
}

async function checkServerConnection() {
    try {
        const res = await fetch(`${SERVER_URL}/products`);
        if (res.ok) console.log("✅ متصل بالسيرفر");
    } catch (e) {
        showNotification("⚠️ السيرفر غير متصل! تأكد من تشغيل index.js", "error");
    }
}
/* =================================================================
   🚀 MAIN INITIALIZATION
   ================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    checkServerConnection();
    checkLogin(); // تأكد من استدعاء هذه الدالة

    // تعريف المتغير page الذي كان مفقوداً
    const page = window.location.pathname.split('/').pop() || 'index.html';

    // إعادة بناء هيكل if/else بشكل صحيح
    if (page === 'index.html') {
        loadProducts();
    } else if (page === 'admin.html') {
        loadAdminOrders();
    } else if (page === 'track.html') {
        initTrackPage();
    } else if (page === 'my-orders.html') {
        // تأكد أن دالة loadMyOrders موجودة في الكود (لم تكن موجودة في المقتطف الذي أرسلته لكن استدعاؤها هنا صحيح)
        if(typeof loadMyOrders === 'function') loadMyOrders(); 
    }
});


function checkLogin() {
    const token = localStorage.getItem('token');
    if (token) {
        // تحديث الواجهة للمستخدم المسجل
        const userArea = document.getElementById('user-area');
        if(userArea) userArea.innerHTML = `<p>مرحباً، ${localStorage.getItem('userName')}</p> <button onclick="logout()">خروج</button>`;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    window.location.reload();
}
/* =================================================================
   📦 PRODUCT FUNCTIONS
   ================================================================= */
async function loadProducts() {
    try {
        const res = await fetch(`${SERVER_URL}/products`);
        const products = await res.json();
        productsData = products;

        const container = document.getElementById('products-container');
        if (!container) return;

        container.innerHTML = products.map(p => `
            <div class="product-card">
                <img src="${SERVER_URL}${p.image}" alt="${p.name}" onerror="this.src='placeholder.png'">
                <h3>${p.name}</h3>
                <p class="price">${p.price} $</p>
                <p class="desc">${p.description || ''}</p>
                <button class="btn-buy" onclick="openBuyModal(${p.id})">شراء الآن</button>
            </div>
        `).join('');
    } catch (e) {
        console.error("Error loading products:", e);
    }
}

function openBuyModal(productId) {
    if (!localStorage.getItem('token')) {
        return showNotification("يجب عليك تسجيل الدخول أولاً للشراء", "error");
    }
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    // افترضنا وجود Modal في الـ HTML، أو يمكننا استخدام prompt بسيط
    const confirmBuy = confirm(`هل أنت متأكد من شراء ${product.name} بسعر ${product.price}$ ؟`);
    if (confirmBuy) {
        // هنا يمكن طلب صورة الإيصال إذا كان مطلوباً
        // للمثال البسيط سنرسل الطلب مباشرة
        buyProduct(productId);
    }
}

async function buyProduct(productId) {
    const formData = new FormData();
    formData.append('productId', productId);

    // التحقق من وجود عنصر الملف أولاً لتجنب الأخطاء إذا لم يكن موجوداً في الصفحة
    const fileInput = document.getElementById('receipt-file');
    if(fileInput && fileInput.files[0]) { // تم إزالة الشرطات المائلة \
        formData.append('receipt', fileInput.files[0]);
    }

    try {
        const res = await fetch(`${SERVER_URL}/buy`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            showNotification(`تم الطلب بنجاح! رقم طلبك: ${data.orderId}`, "success");
            setTimeout(() => {
                window.location.href = `track.html?id=${data.orderId}`;
            }, 2000);
        } else {
            showNotification(data.message || "حدث خطأ أثناء الطلب", "error");
        }
    } catch (e) {
        showNotification("خطأ في الاتصال بالسيرفر", "error");
    }
}

/* =================================================================
   🔍 TRACKING PAGE FUNCTIONS (track.html)
   ================================================================= */
async function initTrackPage() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    const statusDiv = document.getElementById('order-status-display');
    
    if (!orderId) {
        if(statusDiv) statusDiv.innerHTML = "<h3>رقم الطلب غير موجود في الرابط</h3>";
        return;
    }

    const checkStatus = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${orderId}`);
            const data = await res.json();

            if (data.status === 'not-found') {
                if(statusDiv) statusDiv.innerHTML = "<h3>الطلب غير موجود</h3>";
                return;
            }

            // تحديث العرض بناءً على الحالة
            const pendingView = document.getElementById('pending-view');
            const approvedView = document.getElementById('approved-view');

            if (data.status === 'pending') {
                if(pendingView) pendingView.style.display = 'block';
                if(approvedView) approvedView.style.display = 'none';
            } 
            else if (data.status === 'approved' || data.status === 'completed') {
                if(pendingView) pendingView.style.display = 'none';
                if(approvedView) approvedView.style.display = 'block';

                // إذا كان المنتج يتطلب كود نتفلكس
                const codeContainer = document.getElementById('code-container');
                if (data.requiresCode && codeContainer) {
                    if (data.fetchedCode) {
                        codeContainer.innerHTML = `<div class="code-box">${data.fetchedCode}</div>`;
                    } else {
                        codeContainer.innerHTML = `<button onclick="fetchCode(${orderId})">احصل على الكود الآن</button>`;
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    // تشغيل الفحص كل 5 ثواني
    checkStatus();
    setInterval(checkStatus, 5000);
}
async function fetchCode(orderId) {
    showNotification("جاري جلب الكود من السيرفر...", "info");
    try {
        const res = await fetch(`${SERVER_URL}/get-code-secure`, {
            method: 'POST', // يجب تحديد نوع الطلب
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // ضروري جداً للأمان
            },
            body: JSON.stringify({ orderId })
        });

        const data = await res.json();
        
        if (data.success) {
            showNotification("تم جلب الكود!", "success");
            initTrackPage(); // تحديث الصفحة لعرض الكود
        } else {
            showNotification(data.message || "فشل جلب الكود", "error");
        }
    } catch (e) {
        showNotification("خطأ في الاتصال", "error");
    }
}

/* =================================================================
   👮 ADMIN FUNCTIONS (admin.html)
   ================================================================= */
async function loadAdminOrders() {
    const container = document.getElementById('admin-orders-list');
    if(!container) return;
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`, {
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}` // تم إضافة التوكن
            }
        });
        
        if (!res.ok) throw new Error("Unauthorized"); // تحقق إضافي

        const orders = await res.json();
        
        container.innerHTML = orders.map(o => `
            <div class="order-item ${o.status}">
                <p><strong>طلب #${o.orderId}</strong> - ${o.productName}</p>
                <p>المستخدم: ${o.userName || o.userId}</p>
                <p>الحالة: ${o.status}</p>
                ${o.status === 'pending' ? `<button onclick="approveOrder(${o.orderId})">قبول الطلب</button>` : ''}
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = "<p>فشل تحميل الطلبات (تأكد أنك أدمن)</p>";
    }
}

async function approveOrder(orderId) {
    if(!confirm("هل أنت متأكد من قبول هذا الطلب؟")) return;
    
    try {
        const res = await fetch(`${SERVER_URL}/admin/approve`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // تم إضافة التوكن
            },
            body: JSON.stringify({ orderId })
        });
        const data = await res.json();
        if(data.success) {
            showNotification("تم قبول الطلب", "success");
            loadAdminOrders(); 
        } else {
            showNotification(data.message || "فشل قبول الطلب", "error");
        }
    } catch (e) {
        showNotification("خطأ في الاتصال", "error");
    }
}

