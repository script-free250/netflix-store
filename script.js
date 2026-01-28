// ✅ تأكد من تحديث الرابط عند تشغيل السيرفر
const SERVER_URL = "https://hhjk-shop-final-v2.loca.lt"; 

/* =================================================================
   🛒 دوال المستخدم (المتجر - الشراء) - نسخة محسنة
   ================================================================= */

/**
 * يحفظ تفاصيل الطلب في التخزين المحلي للمتصفح.
 * @param {object} order - كائن يحتوي على تفاصيل الطلب (id, name, date).
 */
function saveLocalOrder(order) {
    let orders = JSON.parse(localStorage.getItem('my_orders') || '[]');
    // التأكد من عدم إضافة الطلب مرتين
    if (!orders.find(o => o.id === order.id)) {
        orders.push(order);
        localStorage.setItem('my_orders', JSON.stringify(orders));
    }
}

/**
 * يجلب كل الطلبات المحفوظة من التخزين المحلي.
 * @returns {Array} - مصفوفة من كائنات الطلبات.
 */
function getLocalOrders() { 
    return JSON.parse(localStorage.getItem('my_orders') || '[]'); 
}

/**
 * يقوم بتحميل المنتجات من السيرفر وعرضها في الصفحة
 * مع إضافة حركة ظهور متدرجة للبطاقات.
 */
async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return; // الخروج المبكر إذا لم يتم العثور على العنصر

    try {
        const res = await fetch(`${SERVER_URL}/products`, { headers: {'Bypass-Tunnel-Reminder': 'true'} });
        if (!res.ok) throw new Error('Network response was not ok');
        const products = await res.json();
        
        container.innerHTML = products.length ? '' : '<p style="text-align:center; width:100%;">لا توجد منتجات متاحة حالياً.</p>';

        products.forEach((p, index) => {
            const isUser = p.type === 'netflix-user';
            const card = document.createElement('div');
            card.className = 'card';
            // إضافة تأخير للحركة لإنشاء تأثير متدرج (staggered)
            card.style.animationDelay = `${index * 100}ms`;
            
            card.innerHTML = `
                <span class="tag">${isUser ? '👤 بروفايل مشترك' : '💎 حساب كامل'}</span>
                <h3>${p.name}</h3>
                <div style="flex-grow: 1;"></div>
                <span class="price">${p.price} ج.م</span>
                <button class="btn" onclick="openBuyModal(${p.id}, '${p.name}')">شراء الآن</button>
            `;
            container.appendChild(card);
        });
        
        // تحميل سجل الطلبات بعد تحميل المنتجات
        loadMyOrdersWidget();

    } catch (e) { 
        console.error("Fetch Error:", e);
        container.innerHTML = `<p style="text-align:center; color:var(--primary); width:100%;">خطأ في الاتصال بالسيرفر.<br>الرجاء المحاولة لاحقاً.</p>`;
    }
}

/**
 * يفتح نافذة الشراء المنبثقة.
 * @param {number} id - معرف المنتج.
 * @param {string} name - اسم المنتج.
 */
function openBuyModal(id, name) {
    const modal = document.getElementById('buyModal');
    modal.style.display = 'block';
    document.getElementById('modal-product-name').innerText = name;
    document.getElementById('modal-product-id').value = id;
}

/**
 * يغلق نافذة الشراء المنبثقة.
 */
function closeModal() { 
    document.getElementById('buyModal').style.display = 'none'; 
}
// إغلاق النافذة عند الضغط خارجها
window.onclick = function(event) { 
    const modal = document.getElementById('buyModal');
    if (event.target == modal) {
        closeModal();
    }
}

/**
 * يتعامل مع عملية إرسال طلب الشراء.
 * @param {Event} e - كائن الحدث الخاص بالفورم.
 */
