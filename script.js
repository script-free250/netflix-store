// ✅ هام جداً: انسخ الرابط اللي بيظهر في التيرمينال وحطه هنا
const SERVER_URL = "https://hhjk-shop-final-v3.loca.lt"; 

let productsData = []; 
let currentProductId = null; // متغير لتخزين ID المنتج المختار

/* =================================================================
   ✨ 0. نظام الإشعارات
   ================================================================= */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) { alert(message); return; }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const textNode = document.createElement('span');
    textNode.textContent = message;
    notification.appendChild(textNode);
    container.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 5000);
}

/* =================================================================
   🔐 1. دوال المصادقة
   ================================================================= */
// ... (دوال التسجيل كما هي، لم تتغير المشكلة فيها)
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const btn = form.querySelector('button');
    const name = form.querySelector('#name').value;
    const email = form.querySelector('#email').value;
    const password = form.querySelector('#password').value;
    const errMsg = document.getElementById('error-message');
    const okMsg = document.getElementById('success-message');

    btn.disabled = true; 
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    if(errMsg) errMsg.innerText = "";
    
    try {
        const res = await fetch(`${SERVER_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        
        if (data.success) {
            if(okMsg) okMsg.innerText = "تم إنشاء الحساب بنجاح! جاري التوجيه...";
            setTimeout(() => window.location.href = 'login.html', 1500);
        } else {
            if(errMsg) errMsg.innerText = data.message;
            btn.disabled = false;
            btn.innerText = "إنشاء حساب";
        }
    } catch (error) {
        console.error(error);
        if(errMsg) errMsg.innerText = "خطأ في الاتصال بالسيرفر";
        btn.disabled = false;
        btn.innerText = "إنشاء حساب";
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errMsg = document.getElementById('error-message');
    const btn = event.target.querySelector('button');

    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const res = await fetch(`${SERVER_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'index.html';
        } else {
            errMsg.innerText = data.message;
            btn.disabled = false; btn.innerText = 'دخول';
        }
    } catch (e) {
        errMsg.innerText = "خطأ في الاتصال.";
        btn.disabled = false; btn.innerText = 'دخول';
    }
}

