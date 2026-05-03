// الإعدادات الخاصة بـ Supabase
const SUPABASE_URL = 'https://ghmlajdhfoxzzjzzxgwr.supabase.co/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobWxhamRoZm94enpqenp4Z3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDMyNDcsImV4cCI6MjA5MzMxOTI0N30.d9hxKpu7axbXsrqSO-d2abk9RQ5LUBBfV8s2CwZlgG4';

// دالة التبديل بين الدخول وإنشاء الحساب
function toggleAuth(view) {
    const loginSec = document.getElementById('login-section');
    const signupSec = document.getElementById('signup-section');
    
    if (view === 'signup') {
        loginSec.classList.remove('active');
        signupSec.classList.add('active');
    } else {
        signupSec.classList.remove('active');
        loginSec.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const statusContainer = document.getElementById('status-container');

    const showStatus = (message, type) => {
        statusContainer.textContent = message;
        statusContainer.className = `status-msg ${type}`;
        statusContainer.style.display = 'block';
        setTimeout(() => { statusContainer.style.display = 'none'; }, 5000);
    };

    // 1. تسجيل مستخدم جديد (Sign Up)
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const companyName = document.getElementById('company-name').value;
        
        const btn = document.getElementById('btn-signup');
        btn.disabled = true;
        btn.textContent = 'جاري المعالجة...';

        try {
            const response = await fetch(`${SUPABASE_URL}auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    data: {
                        company_name: companyName,
                        company_id: 'COMP-' + Math.random().toString(36).substr(2, 9).toUpperCase() // توليد معرف تجريبي للشركة
                    }
                })
            });

            const result = await response.json();

            if (response.ok) {
                showStatus('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.', 'success');
                toggleAuth('login');
            } else {
                showStatus(result.msg || result.error_description || 'حدث خطأ أثناء التسجيل', 'error');
            }
        } catch (error) {
            showStatus('تعذر الاتصال بالخادم', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'إنشاء الحساب';
        }
    });

    // 2. تسجيل الدخول (Sign In)
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const btn = document.getElementById('btn-login');
        btn.disabled = true;
        btn.textContent = 'جاري التحقق...';

        try {
            const response = await fetch(`${SUPABASE_URL}auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const result = await response.json();

            if (response.ok) {
                // حفظ الجلسة في LocalStorage بصيغة Supabase الرسمية
                const projectId = 'ghmlajdhfoxzzjzzxgwr';
                const sessionKey = `sb-${projectId}-auth-token`;
                
                localStorage.setItem(sessionKey, JSON.stringify(result));
                
                showStatus('تم تسجيل الدخول بنجاح! جاري التوجيه...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                showStatus(result.error_description || 'بيانات الدخول غير صحيحة', 'error');
            }
        } catch (error) {
            showStatus('تعذر الاتصال بالخادم', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'تسجيل الدخول';
        }
    });
});
