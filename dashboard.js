document.addEventListener('DOMContentLoaded', () => {
    const projectId = 'ghmlajdhfoxzzjzzxgwr';
    const sessionKey = `sb-${projectId}-auth-token`;
    const companyNameEl = document.getElementById('display-company-name');
    const logoutBtn = document.getElementById('logout-btn');

    // 1. حماية الصفحة (Auth Guard)
    const sessionData = localStorage.getItem(sessionKey);
    if (!sessionData) {
        // إذا لم توجد جلسة، العودة لصفحة تسجيل الدخول
        window.location.href = 'index.html';
        return;
    }

    // 2. عرض بيانات الشركة
    try {
        const parsed = JSON.parse(sessionData);
        const companyName = parsed.user?.user_metadata?.company_name || 'لوحة التحكم';
        companyNameEl.textContent = companyName;
    } catch (e) {
        console.error('Error parsing session:', e);
        companyNameEl.textContent = 'نظام ERP';
    }

    // 3. تسجيل الخروج
    logoutBtn.addEventListener('click', () => {
        if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
            localStorage.removeItem(sessionKey);
            window.location.href = 'index.html';
        }
    });
});

// 4. تغيير صنف الرابط النشط في الـ Sidebar
function setActive(element) {
    // إزالة الصنف النشط من جميع الروابط
    const links = document.querySelectorAll('.sidebar-menu a');
    links.forEach(link => link.classList.remove('active'));
    
    // إضافة الصنف النشط للرابط المختار
    element.classList.add('active');
}