function updateUserSessionUI() {
    const userSession = document.getElementById('user-session');
    const userStr = localStorage.getItem('user');
    if (!userSession) return;

    if (userStr) {
        const user = JSON.parse(userStr);
        userSession.innerHTML = `
            <div class="user-menu">
                <span>مرحباً، ${user.name}</span>
                <button onclick="logout()" class="btn-sm" style="background:var(--primary); margin-right:10px;">خروج</button>
            </div>
        `;
    } else {
        userSession.innerHTML = `
            <a href="login.html" class="btn-auth">دخول</a>
            <a href="register.html" class="btn-auth outline">تسجيل</a>
        `;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
}

/* =================================================================
   🛒 2. عرض المنتجات والشراء (تم الإصلاح هنا)
   ================================================================= */
async function loadProducts() {
    const container = document.querySelector('.products-grid');
    if (!container) return;
    
    container.innerHTML = '<p style="color:#fff;text-align:center;">جاري تحميل المنتجات...</p>';
    
    try {
        const res = await fetch(`${SERVER_URL}/products`);
        productsData = await res.json();
        
        container.innerHTML = '';
        productsData.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            // التحقق من توفر المخزون
            const btnState = product.inStock ? 
                `<button class="btn" onclick="openBuyModal(${product.id})">شراء الآن</button>` :
                `<button class="btn" disabled style="background:#555; cursor:not-allowed;">نفذت الكمية</button>`;

            card.innerHTML = `
                <div class="card-header">
                    <h3>${product.name}</h3>
                    <div class="price">${product.price} جنيه</div>
                </div>
                <div class="card-body">
                    <p>${product.description}</p>
                    <ul class="features-list">
                        <li><i class="fas fa-check"></i> تسليم فوري</li>
                        <li><i class="fas fa-shield-alt"></i> ضمان كامل المدة</li>
                        <li><i class="fas fa-headset"></i> دعم فني</li>
                    </ul>
                    ${btnState}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color:red;text-align:center;">فشل تحميل المنتجات. تأكد من تشغيل السيرفر.</p>';
    }
}

// فتح نافذة الشراء
function openBuyModal(productId) {
    const user = localStorage.getItem('user');
    if (!user) {
        showNotification("يجب تسجيل الدخول أولاً!", "error");
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }
    
    currentProductId = productId; // تخزين الـ ID
    const modal = document.getElementById('buy-modal');
    const productNameSpan = document.getElementById('modal-product-name');
    
    // البحث عن المنتج بالاسم للعرض
    const product = productsData.find(p => p.id == productId);
    if(product) productNameSpan.innerText = product.name;
    
    modal.style.display = 'flex';
}

function closeBuyModal() {
    document.getElementById('buy-modal').style.display = 'none';
}

// دالة الشراء (تم إصلاحها بالكامل)
async function handleBuy(event) {
    event.preventDefault();
    
    if (!currentProductId) {
        showNotification("خطأ: لم يتم تحديد المنتج.", "error");
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    const fileInput = document.getElementById('receipt-file');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    // التحقق من رفع الصورة (اختياري حسب رغبتك، هنا خليته إجباري لو مفيش دفع إلكتروني)
    if (fileInput.files.length === 0) {
        showNotification("يرجى إرفاق صورة التحويل.", "warning");
        return;
    }

    // تعطيل الزر
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';

    const formData = new FormData();
    formData.append('productId', currentProductId);
    formData.append('userEmail', user.email);
    formData.append('receipt', fileInput.files[0]);

    try {
        const res = await fetch(`${SERVER_URL}/buy`, {
            method: 'POST',
            body: formData // لا تضع Headers Content-Type مع FormData
        });

        const data = await res.json();

        if (data.success) {
            showNotification("تم استلام طلبك بنجاح! انتظر الموافقة.", "success");
            closeBuyModal();
            loadMyOrdersWidget(); // تحديث قائمة الطلبات
            event.target.reset(); // تصفير الفورم
            document.getElementById('file-label-text').textContent = "اضغط لإرفاق صورة التحويل";
        } else {
            showNotification(data.message || "حدث خطأ أثناء الشراء.", "error");
        }
    } catch (e) {
        console.error(e);
        showNotification("فشل الاتصال بالسيرفر.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "تأكيد الشراء";
    }
}

/* =================================================================
   📦 3. إدارة الطلبات (المستخدم + الأدمن)
   ================================================================= */
async function loadMyOrdersWidget() {
    const container = document.getElementById('my-orders-container');
    if (!container) return;
    
    const userStr = localStorage.getItem('user');
    if (!userStr) { container.innerHTML = ''; return; }
    
    const user = JSON.parse(userStr);

    try {
        const res = await fetch(`${SERVER_URL}/my-orders?email=${user.email}`);
        const orders = await res.json();
        
        if (orders.length === 0) {
            container.innerHTML = '<p style="color:#777;">لا توجد طلبات سابقة.</p>';
            return;
        }

        container.innerHTML = '';
        orders.reverse().forEach(order => {
            const el = document.createElement('div');
            el.className = 'order-mini-card';
            el.onclick = () => window.location.href = `track.html?id=${order.orderId}`;
            
            let statusText = 'قيد المراجعة';
            let statusClass = 'pending';
            if (order.status === 'approved') { statusText = 'جاهز'; statusClass = 'approved'; }
            if (order.status === 'completed') { statusText = 'مكتمل'; statusClass = 'completed'; }

            el.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <i class="fas fa-box" style="color:var(--primary);"></i>
                    <div>
                        <div style="color:#fff; font-weight:bold;">${order.productName}</div>
                        <div style="font-size:0.8rem; color:#666;">#${order.orderId}</div>
                    </div>
                </div>
                <div class="order-status ${statusClass}">${statusText}</div>
            `;
            container.appendChild(el);
        });

    } catch (e) {
        console.error("Error fetching my orders:", e);
    }
}

