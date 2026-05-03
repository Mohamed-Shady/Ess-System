// الإعدادات الخاصة بـ Supabase
const SUPABASE_URL = 'https://ghmlajdhfoxzzjzzxgwr.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobWxhamRoZm94enpqenp4Z3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDMyNDcsImV4cCI6MjA5MzMxOTI0N30.d9hxKpu7axbXsrqSO-d2abk9RQ5LUBBfV8s2CwZlgG4';

document.addEventListener('DOMContentLoaded', () => {
    const totalEmployeesEl = document.getElementById('total-employees');
    const totalSalariesEl = document.getElementById('total-salaries');
    const totalDeptsEl = document.getElementById('total-departments');
    const chartContent = document.getElementById('chart-content');
    const companyNameDisplay = document.getElementById('company_name_display');

    // جلب بيانات الجلسة
    const getSessionData = () => {
        const projectId = 'ghmlajdhfoxzzjzzxgwr';
        const sessionData = localStorage.getItem(`sb-${projectId}-auth-token`);
        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            return {
                company_id: parsed.user?.user_metadata?.company_id || 'DEMO_COMPANY_001',
                company_name: parsed.user?.user_metadata?.company_name || 'لوحة التحليلات'
            };
        }
        return { company_id: 'DEMO_COMPANY_001', company_name: 'لوحة التحليلات' };
    };

    const session = getSessionData();
    companyNameDisplay.textContent = session.company_name;

    const fetchAnalyticsData = async () => {
        try {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // 1. جلب بيانات الموظفين
            const empResponse = await fetch(`${SUPABASE_URL}employees?company_id=eq.${session.company_id}`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            const employees = await empResponse.json();

            // 2. جلب بيانات الرواتب للشهر الحالي
            const payrollResponse = await fetch(`${SUPABASE_URL}payroll_records?company_id=eq.${session.company_id}&payroll_month=eq.${currentMonth}`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            const payrolls = await payrollResponse.json();

            updateCards(employees, payrolls);
            renderChart(employees);

        } catch (error) {
            console.error('Analytics Fetch Error:', error);
        }
    };

    const updateCards = (employees, payrolls) => {
        // إجمالي الموظفين
        totalEmployeesEl.textContent = employees.length;

        // إجمالي رواتب الشهر الحالي (Net Salary)
        const totalNet = payrolls.reduce((sum, rec) => sum + parseFloat(rec.net_salary || 0), 0);
        totalSalariesEl.textContent = totalNet.toLocaleString('ar-SA');

        // عدد الأقسام الفريدة
        const departments = new Set(employees.map(emp => emp.department).filter(d => d));
        totalDeptsEl.textContent = departments.size;
    };

    const renderChart = (employees) => {
        chartContent.innerHTML = '';

        if (employees.length === 0) {
            chartContent.innerHTML = '<p style="text-align:center">لا يوجد بيانات لعرضها</p>';
            return;
        }

        // تجميع الرواتب الأساسية لكل قسم
        const deptSalaries = {};
        let totalBasic = 0;

        employees.forEach(emp => {
            const dept = emp.department || 'غير محدد';
            const salary = parseFloat(emp.basic_salary || 0);
            deptSalaries[dept] = (deptSalaries[dept] || 0) + salary;
            totalBasic += salary;
        });

        // توليد الأشرطة
        Object.entries(deptSalaries).forEach(([dept, salary]) => {
            const percentage = totalBasic > 0 ? (salary / totalBasic) * 100 : 0;

            const barWrapper = document.createElement('div');
            barWrapper.className = 'bar-wrapper';
            
            barWrapper.innerHTML = `
                <div class="bar-info">
                    <span>${dept}</span>
                    <span>${salary.toLocaleString('ar-SA')} ريال (${percentage.toFixed(1)}%)</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: 0%"></div>
                </div>
            `;

            chartContent.appendChild(barWrapper);

            // تحريك الشريط بعد إضافته للـ DOM
            setTimeout(() => {
                barWrapper.querySelector('.bar-fill').style.width = `${percentage}%`;
            }, 100);
        });
    };

    fetchAnalyticsData();
});