async function submitOrder(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; 
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري الرفع...`;

    const formData = new FormData(e.target);

    try {
        const res = await fetch(`${SERVER_URL}/buy`, {
            method: 'POST',
            body: formData 
        });
        const data = await res.json();
        
        if (data.success) {
            const prodName = document.getElementById('modal-product-name').innerText;
            saveLocalOrder({ id: data.orderId, name: prodName, date: new Date() });
            
            closeModal();
            e.target.reset(); // تصفير حقول الفورم
            // إعادة تعيين حقل رفع الملفات إلى حالته الأصلية
            document.getElementById('file-label-text').innerText = "اضغط لإرفاق صورة التحويل";
            document.querySelector('.upload-content').style.color = "var(--text-muted)";

            alert("✅ تم إرسال طلبك بنجاح!\nيمكنك متابعة حالة الطلب من 'سجل طلباتك الأخيرة'.");
            
            loadMyOrdersWidget(); // تحديث قائمة الطلبات
            
        } else {
            alert("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
        }
    } catch (error) { 
        alert("فشل الاتصال بالسيرفر. يرجى التأكد من اتصالك بالإنترنت والمحاولة مرة أخرى."); 
    }
    
    btn.disabled = false; 
    btn.innerHTML = `<i class="fas fa-check-circle"></i> تأكيد الشراء`;
}

/**
 * يقوم بتحميل وعرض سجل الطلبات الأخير للمستخدم.
 */
function loadMyOrdersWidget() {
    const section = document.getElementById('my-orders-list');
    if (!section) return;
    const localOrders = getLocalOrders().reverse();
    
    if (!localOrders.length) { 
        section.innerHTML = '<p style="color:var(--text-muted); text-align:center;">لا توجد طلبات سابقة.</p>'; 
        return; 
    }
    
    section.innerHTML = '';
    localOrders.forEach(async (o, index) => {
        let status = "pending", statusText = "قيد المراجعة";
        try {
            const r = await fetch(`${SERVER_URL}/order-status/${o.id}`);
            const d = await r.json();
            if (d.status === 'approved') { status = "approved"; statusText = "جاهز للعرض"; }
            if (d.status === 'completed') { status = "completed"; statusText = "مكتمل"; }
        } catch(e) {
            // في حالة وجود خطأ، استخدم الحالة الافتراضية
        }
        
        const card = document.createElement('div');
        card.className = 'order-mini-card';
        card.style.animationDelay = `${index * 100}ms`;
        card.setAttribute('onclick', `window.location.href='track.html?id=${o.id}'`);
        
        card.innerHTML = `
            <div>
                <strong>${o.name}</strong>
                <br>
                <span style="font-size:0.8rem; color:var(--text-muted)">#${o.id}</span>
            </div>
            <span class="order-status ${status}">${statusText}</span>
        `;
        section.appendChild(card);
    });
}


/* =================================================================
   📡 دوال صفحة التتبع (track.html) - بدون تغيير
   ================================================================= */
let trackInterval;

async function initTrackPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    const dispId = document.getElementById('disp-id');
    if(dispId) dispId.innerText = '#' + id;

    const checkStatus = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/order-status/${id}`);
            const data = await res.json();

            if (data.status === 'approved' || data.status === 'completed') {
                if (document.getElementById('pending-view')) document.getElementById('pending-view').style.display = 'none';
                if (document.getElementById('approved-view')) document.getElementById('approved-view').style.display = 'block';
                
                const container = document.getElementById('account-display');
                if (container) {
                    if (data.requiresCode) { // يوزر
                        const imgSrc = data.profileImage ? `${SERVER_URL}${data.profileImage}` : 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png';
                        // الكود أدناه يعتمد على التصميم المحدث لصفحة track.html
                        container.innerHTML = `
                           <img src="${imgSrc}" class="profile-avatar">
                           <div class="info-row">
                               <span class="info-label">الإيميل</span>
                               <span class="info-value">${data.accountEmail} <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.accountEmail}')"><i class="fas fa-copy"></i></button></span>
                           </div>
                           <div class="info-row">
                               <span class="info-label">اسم البروفايل</span>
                               <span class="info-value">${data.profileName}</span>
                           </div>
                           <div style="margin-top:15px;">
                               <span style="display:block; color:#666; font-size:0.8rem;">PIN البروفايل</span>
                               <span class="pin-display">${data.profilePin}</span>
                           </div>
                        `;
                        if(document.getElementById('code-section')) document.getElementById('code-section').style.display = 'block';
                        if (data.savedCode) showFinalCode(data.savedCode);

                   } else { // كامل
                       container.innerHTML = `
                           <div class="info-row">
                               <span class="info-label">الإيميل</span>
                               <span class="info-value">${data.accountEmail} <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.accountEmail}')"><i class="fas fa-copy"></i></button></span>
                           </div>
                           <div class="info-row">
                               <span class="info-label">كلمة المرور</span>
                               <span class="info-value">${data.accountPassword} <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.accountPassword}')"><i class="fas fa-copy"></i></button></span>
                           </div>
                       `;
                   }
                }
                if (trackInterval) clearInterval(trackInterval);
            }
        } catch(e) {
            console.error("Status check failed:", e);
        }
    };
    
    if (typeof trackInterval !== 'undefined') clearInterval(trackInterval);
    checkStatus();
    trackInterval = setInterval(checkStatus, 3000);
}

