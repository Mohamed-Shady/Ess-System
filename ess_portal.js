// الإعدادات الخاصة بـ Supabase
const SUPABASE_URL = 'https://ghmlajdhfoxzzjzzxgwr.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobWxhamRoZm94enpqenp4Z3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDMyNDcsImV4cCI6MjA5MzMxOTI0N30.d9hxKpu7axbXsrqSO-d2abk9RQ5LUBBfV8s2CwZlgG4';

// دالة تبديل الواجهات
function switchView(view) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');

    if (view === 'employee') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('employee-view').style.display = 'block';
    } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('manager-view').style.display = 'block';
        window.loadManagerRequests(); // جلب طلبات المدير عند التبديل
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const requestForm = document.getElementById('request-form');
    const typeSelect = document.getElementById('request_type');
    const loanField = document.getElementById('loan-field');
    const myRequestsBody = document.getElementById('my-requests-body');
    const managerRequestsBody = document.getElementById('manager-requests-body');
    const statusContainer = document.getElementById('status-container');
    const companyNameDisplay = document.getElementById('company_name_display');

    // 1. جلب بيانات الجلسة
    const getSessionData = () => {
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

    const session = getSessionData();
    companyNameDisplay.textContent = session.company_name;

    const showStatus = (message, type) => {
        statusContainer.textContent = message;
        statusContainer.className = `status-msg ${type}`;
        setTimeout(() => statusContainer.style.display = 'none', 5000);
    };

    // 2. التحكم في حقل السلفة
    typeSelect.addEventListener('change', () => {
        loanField.style.display = typeSelect.value === 'loan' ? 'block' : 'none';
        document.getElementById('amount').required = typeSelect.value === 'loan';
    });

    // 3. جلب طلبات الموظف
    const loadMyRequests = async () => {
        try {
            const response = await fetch(`${SUPABASE_URL}employee_requests?employee_id=eq.${session.employee_id}&order=created_at.desc`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            const data = await response.json();
            
            myRequestsBody.innerHTML = '';
            if (data.length === 0) {
                myRequestsBody.innerHTML = '<tr><td colspan="4" style="text-align:center">لا يوجد طلبات سابقة</td></tr>';
                return;
            }

            data.forEach(req => {
                const row = document.createElement('tr');
                const typeMap = { 'leave': 'إجازة', 'loan': 'سلفة', 'permission': 'استئذان' };
                const statusMap = { 'pending': 'معلق', 'approved': 'مقبول', 'rejected': 'مرفوض' };
                
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

    // 4. تقديم طلب جديد
    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = requestForm.querySelector('.btn-submit');
        btn.disabled = true;
        btn.textContent = 'جاري الإرسال...';

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
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showStatus('تم إرسال طلبك بنجاح ✅', 'success');
                requestForm.reset();
                loanField.style.display = 'none';
                loadMyRequests();
            } else {
                throw new Error('فشل إرسال الطلب');
            }
        } catch (err) {
            showStatus(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'إرسال الطلب';
        }
    });

    // 5. واجهة المدير: جلب الطلبات المعلقة
    window.loadManagerRequests = async () => {
        try {
            const response = await fetch(`${SUPABASE_URL}employee_requests?company_id=eq.${session.company_id}&status=eq.pending&select=*,employees(full_name)`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            const data = await response.json();
            
            managerRequestsBody.innerHTML = '';
            if (data.length === 0) {
                managerRequestsBody.innerHTML = '<tr><td colspan="5" style="text-align:center">لا توجد طلبات معلقة</td></tr>';
                return;
            }

            data.forEach(req => {
                const row = document.createElement('tr');
                const typeMap = { 'leave': 'إجازة', 'loan': 'سلفة', 'permission': 'استئذان' };
                row.innerHTML = `
                    <td>${req.employees?.full_name || 'موظف'}</td>
                    <td>${typeMap[req.request_type]}</td>
                    <td>${req.start_date} إلى ${req.end_date}</td>
                    <td>${req.reason} ${req.amount ? `(${req.amount} ريال)` : ''}</td>
                    <td>
                        <div class="manager-actions">
                            <button class="action-btn btn-approve" onclick="updateRequest('${req.id}', 'approved')">قبول</button>
                            <button class="action-btn btn-reject" onclick="toggleRejection('${req.id}')">رفض</button>
                        </div>
                        <div id="rejection-${req.id}" class="rejection-area">
                            <textarea id="reason-${req.id}" placeholder="سبب الرفض..."></textarea>
                            <button class="action-btn btn-reject" onclick="updateRequest('${req.id}', 'rejected')">تأكيد الرفض</button>
                        </div>
                    </td>
                `;
                managerRequestsBody.appendChild(row);
            });
        } catch (e) { console.error(e); }
    };

    // 6. المدير: قبول أو رفض الطلب
    window.updateRequest = async (id, status) => {
        const rejectionReason = status === 'rejected' ? document.getElementById(`reason-${id}`).value : null;
        if (status === 'rejected' && !rejectionReason) {
            alert('يرجى كتابة سبب الرفض');
            return;
        }

        try {
            const response = await fetch(`${SUPABASE_URL}employee_requests?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    status: status,
                    rejection_reason: rejectionReason
                })
            });

            if (response.ok) {
                showStatus(`تم ${status === 'approved' ? 'القبول' : 'الرفض'} بنجاح`, 'success');
                window.loadManagerRequests();
            }
        } catch (e) { console.error(e); }
    };

    window.toggleRejection = (id) => {
        const area = document.getElementById(`rejection-${id}`);
        area.style.display = area.style.display === 'block' ? 'none' : 'block';
    };

    // التحميل المبدئي
    loadMyRequests();
});
