// الإعدادات الخاصة بـ Supabase
const SUPABASE_URL = 'https://ghmlajdhfoxzzjzzxgwr.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobWxhamRoZm94enpqenp4Z3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDMyNDcsImV4cCI6MjA5MzMxOTI0N30.d9hxKpu7axbXsrqSO-d2abk9RQ5LUBBfV8s2CwZlgG4';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('employee-form');
    const statusContainer = document.getElementById('status-container');
    const resetBtn = document.getElementById('reset-btn');
    const companyNameDisplay = document.getElementById('company_name_display');

    // دالة لتحديث اسم الشركة ديناميكياً
    const updateCompanyName = () => {
        try {
            const projectId = 'ghmlajdhfoxzzjzzxgwr';
            const sessionData = localStorage.getItem(`sb-${projectId}-auth-token`);

            if (sessionData) {
                const parsed = JSON.parse(sessionData);
                const companyName = parsed.user?.user_metadata?.company_name;
                if (companyName) {
                    companyNameDisplay.textContent = companyName;
                }
            }
        } catch (e) {
            console.error('Error updating company name:', e);
        }
    };

    updateCompanyName();

    // دالة لإظهار رسائل الحالة
    const showStatus = (message, type) => {
        statusContainer.textContent = message;
        statusContainer.className = `status-msg ${type}`;
        statusContainer.style.display = 'block';

        // التمرير لأعلى لرؤية الرسالة
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (type === 'success') {
            setTimeout(() => {
                statusContainer.style.display = 'none';
            }, 5000);
        }
    };

    // التحقق من صحة البيانات (Validation)
    const validateForm = () => {
        let isValid = true;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // إعادة ضبط جميع الحقول
        document.querySelectorAll('.form-group').forEach(group => group.classList.remove('invalid'));

        // 1. التحقق من أن جميع الحقول إجبارية
        for (let [key, value] of Object.entries(data)) {
            if (!value.trim()) {
                document.getElementById(key).closest('.form-group').classList.add('invalid');
                isValid = false;
            }
        }

        // 2. التحقق من رقم الهوية/الإقامة بناءً على الجنسية
        const nationality = data.nationality;
        const idNumber = data.national_id_iqama;
        if (nationality === 'سعودي') {
            if (!/^1\d{9}$/.test(idNumber)) {
                const group = document.getElementById('national_id_iqama').closest('.form-group');
                group.classList.add('invalid');
                group.querySelector('.error-message').textContent = 'رقم الهوية السعودية يجب أن يبدأ بـ 1 ويتكون من 10 أرقام';
                isValid = false;
            }
        } else if (nationality === 'أخرى') {
            if (!/^2\d{9}$/.test(idNumber)) {
                const group = document.getElementById('national_id_iqama').closest('.form-group');
                group.classList.add('invalid');
                group.querySelector('.error-message').textContent = 'رقم الإقامة يجب أن يبدأ بـ 2 ويتكون من 10 أرقام';
                isValid = false;
            }
        }

        // 3. التحقق من تاريخ انتهاء الإقامة (في المستقبل)
        if (data.iqama_expiry_date) {
            const expiryDate = new Date(data.iqama_expiry_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (expiryDate <= today) {
                const group = document.getElementById('iqama_expiry_date').closest('.form-group');
                group.classList.add('invalid');
                isValid = false;
            }
        }

        // 4. التحقق من الراتب (رقم موجب أكبر من صفر)
        const salary = parseFloat(data.basic_salary);
        if (isNaN(salary) || salary <= 0) {
            const group = document.getElementById('basic_salary').closest('.form-group');
            group.classList.add('invalid');
            isValid = false;
        }

        return isValid;
    };

    // جلب company_id من الجلسة (LocalStorage الخاص بـ Supabase)
    const getCompanyIdFromSession = () => {
        try {
            // محاولة البحث عن توكن الجلسة في LocalStorage
            // الاسم الافتراضي لتوكن Supabase هو sb-[project-id]-auth-token
            const projectId = 'ghmlajdhfoxzzjzzxgwr';
            const sessionData = localStorage.getItem(`sb-${projectId}-auth-token`);

            if (sessionData) {
                const parsed = JSON.parse(sessionData);
                return parsed.user?.user_metadata?.company_id || 'DEFAULT_SaaS_ID';
            }
        } catch (e) {
            console.error('Error fetching session:', e);
        }
        return 'DEMO_COMPANY_001'; // قيمة افتراضية للتجربة
    };

    // الربط مع Supabase باستخدام fetch
    const submitToSupabase = async (employeeData) => {
        const companyId = getCompanyIdFromSession();

        const payload = {
            ...employeeData,
            company_id: companyId,
            basic_salary: parseFloat(employeeData.basic_salary),
            created_at: new Date().toISOString()
        };

        try {
            const response = await fetch(`${SUPABASE_URL}employees`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal' // سرعة أعلى، لا نحتاج لاسترجاع البيانات
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'فشل في حفظ البيانات');
            }

            return { success: true };
        } catch (error) {
            console.error('Supabase Error:', error);
            return { success: false, error: error.message };
        }
    };

    // معالجة إرسال النموذج
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showStatus('يرجى التأكد من صحة جميع البيانات المدخلة', 'error');
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري الحفظ...';

        const formData = new FormData(form);
        const employeeData = Object.fromEntries(formData.entries());

        const result = await submitToSupabase(employeeData);

        if (result.success) {
            showStatus('✅ تم إضافة الموظف بنجاح إلى النظام!', 'success');
            form.reset();
            // مسح علامات الخطأ إن وجدت
            document.querySelectorAll('.form-group').forEach(group => group.classList.remove('invalid'));
        } else {
            showStatus(`❌ حدث خطأ: ${result.error}`, 'error');
        }

        submitBtn.disabled = false;
        submitBtn.textContent = 'حفظ الموظف';
    });

    // إعادة التعيين
    resetBtn.addEventListener('click', () => {
        form.reset();
        document.querySelectorAll('.form-group').forEach(group => group.classList.remove('invalid'));
        statusContainer.style.display = 'none';
    });
});
