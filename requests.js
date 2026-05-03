const SUPABASE_URL = 'https://ghmlajdhfoxzzjzzxgwr.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobWxhamRoZm94enpqenp4Z3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDMyNDcsImV4cCI6MjA5MzMxOTI0N30.d9hxKpu7axbXsrqSO-d2abk9RQ5LUBBfV8s2CwZlgG4';

document.addEventListener('DOMContentLoaded', () => {
    const requestForm = document.getElementById('request-form');
    const typeSelect = document.getElementById('request_type');
    const loanField = document.getElementById('loan-field');
    const myRequestsBody = document.getElementById('my-requests-body');
    const statusContainer = document.getElementById('status-container');
    const companyNameDisplay = document.getElementById('company_name_display');

    // جلب بيانات الجلسة
    const getSession = () => {
        const projectId = 'ghmlajdhfoxzzjzzxgwr';
        const sessionData = localStorage.getItem(`sb-${projectId}-auth-token`);
        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            return {
                company_id: parsed.user?.user_metadata?.company_id || 'DEMO_COMPANY_001',
                employee_id: parsed.user?.user_metadata?.employee_id || 'DEMO_EMP_001',
                company_name: parsed.user?.user_metadata?.company_name || 'بوابة الموظف'
            };
        }
        return { company_id: 'DEMO_COMPANY_001', employee_id: 'DEMO_EMP_001', company_name: 'بوابة الموظف' };
    };

    const session = getSession();
    companyNameDisplay.textContent = session.company_name;

    const showStatus = (message, type) => {
        statusContainer.textContent = message;
        statusContainer.className = `status-msg ${type}`;
        setTimeout(() => statusContainer.style.display = 'none', 5000);
    };

    // التحكم في ظهور حقل مبلغ السلفة
    typeSelect.addEventListener('change', () => {
        loanField.style.display = typeSelect.value === 'loan' ? 'block' : 'none';
        document.getElementById('amount').required = typeSelect.value === 'loan';
    });

    // جلب طلباتي
    const loadMyRequests = async () => {
        try {
            const response = await fetch(`${SUPABASE_URL}employee_requests?employee_id=eq.${session.employee_id}&order=created_at.desc`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            });
            const data = await response.json();
            myRequestsBody.innerHTML = '';
            
            if (data.length === 0) {
                myRequestsBody.innerHTML = '<tr><td colspan="4" style="text-align:center">لا يوجد طلبات سابقة</td></tr>';
                return;
            }

            data.forEach(req => {
                const typeMap = { 'leave': 'إجازة', 'loan': 'سلفة', 'permission': 'استئذان' };
                const statusMap = { 'pending': 'معلق', 'approved': 'مقبول', 'rejected': 'مرفوض' };
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(req.created_at).toLocaleDateString('ar-SA')}</td>
                    <td>${typeMap[req.request_type]}</td>
                    <td>${req.reason}</td>
                    <td><span class="status-badge status-${req.status}">${statusMap[req.status]}</span></td>
                `;
                myRequestsBody.appendChild(row);
            });
        } catch (e) { console.error(e); }
    };

    // إرسال طلب جديد
    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            company_id: session.company_id,
            employee_id: session.employee_id,
            request_type: typeSelect.value,
            start_date: document.getElementById('start_date').value,
            end_date: document.getElementById('end_date').value,
            reason: document.getElementById('reason').value,
            amount: typeSelect.value === 'loan' ? parseFloat(document.getElementById('amount').value) : null,
            status: 'pending'
        };

        try {
            const response = await fetch(`${SUPABASE_URL}employee_requests`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showStatus('تم إرسال الطلب بنجاح ✅', 'success');
                requestForm.reset();
                loanField.style.display = 'none';
                loadMyRequests();
            }
        } catch (err) { showStatus('فشل في إرسال الطلب', 'error'); }
    });

    loadMyRequests();
});
