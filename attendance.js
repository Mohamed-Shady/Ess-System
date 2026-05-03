// الإعدادات الخاصة بـ Supabase
const SUPABASE_URL = 'https://ghmlajdhfoxzzjzzxgwr.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobWxhamRoZm94enpqenp4Z3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDMyNDcsImV4cCI6MjA5MzMxOTI0N30.d9hxKpu7axbXsrqSO-d2abk9RQ5LUBBfV8s2CwZlgG4';

document.addEventListener('DOMContentLoaded', () => {
    const timeDisplay = document.getElementById('current-time');
    const dateDisplay = document.getElementById('current-date');
    const btnCheckIn = document.getElementById('btn-check-in');
    const btnCheckOut = document.getElementById('btn-check-out');
    const completionMsg = document.getElementById('completion-msg');
    const historyBody = document.getElementById('history-body');
    const notification = document.getElementById('status-notification');

    let currentLogId = null; // لتخزين ID السجل الحالي لعملية الانصراف

    // 1. تحديث الساعة الحية
    const updateClock = () => {
        const now = new Date();
        timeDisplay.textContent = now.toLocaleTimeString('en-US', { hour12: false });
        dateDisplay.textContent = now.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };
    setInterval(updateClock, 1000);
    updateClock();

    // 2. جلب بيانات الجلسة
    const getSessionData = () => {
        const projectId = 'ghmlajdhfoxzzjzzxgwr';
        const sessionData = localStorage.getItem(`sb-${projectId}-auth-token`);
        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            return {
                company_id: parsed.user?.user_metadata?.company_id || 'DEMO_COMPANY_001',
                employee_id: parsed.user?.id || 'DEMO_EMP_001',
                company_name: parsed.user?.user_metadata?.company_name || 'لوحة الموظف'
            };
        }
        return { company_id: 'DEMO_COMPANY_001', employee_id: 'DEMO_EMP_001', company_name: 'لوحة الموظف' };
    };

    const session = getSessionData();
    document.getElementById('company_name_display').textContent = session.company_name;

    // 3. دالة لإظهار التنبيهات
    const showNotification = (message, type) => {
        notification.textContent = message;
        notification.className = `status-msg ${type}`;
        setTimeout(() => notification.className = 'status-msg', 4000);
    };

    // 4. فحص حالة الدوام اليوم
    const checkTodayStatus = async () => {
        const today = new Date().toISOString().split('T')[0];

        try {
            const response = await fetch(`${SUPABASE_URL}attendance_logs?employee_id=eq.${session.employee_id}&work_date=eq.${today}`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });

            const logs = await response.json();

            // تحديث الواجهة بناءً على الحالة
            btnCheckIn.style.display = 'none';
            btnCheckOut.style.display = 'none';
            completionMsg.style.display = 'none';

            if (logs.length === 0) {
                btnCheckIn.style.display = 'block';
            } else {
                const todayLog = logs[0];
                currentLogId = todayLog.id;

                if (!todayLog.check_out_time) {
                    btnCheckOut.style.display = 'block';
                } else {
                    completionMsg.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Status Check Error:', error);
        }
    };

    // 5. جلب سجل آخر 5 أيام
    const fetchHistory = async () => {
        try {
            const response = await fetch(`${SUPABASE_URL}attendance_logs?employee_id=eq.${session.employee_id}&order=work_date.desc&limit=5`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });

            const logs = await response.json();
            historyBody.innerHTML = '';

            if (logs.length === 0) {
                historyBody.innerHTML = '<tr><td colspan="3" style="text-align:center">لا يوجد سجلات سابقة</td></tr>';
                return;
            }

            logs.forEach(log => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${log.work_date}</td>
                    <td>${log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td>${log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '<span class="status-badge status-pending">قيد الدوام</span>'}</td>
                `;
                historyBody.appendChild(row);
            });
        } catch (error) {
            console.error('History Fetch Error:', error);
        }
    };

    // 6. تسجيل الحضور (Check-in)
    btnCheckIn.addEventListener('click', async () => {
        const now = new Date();
        const payload = {
            company_id: session.company_id,
            employee_id: session.employee_id,
            work_date: now.toISOString().split('T')[0],
            check_in_time: now.toISOString()
        };

        try {
            const response = await fetch(`${SUPABASE_URL}attendance_logs`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showNotification('تم تسجيل الحضور بنجاح ✅', 'success');
                await checkTodayStatus();
                await fetchHistory();
            } else {
                throw new Error('فشل تسجيل الحضور');
            }
        } catch (error) {
            showNotification('خطأ في الاتصال: ' + error.message, 'error');
        }
    });

    // 7. تسجيل الانصراف (Check-out)
    btnCheckOut.addEventListener('click', async () => {
        if (!currentLogId) return;

        const now = new Date();
        const payload = {
            check_out_time: now.toISOString()
        };

        try {
            const response = await fetch(`${SUPABASE_URL}attendance_logs?id=eq.${currentLogId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showNotification('تم تسجيل الانصراف بنجاح، يومك سعيد! 👋', 'success');
                await checkTodayStatus();
                await fetchHistory();
            } else {
                throw new Error('فشل تسجيل الانصراف');
            }
        } catch (error) {
            showNotification('خطأ في الاتصال: ' + error.message, 'error');
        }
    });

    // التشغيل المبدئي
    checkTodayStatus();
    fetchHistory();
});
