// !!! مهم جدًا: ضع هنا رابط السيرفر الخلفي الخاص بك !!!
const API_BASE_URL = "https://hhjk-shop-final-v2.loca.lt/"; // مثال: https://my-store-backend.onrender.com

let adminToken = localStorage.getItem('token');

// --- Main Initializer ---
document.addEventListener('DOMContentLoaded', () => {
    if (!adminToken) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const payload = JSON.parse(atob(adminToken.split('.')[1]));
        if (!payload.isAdmin) {
            alert('Access Denied');
            window.location.href = 'index.html';
            return;
        }
    } catch (e) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
    
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.dataset.section) {
                switchSection(item.dataset.section);
                document.querySelectorAll('.sidebar .nav-item').forEach(i => i.classList.remove('active'));
                e.currentTarget.classList.add('active');
            }
        });
    });

    switchSection('dashboard');
});

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function switchSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.getElementById(`${sectionId}-section`).style.display = 'block';

    switch(sectionId) {
        case 'dashboard': loadDashboard(); break;
        case 'orders': loadAdminOrders(); break;
        case 'products': loadAdminProducts(); break;
        case 'coupons': loadAdminCoupons(); break;
        case 'users': loadAdminUsers(); break;
    }
}

// --- Fetch Utility ---
async function adminFetch(endpoint, options = {}) {
    const defaultOptions = {
        headers: { 'Authorization': `Bearer ${adminToken}`, ...options.headers },
    };
    const res = await fetch(`${API_BASE_URL}/api/v2/admin${endpoint}`, { ...defaultOptions, ...options });
    if (res.status === 401 || res.status === 403) logout();
    if (!res.ok) throw new Error( (await res.json()).message || 'Request failed');
    return res.json();
}

// --- Dashboard ---
async function loadDashboard() {
    const container = document.getElementById('dashboard-section');
    container.innerHTML = '<div class="loader"></div>';
    try {
        const stats = await adminFetch('/stats');
        container.innerHTML = `
            <div class="section-title"><h3>📊 الإحصائيات</h3></div>
            <div class="stats-grid">
                <div class="stat-card pending"><div class="icon"><i class="fas fa-hourglass-half"></i></div><div><div class="value">${stats.pendingOrders}</div><div class="label">طلبات قيد الانتظار</div></div></div>
                <div class="stat-card revenue"><div class="icon"><i class="fas fa-dollar-sign"></i></div><div><div class="value">${stats.totalRevenue.toFixed(2)}</div><div class="label">إجمالي الأرباح</div></div></div>
                <div class="stat-card total-orders"><div class="icon"><i class="fas fa-boxes"></i></div><div><div class="value">${stats.totalOrders}</div><div class="label">إجمالي الطلبات</div></div></div>
                <div class="stat-card total-users"><div class="icon"><i class="fas fa-users"></i></div><div><div class="value">${stats.totalUsers}</div><div class="label">إجمالي المستخدمين</div></div></div>
            </div>`;
    } catch(err) { container.innerHTML = `<h1>Error: ${err.message}</h1>`; }
}

// --- Orders Management ---
async function loadAdminOrders() {
    const container = document.getElementById('orders-section');
    container.innerHTML = '<div class="loader"></div>';
    try {
        const orders = await adminFetch('/orders');
        container.innerHTML = `
            <div class="section-title"><h3>📦 إدارة الطلبات</h3></div>
            <div class="table-container"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr></thead><tbody id="orders-tbody"></tbody></table></div>
        `;
        const tbody = document.getElementById('orders-tbody');
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد طلبات.</td></tr>';
            return;
        }
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.id}</td>
                <td>${order.customer_email || 'N/A'}</td>
                <td>${order.total_amount.toFixed(2)} ج.م</td>
                <td><span class="order-status-tag ${order.status}">${order.status}</span></td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    ${order.status === 'pending' ? `
                        <button class="btn-sm" onclick="updateOrderStatus(${order.id}, 'approved')">✅</button>
                        <button class="btn-sm" onclick="updateOrderStatus(${order.id}, 'rejected')">❌</button>
                    ` : ''}
                    <button class="btn-sm" onclick="viewOrderDetails(${order.id})">👁️</button>
                </td>
            </tr>`).join('');
    } catch(err) { container.innerHTML = `<h1>Error: ${err.message}</h1>`; }
}

async function updateOrderStatus(orderId, newStatus) {
    let reason = '';
    if (newStatus === 'rejected') {
        reason = prompt('الرجاء إدخال سبب الرفض:');
        if (!reason) return;
    }
    try {
        await adminFetch(`/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, reason })
        });
        showToast('تم تحديث حالة الطلب بنجاح', 'success');
        loadAdminOrders();
    } catch(err) { showToast(err.message, 'error'); }
}

// --- Toast Notifications (Admin) ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animationName = 'slide-out';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
// Add functions for other admin sections (Products, Coupons, Users) in a similar way.
