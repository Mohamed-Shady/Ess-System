/**
 * تطبيق نظام الحضور والانصراف (Vanilla JS)
 * تم الربط الفعلي مع Supabase
 */

// 1. تهيئة الاتصال بـ Supabase (ضع روابطك هنا)
const SUPABASE_URL = 'https://ghmlajdhfoxzzjzzxgwr.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_u3vcjQQmagQAGe4_T1NcIQ_OAi4EAJI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// العناصر الأساسية في الواجهة
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const btnCheckIn = document.getElementById('btn-checkin');
const btnCheckOut = document.getElementById('btn-checkout');
const attendanceStatus = document.getElementById('attendance-status');
const employeeNameSpan = document.getElementById('employee-name');
const logoutLink = document.getElementById('logout-link');

// بيانات الموظف الحالي
let currentEmployee = null;

/**
 * 2. التعامل مع تسجيل الدخول
 */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'جاري الدخول...';

    // الخطوة الأولى: التحقق من الايميل والباسورد
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (authError) {
        alert('بيانات الدخول غير صحيحة: ' + authError.message);
        submitBtn.textContent = 'دخول';
        return;
    }

    // الخطوة الثانية: البحث عن بيانات الموظف المربوطة بهذا الحساب
    const { data: employeeData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

    if (empError || !employeeData) {
        alert('تم الدخول بنجاح ولكن هذا الحساب غير مربوط بموظف في النظام.');
        submitBtn.textContent = 'دخول';
        return;
    }

    // حفظ بيانات الموظف وعرض لوحة التحكم
    currentEmployee = employeeData;
    showDashboard();
    submitBtn.textContent = 'دخول';
});

/**
 * 3. تسجيل الحضور (Check-in)
 */
btnCheckIn.addEventListener('click', async () => {
    btnCheckIn.textContent = 'جاري التسجيل...';
    btnCheckIn.disabled = true;

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0]; // صيغة YYYY-MM-DD
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // إضافة سجل جديد في جدول attendance باستخدام Employee ID
    const { error } = await supabase
        .from('attendance')
        .insert([{
            employee_id: currentEmployee.id,
            date: todayDate,
            check_in: now.toISOString(),
            source: 'Web Portal'
        }]);

    if (error) {
        alert('حدث خطأ أثناء تسجيل الحضور: ' + error.message);
        btnCheckIn.textContent = 'تسجيل حضور';
        btnCheckIn.disabled = false;
        return;
    }

    updateUIStatus(`تم تسجيل الحضور الساعة: ${timeStr}`);
    btnCheckIn.textContent = 'تسجيل حضور';
    btnCheckOut.disabled = false;
});

/**
 * 4. تسجيل الانصراف (Check-out)
 */
btnCheckOut.addEventListener('click', async () => {
    btnCheckOut.textContent = 'جاري التسجيل...';
    btnCheckOut.disabled = true;

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // تحديث سجل الحضور الخاص باليوم لنفس الموظف
    const { error } = await supabase
        .from('attendance')
        .update({
            check_out: now.toISOString(),
            status: 'present'
        })
        .eq('employee_id', currentEmployee.id)
        .eq('date', todayDate);

    if (error) {
        alert('حدث خطأ أثناء تسجيل الانصراف: ' + error.message);
        btnCheckOut.textContent = 'تسجيل انصراف';
        btnCheckOut.disabled = false;
        return;
    }

    updateUIStatus(`تم الانتهاء من العمل (انصراف: ${timeStr})`);
    btnCheckOut.textContent = 'تسجيل انصراف';
});

/**
 * 5. وظائف مساعدة لتحديث الواجهة
 */
function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    employeeNameSpan.textContent = currentEmployee.name || 'موظف';
    checkTodayAttendance();
}

// التأكد إذا كان الموظف قد سجل حضوره اليوم لضبط الأزرار
async function checkTodayAttendance() {
    const todayDate = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', currentEmployee.id)
        .eq('date', todayDate)
        .single();

    if (data) {
        if (data.check_in && !data.check_out) {
            // سجل حضور ولم يسجل انصراف
            btnCheckIn.disabled = true;
            btnCheckOut.disabled = false;
            updateUIStatus('أنت على رأس العمل حالياً.');
        } else if (data.check_out) {
            // سجل انصراف
            btnCheckIn.disabled = true;
            btnCheckOut.disabled = true;
            updateUIStatus('لقد أنهيت ورديتك لهذا اليوم.');
        }
    } else {
        // لم يسجل حضور بعد
        btnCheckIn.disabled = false;
        btnCheckOut.disabled = true;
    }
}

function updateUIStatus(msg) {
    attendanceStatus.textContent = msg;
    attendanceStatus.classList.add('fade-in');
    setTimeout(() => attendanceStatus.classList.remove('fade-in'), 400);
}

logoutLink.addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    location.reload();
});