// الإعدادات الخاصة بـ Supabase
const SUPABASE_URL = 'https://ghmlajdhfoxzzjzzxgwr.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobWxhamRoZm94enpqenp4Z3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDMyNDcsImV4cCI6MjA5MzMxOTI0N30.d9hxKpu7axbXsrqSO-d2abk9RQ5LUBBfV8s2CwZlgG4';

document.addEventListener('DOMContentLoaded', () => {
    const transactionForm = document.getElementById('transaction-form');
    const categoryForm = document.getElementById('category-form');
    const typeSelect = document.getElementById('transaction_type');
    const categorySelect = document.getElementById('category_id');
    const journalBody = document.getElementById('journal-body');
    const statusContainer = document.getElementById('status-container');
    const companyNameDisplay = document.getElementById('company_name_display');

    // كروت الإحصائيات
    const revEl = document.getElementById('total-revenue');
    const expEl = document.getElementById('total-expenses');
    const profitEl = document.getElementById('net-profit');

    let allCategories = [];

    // جلب بيانات الجلسة
    const getSessionData = () => {
        const projectId = 'ghmlajdhfoxzzjzzxgwr';
        const sessionData = localStorage.getItem(`sb-${projectId}-auth-token`);
        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            return {
                company_id: parsed.user?.user_metadata?.company_id || 'DEMO_COMPANY_001',
                company_name: parsed.user?.user_metadata?.company_name || 'الإدارة المالية'
            };
        }
        return { company_id: 'DEMO_COMPANY_001', company_name: 'الإدارة المالية' };
    };

    const session = getSessionData();
    companyNameDisplay.textContent = session.company_name;

    const showStatus = (message, type) => {
        statusContainer.textContent = message;
        statusContainer.className = `status-msg ${type}`;
        setTimeout(() => statusContainer.style.display = 'none', 5000);
    };

    // 1. جلب التصنيفات والحركات
    const loadFinanceData = async () => {
        try {
            // أ. جلب التصنيفات
            const catResponse = await fetch(`${SUPABASE_URL}accounting_categories?company_id=eq.${session.company_id}`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            });
            allCategories = await catResponse.json();
            updateCategoryDropdown();

            // ب. جلب حركات الشهر الحالي
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            const transResponse = await fetch(`${SUPABASE_URL}financial_transactions?company_id=eq.${session.company_id}&transaction_date=like.${currentMonth}*&select=*,accounting_categories(category_name)&order=transaction_date.desc`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            });
            const transactions = await transResponse.json();
            
            renderDashboard(transactions);

        } catch (e) { console.error('Finance Data Load Error:', e); }
    };

    const updateCategoryDropdown = () => {
        const selectedType = typeSelect.value;
        const filtered = allCategories.filter(c => c.category_type === selectedType);
        
        categorySelect.innerHTML = '<option value="">اختر التصنيف...</option>';
        filtered.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.category_name;
            categorySelect.appendChild(opt);
        });
    };

    const renderDashboard = (transactions) => {
        let totalRev = 0;
        let totalExp = 0;
        journalBody.innerHTML = '';

        if (transactions.length === 0) {
            journalBody.innerHTML = '<tr><td colspan="5" style="text-align:center">لا توجد حركات مالية مسجلة</td></tr>';
        }

        transactions.forEach(t => {
            const amount = parseFloat(t.amount);
            if (t.transaction_type === 'income') totalRev += amount;
            else totalExp += amount;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.transaction_date}</td>
                <td class="type-${t.transaction_type}">${t.transaction_type === 'income' ? 'إيراد' : 'مصروف'}</td>
                <td>${t.accounting_categories?.category_name || 'عام'}</td>
                <td>${t.description}</td>
                <td style="font-weight:700">${amount.toLocaleString('ar-SA')}</td>
            `;
            journalBody.appendChild(row);
        });

        revEl.textContent = totalRev.toLocaleString('ar-SA', { minimumFractionDigits: 2 });
        expEl.textContent = totalExp.toLocaleString('ar-SA', { minimumFractionDigits: 2 });
        profitEl.textContent = (totalRev - totalExp).toLocaleString('ar-SA', { minimumFractionDigits: 2 });
    };

    // 2. معالجة النماذج
    typeSelect.addEventListener('change', updateCategoryDropdown);

    // إضافة تصنيف جديد
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            company_id: session.company_id,
            category_name: document.getElementById('new_category_name').value,
            category_type: document.getElementById('new_category_type').value
        };

        try {
            const res = await fetch(`${SUPABASE_URL}accounting_categories`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showStatus('تمت إضافة التصنيف بنجاح ✅', 'success');
                categoryForm.reset();
                loadFinanceData();
            }
        } catch (e) { showStatus('فشل إضافة التصنيف', 'error'); }
    });

    // إضافة حركة مالية
    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            company_id: session.company_id,
            transaction_date: document.getElementById('transaction_date').value,
            transaction_type: typeSelect.value,
            category_id: categorySelect.value,
            amount: parseFloat(document.getElementById('amount').value),
            description: document.getElementById('description').value
        };

        try {
            const res = await fetch(`${SUPABASE_URL}financial_transactions`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showStatus('تم حفظ الحركة المالية بنجاح ✅', 'success');
                transactionForm.reset();
                loadFinanceData();
            }
        } catch (e) { showStatus('فشل حفظ الحركة', 'error'); }
    });

    // تعيين تاريخ اليوم افتراضياً
    document.getElementById('transaction_date').value = new Date().toISOString().split('T')[0];

    loadFinanceData();
});