// صفحة التتبع
async function initTrackPage() {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    
    try {
        const res = await fetch(`${SERVER_URL}/track-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: id })
        });
        const data = await res.json();
        
        const statusEl = document.getElementById("status-text");
        const accountDiv = document.getElementById("account-display");
        const productDescContainer = document.getElementById("product-description-container"); // عنصر الوصف
        const progressBar = document.querySelector(".progress-bar");

        if (data.status === 'pending') {
            statusEl.innerHTML = "طلبك قيد المراجعة... <i class='fas fa-clock'></i>";
            statusEl.style.color = "var(--warning)";
            progressBar.style.width = "30%";
        } else if (data.status === 'approved' || data.status === 'completed') {
            statusEl.innerHTML = "طلبك جاهز! <i class='fas fa-check-circle'></i>";
            statusEl.style.color = "var(--success)";
            progressBar.style.width = "100%";
            progressBar.style.background = "var(--success)";
            
            // 1. عرض بيانات الحساب
            let html = `
                <div style="margin-bottom:15px;">
                    <label style="color:#888;font-size:0.9rem;">الإيميل:</label>
                    <div style="color:#fff;font-size:1.1rem;letter-spacing:1px;user-select:all;">${data.accountEmail || 'N/A'}</div>
                </div>
                <div style="margin-bottom:15px;">
                    <label style="color:#888;font-size:0.9rem;">كلمة المرور:</label>
                    <div style="color:#fff;font-size:1.1rem;letter-spacing:1px;user-select:all;">${data.accountPassword || '****'}</div>
                </div>
            `;
            
            // بيانات إضافية (البروفايل)
            if (data.profileName) {
                html += `
                    <div style="border-top:1px solid #333; padding-top:10px; margin-top:10px; display:flex; align-items:center; gap:15px;">
                        ${data.profileImage ? `<img src="${SERVER_URL}${data.profileImage}" style="width:50px;height:50px;border-radius:10px;object-fit:cover;">` : ''}
                        <div>
                            <div style="color:#aaa;font-size:0.8rem;">اسم البروفايل:</div>
                            <div style="color:#fff;font-weight:bold;">${data.profileName}</div>
                        </div>
                        ${data.profilePin ? `
                        <div style="border-right:1px solid #333; padding-right:15px;">
                            <div style="color:#aaa;font-size:0.8rem;">PIN:</div>
                            <div style="color:var(--primary);font-weight:bold;font-size:1.2rem;">${data.profilePin}</div>
                        </div>` : ''}
                    </div>
                `;
            }
            accountDiv.innerHTML = html;
            accountDiv.style.display = "block";

            // 2. عرض وصف المنتج (التحديث الجديد)
            if (data.productDescription && productDescContainer) {
                productDescContainer.innerHTML = `
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-top: 20px; border: 1px dashed #444;">
                        <h4 style="color: #ddd; margin-bottom: 8px;"><i class="fas fa-info-circle"></i> تفاصيل الاشتراك:</h4>
                        <p style="color: #aaa; font-size: 0.9rem; line-height: 1.6;">${data.productDescription}</p>
                    </div>
                `;
            }

            // إظهار قسم الكود إذا لزم الأمر
            document.getElementById("code-section").style.display = "block";
        }
    } catch (e) {
        console.error(e);
    }
}

// دالة لوحة التحكم (جلب الطلبات للأدمن) - تم إصلاح الرابط
async function loadAdminOrders() {
    const list = document.getElementById('orders-list');
    if(!list) return;
    list.innerHTML = "جاري التحميل...";
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        const orders = await res.json();
        
        list.innerHTML = "";
        orders.reverse().forEach(order => {
            const div = document.createElement("div");
            div.className = "admin-card";
            
            let actionBtn = "";
            if(order.status === 'pending') {
                actionBtn = `<button class="btn-sm" onclick="approveOrder(${order.orderId})">✅ قبول الطلب</button>`;
            } else {
                actionBtn = `<span style="color:var(--success)">تم القبول</span>`;
            }

            // عرض صورة الإيصال إن وجدت
            let receiptHtml = "";
            if (order.receiptImage) {
                receiptHtml = `<a href="${SERVER_URL}${order.receiptImage}" target="_blank" style="color:var(--primary);text-decoration:underline;font-size:0.9rem;">[صورة التحويل]</a>`;
            }

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong style="color:#fff;">${order.productName}</strong>
                    <span style="font-size:0.8rem; color:#666;">${new Date(order.date).toLocaleDateString()}</span>
                </div>
                <div style="color:#aaa; font-size:0.9rem; margin-bottom:10px;">
                    العميل: ${order.userEmail} <br>
                    السعر: ${order.price} <br>
                    ${receiptHtml}
                </div>
                ${actionBtn}
            `;
            list.appendChild(div);
        });
    } catch(e) {
        list.innerHTML = "خطأ في الجلب.";
        console.error(e);
    }
}

async function approveOrder(orderId) {
    if(!confirm("هل أنت متأكد من الموافقة وتسليم الحساب؟")) return;
    try {
        const res = await fetch(`${SERVER_URL}/admin/approve`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ orderId })
        });
        const data = await res.json();
        if(data.success) {
            alert("تم قبول الطلب بنجاح!");
            loadAdminOrders();
        } else {
            alert("فشل: " + data.message);
        }
    } catch(e) {
        alert("خطأ في الاتصال");
    }
}

/* =================================================================
   🚀 5. المنظم الرئيسي: تهيئة الصفحات عند التحميل
   ================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    
    // الأوامر العامة
    updateUserSessionUI();

    if (currentPage === 'index.html' || currentPage === '') { 
        loadProducts(); 
        loadMyOrdersWidget(); 
    }
    if (currentPage === 'admin.html') { 
        // التحقق من صلاحية الأدمن
        if (!sessionStorage.getItem('isAdminAuthenticated')) {
            window.location.href = 'admin_login.html';
            return;
        }

        const firstNavItem = document.querySelector('.nav-item'); 
        if (firstNavItem) {
            // showSection('orders', firstNavItem); // إذا كانت الدالة موجودة في كودك الآخر
        }
        loadAdminOrders();
        // toggleProductFields(); // تأكد من وجود هذه الدالة في ملفك
    }
    if (currentPage === 'track.html') { 
        initTrackPage(); 
    }
});
