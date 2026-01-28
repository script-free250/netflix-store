document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Basic check, real validation is on server
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.isAdmin) {
        alert('Access Denied');
        window.location.href = '/';
        return;
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.dataset.section) {
                switchSection(item.dataset.section);
                navItems.forEach(i => i.classList.remove('active'));
                e.currentTarget.classList.add('active');
            }
        });
    });

    // Load initial section
    switchSection('dashboard');
});

function switchSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.getElementById(`${sectionId}-section`).style.display = 'block';

    // Load content for the section
    switch(sectionId) {
        case 'dashboard':
            loadDashboard();
            break;
        // Add cases for other sections like orders, products etc.
    }
}

async function loadDashboard() {
    const container = document.getElementById('dashboard-section');
    container.innerHTML = '<h1>Dashboard Loading...</h1>';
    
    try {
        const res = await fetch('/api/v2/admin/stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to load stats');
        
        const stats = await res.json();
        container.innerHTML = `
            <div class="section-title"><h3>📊 الإحصائيات</h3></div>
            <div class="stats-grid">
                <div class="stat-card pending"><div class="icon"><i class="fas fa-hourglass-half"></i></div><div><div class="value">${stats.pendingOrders}</div><div class="label">طلبات قيد الانتظار</div></div></div>
                <div class="stat-card revenue"><div class="icon"><i class="fas fa-dollar-sign"></i></div><div><div class="value">${stats.totalRevenue.toFixed(2)}</div><div class="label">إجمالي الأرباح</div></div></div>
                <div class="stat-card total-orders"><div class="icon"><i class="fas fa-boxes"></i></div><div><div class="value">${stats.totalOrders}</div><div class="label">إجمالي الطلبات</div></div></div>
                <div class="stat-card total-users"><div class="icon"><i class="fas fa-users"></i></div><div><div class="value">${stats.totalUsers}</div><div class="label">إجمالي المستخدمين</div></div></div>
            </div>
            <!-- More dashboard components can be added here -->
        `;
    } catch(err) {
        container.innerHTML = `<h1>Error: ${err.message}</h1>`;
    }
}

// Add other admin functions like loadOrders, loadProducts, etc.