function showFinalCode(code) {
    if(document.getElementById('code-btn')) document.getElementById('code-btn').style.display = 'none';
    if(document.getElementById('code-result')) document.getElementById('code-result').style.display = 'block';
    if(document.getElementById('final-code')) document.getElementById('final-code').innerText = code;
}

async function getCode() {
    const id = new URLSearchParams(window.location.search).get('id');
    const btn = document.getElementById('code-btn');
    if (!btn) return;
    
    btn.disabled = true; 
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري جلب الكود...';

    try {
        const res = await fetch(`${SERVER_URL}/get-code-secure`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ orderId: id })
        });
        const data = await res.json();
        if (data.success) {
            showFinalCode(data.code);
        } else { 
            alert(data.message || "فشل جلب الكود."); 
            btn.disabled = false; 
            btn.innerHTML = '<i class="fas fa-key"></i> محاولة مجدداً';
        }
    } catch (e) { 
        alert("خطأ في الاتصال.");
        btn.disabled = false; 
        btn.innerHTML = '<i class="fas fa-key"></i> محاولة مجدداً';
    }
}

/* =================================================================
   🔧 دوال لوحة الأدمن (admin.html) - بدون تغيير
   ================================================================= */

async function addProduct(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "جاري النشر...";
    const formData = new FormData(e.target);

    try {
        const res = await fetch(`${SERVER_URL}/admin/add-product`, { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success) { 
            alert("✅ تم نشر المنتج بنجاح!"); 
            e.target.reset(); 
            // إعادة ضبط الحقول الإضافية
             if(document.getElementById('p-type')) document.getElementById('p-type').dispatchEvent(new Event('change'));
        } else {
            alert("فشل نشر المنتج.");
        }
    } catch (e) { 
        alert("حدث خطأ في الاتصال."); 
    }
    btn.disabled = false; btn.innerText = "🚀 نشر المنتج الآن";
}

async function loadAdminOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;
    container.innerHTML = '<div class="loader" style="margin: 40px auto;"></div>';
    
    try {
        const res = await fetch(`${SERVER_URL}/admin/orders`);
        let orders = await res.json();
        orders.reverse();
        container.innerHTML = '';
        
        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#555; padding: 40px;">لا توجد طلبات حتى الآن.</p>';
            return;
        }

        orders.forEach(o => {
            const receiptUrl = o.receiptImage ? `${SERVER_URL}${o.receiptImage}` : '';
            const receiptHtml = receiptUrl ? 
                `<a href="${receiptUrl}" target="_blank"><img src="${receiptUrl}" class="receipt-thumb" title="عرض الإيصال"></a>` 
                : `<div class="receipt-thumb" style="background:#222; display:flex; align-items:center; justify-content:center; color:#555; font-size:0.7rem; text-align:center;">بلا صورة</div>`;

            const isPending = o.status === 'pending';
            const cardClass = isPending ? 'order-status-pending' : 'order-status-approved';
            const statusIcon = isPending ? '<i class="fas fa-clock"></i>' : '<i class="fas fa-check-circle"></i>';
            const statusText = isPending ? 'بانتظار المراجعة' : 'تم التفعيل';
            const statusColor = isPending ? 'var(--warning)' : 'var(--success)';

            const actionBtn = isPending ? 
                `<button class="btn" style="width:auto; padding:8px 20px; font-size:0.9rem; background:var(--success); color:#000;" onclick="approve(${o.orderId})">
                    <i class="fas fa-check"></i> تفعيل
                 </button>` 
                : `<span style="color:var(--success); font-weight:bold; border:1px solid; padding:5px 15px; border-radius:20px;">مُفعّل</span>`;

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
    } catch(e) { 
        container.innerHTML = '<p style="text-align:center; color:red; padding: 40px;">خطأ في تحميل البيانات.</p>'; 
    }
}

async function approve(id) {
    if(!confirm("هل تأكدت من صحة الإيصال واستلام المبلغ؟\nسيتم تفعيل الطلب للمستخدم.")) return;
    try {
        const res = await fetch(`${SERVER_URL}/admin/approve`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ orderId: id }) 
        });
        const data = await res.json();
        if (data.success) {
             loadAdminOrders(); // تحديث القائمة لإظهار التغيير
        } else {
            alert("فشل تفعيل الطلب.");
        }
    } catch (e) { 
        alert("خطأ في الاتصال."); 
    }
}
