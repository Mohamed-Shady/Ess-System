// الإعدادات الخاصة بـ Supabase
const SUPABASE_URL = 'https://ghmlajdhfoxzzjzzxgwr.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobWxhamRoZm94enpqenp4Z3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDMyNDcsImV4cCI6MjA5MzMxOTI0N30.d9hxKpu7axbXsrqSO-d2abk9RQ5LUBBfV8s2CwZlgG4';

document.addEventListener('DOMContentLoaded', () => {
    const monthPicker = document.getElementById('payroll-month');
    const btnGenerate = document.getElementById('btn-generate-payroll');
    const tableBody = document.getElementById('payroll-table-body');
    const statusContainer = document.getElementById('status-container');
    const companyNameDisplay = document.getElementById('company_name_display');

    // 1. تعيين الشهر الحالي افتراضياً
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthPicker.value = currentMonth;

    // 2. جلب بيانات الجلسة
    const getSessionData = () => {
        const projectId = 'ghmlajdhfoxzzjzzxgwr';
        const sessionData = localStorage.getItem(`sb-${projectId}-auth-token`);
        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            return {
                company_id: parsed.user?.user_metadata?.company_id || 'DEMO_COMPANY_001',
                company_name: parsed.user?.user_metadata?.company_name || 'لوحة الرواتب'
            };
        }
        return { company_id: 'DEMO_COMPANY_001', company_name: 'لوحة الرواتب' };
    };

    const session = getSessionData();
    companyNameDisplay.textContent = session.company_name;

    const showStatus = (message, type) => {
        statusContainer.textContent = message;
        statusContainer.className = `status-msg ${type}`;
        setTimeout(() => statusContainer.style.display = 'none', 5000);
    };

    // 3. جلب مسير الرواتب للشهر المحدد
    const fetchPayroll = async () => {
        const selectedMonth = monthPicker.value;
        if (!selectedMonth) return;

        try {
            // جلب البيانات مع الفلترة الصحيحة لاسم العمود (payroll_month)
            const response = await fetch(`${SUPABASE_URL}payroll_records?company_id=eq.${session.company_id}&payroll_month=eq.${selectedMonth}&select=*,employees(full_name)`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });

            // التحقق من صحة الاستجابة قبل المعالجة لتجنب أخطاء JSON
            if (!response.ok) {
                throw new Error('فشل في جلب سجلات الرواتب من الخادم');
            }

            const records = await response.json();
            renderTable(records);
        } catch (error) {
            console.error('Fetch Payroll Error:', error);
            showStatus(error.message || 'خطأ في جلب بيانات الرواتب', 'error');
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #e74c3c; padding: 40px;">فشل تحميل البيانات. يرجى المحاولة مرة أخرى.</td></tr>';
        }
    };

    const renderTable = (records) => {
        tableBody.innerHTML = '';
        if (!Array.isArray(records) || records.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999; padding: 40px;">لا توجد سجلات رواتب لهذا الشهر. اضغط على "توليد" للبدء.</td></tr>';
            return;
        }

        records.forEach(rec => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rec.employees?.full_name || rec.employee_name || 'موظف'}</td>
                <td>${rec.basic_salary} ريال</td>
                <td>${rec.deductions} ريال</td>
                <td>${rec.bonuses} ريال</td>
                <td style="font-weight: 700; color: #1a237e;">${rec.net_salary} ريال</td>
                <td><span class="status-pending">قيد المعالجة</span></td>
            `;
            tableBody.appendChild(row);
        });
    };

    // 4. توليد مسير الرواتب
    btnGenerate.addEventListener('click', async () => {
        const selectedMonth = monthPicker.value;
        if (!selectedMonth) {
            showStatus('يرجى اختيار الشهر أولاً', 'error');
            return;
        }

        btnGenerate.disabled = true;
        btnGenerate.textContent = 'جاري التوليد...';

        try {
            // أ. جلب قائمة الموظفين
            const empResponse = await fetch(`${SUPABASE_URL}employees?company_id=eq.${session.company_id}`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            
            if (!empResponse.ok) throw new Error('فشل جلب قائمة الموظفين');
            const employees = await empResponse.json();

            if (employees.length === 0) {
                showStatus('لا يوجد موظفون مسجلون لتوليد رواتبهم', 'error');
                btnGenerate.disabled = false;
                btnGenerate.textContent = 'توليد مسير الرواتب';
                return;
            }

            // ب. جلب سجلات الحضور للشهر المحدد (فلتر like للبحث عن الشهر)
            const attResponse = await fetch(`${SUPABASE_URL}attendance_logs?company_id=eq.${session.company_id}&work_date=like.${selectedMonth}*`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            
            if (!attResponse.ok) throw new Error('فشل جلب سجلات الحضور');
            const attendanceLogs = await attResponse.json();

            // ج. بناء مصفوفة الرواتب (Payload) مع استخدام الأسماء الصحيحة (payroll_month)
            const payrollData = employees.map(emp => {
                const empLogs = attendanceLogs.filter(log => log.employee_id === emp.employee_id);
                const attendanceDays = empLogs.length;
                const totalWorkingDays = 30;
                const absenceDays = Math.max(0, totalWorkingDays - attendanceDays);
                const dailySalary = emp.basic_salary / totalWorkingDays;
                
                const totalDeductions = parseFloat((absenceDays * dailySalary).toFixed(2));
                const netSalary = parseFloat((emp.basic_salary - totalDeductions).toFixed(2));

                return {
                    company_id: session.company_id,
                    employee_id: emp.employee_id, // استخدام employee_id كما في المتطلبات
                    payroll_month: selectedMonth, // استخدامpayroll_month بدلاً من month_year
                    basic_salary: emp.basic_salary,
                    deductions: totalDeductions,
                    bonuses: 0,
                    net_salary: netSalary,
                    payment_status: 'pending'
                };
            });

            // د. إرسال البيانات (POST request)
            const response = await fetch(`${SUPABASE_URL}payroll_records`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payrollData)
            });

            if (response.status === 409 || response.status === 400) {
                showStatus('عذراً، تم توليد مسير الرواتب لهذا الشهر مسبقاً', 'error');
            } else if (response.ok) {
                showStatus('تم توليد مسير الرواتب بنجاح ✅', 'success');
                await fetchPayroll();
            } else {
                const err = await response.json();
                throw new Error(err.message || 'فشل في توليد الرواتب');
            }

        } catch (error) {
            console.error('Generate Payroll Error:', error);
            showStatus(`خطأ: ${error.message}`, 'error');
        } finally {
            btnGenerate.disabled = false;
            btnGenerate.textContent = 'توليد مسير الرواتب';
        }
    });

    monthPicker.addEventListener('change', fetchPayroll);

    // التحميل المبدئي
    fetchPayroll();
});
