const SUPABASE_URL = 'https://ghmlajdhfoxzzjzzxgwr.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobWxhamRoZm94enpqenp4Z3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDMyNDcsImV4cCI6MjA5MzMxOTI0N30.d9hxKpu7axbXsrqSO-d2abk9RQ5LUBBfV8s2CwZlgG4';

document.addEventListener('DOMContentLoaded', () => {
    const adminRequestsBody = document.getElementById('admin-requests-body');
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
                company_name: parsed.user?.user_metadata?.company_name || 'إدارة الطلبات'
            };
        }
        return { company_id: 'DEMO_COMPANY_001', company_name: 'إدارة الطلبات' };
    };

    const session = getSession();
    companyNameDisplay.textContent = session.company_name;

    const showStatus = (message, type) => {
        statusContainer.textContent = message;
        statusContainer.className = `status-msg ${type}`;
        setTimeout(() => statusContainer.style.display = 'none', 5000);
    };

    // جلب الطلبات المعلقة للمدير
    const loadPendingRequests = async () => {
        try {
            const response = await fetch(`${SUPABASE_URL}employee_requests?company_id=eq.${session.company_id}&status=eq.pending&select=*,employees(full_name)`, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            });
            const data = await response.json();
            adminRequestsBody.innerHTML = '';

            if (data.length === 0) {
                adminRequestsBody.innerHTML = '<tr><td colspan="5" style="text-align:center">لا توجد طلبات معلقة حالياً</td></tr>';
                return;
            }

            data.forEach(req => {
                const typeMap = { 'leave': 'إجازة', 'loan': 'سلفة', 'permission': 'استئذان' };
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${req.employees?.full_name || 'موظف'}</td>
                    <td>${typeMap[req.request_type]}</td>
                    <td>${req.start_date} إلى ${req.end_date}</td>
                    <td>${req.reason} ${req.amount ? `(${req.amount} ريال)` : ''}</td>
                    <td>
                        <div class="manager-actions">
                            <button class="action-btn btn-approve" onclick="processRequest('${req.id}', 'approved')">قبول</button>
                            <button class="action-btn btn-reject" onclick="toggleRejection('${req.id}')">رفض</button>
                        </div>
                        <div id="rejection-${req.id}" class="rejection-area">
                            <textarea id="reason-${req.id}" placeholder="سبب الرفض..." style="margin: 10px 0; height: 60px;"></textarea>
                            <button class="action-btn btn-reject" onclick="processRequest('${req.id}', 'rejected')">تأكيد الرفض</button>
                        </div>
                    </td>
                `;
                adminRequestsBody.appendChild(row);
            });
        } catch (e) { console.error(e); }
    };

    // معالجة القبول أو الرفض
    window.processRequest = async (id, status) => {
        const rejectionReason = status === 'rejected' ? document.getElementById(`reason-${id}`).value : null;
        if (status === 'rejected' && !rejectionReason) {
            alert('يرجى كتابة سبب الرفض');
            return;
        }

        try {
            const response = await fetch(`${SUPABASE_URL}employee_requests?id=eq.${id}`, {
                method: 'PATCH',
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: status, rejection_reason: rejectionReason })
            });

            if (response.ok) {
                showStatus(`تم ${status === 'approved' ? 'القبول' : 'الرفض'} بنجاح`, 'success');
                loadPendingRequests();
            }
        } catch (e) { console.error(e); }
    };

    window.toggleRejection = (id) => {
        const area = document.getElementById(`rejection-${id}`);
        area.style.display = area.style.display === 'block' ? 'none' : 'block';
    };

    loadPendingRequests();
});
