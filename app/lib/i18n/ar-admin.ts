// Arabic translations for the admin surface. Keyed by English source string.
export const ar: Record<string, string> = {
  // Login
  "Nuqra home": "الصفحة الرئيسية لـ Nuqra",
  "Manager sign in": "تسجيل دخول المدير",
  "Access the Nuqra admin dashboard.": "ادخل إلى لوحة تحكم Nuqra.",
  "Invalid credentials.": "بيانات الدخول غير صحيحة.",
  Email: "البريد الإلكتروني",
  Password: "كلمة المرور",
  "Your password": "كلمة المرور الخاصة بك",
  "Hide password": "إخفاء كلمة المرور",
  "Show password": "إظهار كلمة المرور",
  "Signing in.": "جارٍ تسجيل الدخول.",
  "Sign in": "تسجيل الدخول",
  "Accounts are issued by your administrator.": "يتم إصدار الحسابات من قبل المسؤول لديك.",

  // Sidebar nav
  Dashboard: "لوحة التحكم",
  "Tables & QR": "الطاولات ورمز QR",
  Orders: "الطلبات",
  Transactions: "المعاملات",
  Menu: "القائمة",
  Analytics: "التحليلات",
  Settings: "الإعدادات",
  Manage: "الإدارة",
  "Sign out": "تسجيل الخروج",
  "Super Admin": "مسؤول رئيسي",
  Administrator: "مسؤول",

  // Legal pages
  Legal: "قانوني",
  "last updated": "آخر تحديث",
  "Privacy policy": "سياسة الخصوصية",
  "Nuqra processes the minimum data needed to run scan-to-pay: table and order details, payment records, and (for demo requests) the name, email, and restaurant you submit. We do not sell personal data.":
    "تعالج Nuqra الحد الأدنى من البيانات اللازمة لتشغيل المسح والدفع: تفاصيل الطاولة والطلب، وسجلات الدفع، و(لطلبات العرض التوضيحي) الاسم والبريد الإلكتروني واسم المطعم الذي ترسله. نحن لا نبيع البيانات الشخصية.",
  "What we collect": "ما الذي نجمعه",
  "Account credentials (stored only as salted hashes), restaurant settings, live table/order state, payment ledger entries, and demo-request leads.":
    "بيانات اعتماد الحساب (مخزنة فقط كقيم تجزئة مملحة)، وإعدادات المطعم، وحالة الطاولة/الطلب المباشرة، وقيود سجل الدفع، وطلبات العروض التوضيحية.",
  Contact: "تواصل معنا",
  "For privacy or data requests, email": "لطلبات الخصوصية أو البيانات، راسلنا على",
  "or call": "أو اتصل على",

  // Terms
  "Terms of service": "شروط الخدمة",
  "By using Nuqra you agree to use it lawfully for accepting restaurant payments. The service is provided as-is; this prototype demonstrates a scan-to-pay flow and is not a production payment processor.":
    "باستخدامك Nuqra فإنك توافق على استخدامها بشكل قانوني لقبول مدفوعات المطاعم. تُقدَّم الخدمة كما هي؛ هذا النموذج الأولي يوضح تجربة المسح والدفع وليس معالج دفع للإنتاج.",
  Accounts: "الحسابات",
  "Admin accounts are issued by the operator. You are responsible for keeping your credentials confidential.":
    "يتم إصدار حسابات المسؤولين من قبل المشغّل. أنت مسؤول عن الحفاظ على سرية بيانات اعتمادك.",
  "Questions? Call": "أسئلة؟ اتصل على",

  // 404
  "Page not found": "الصفحة غير موجودة",
  "The page you are looking for may have moved or no longer exists. Let us get you back on track.":
    "ربما تم نقل الصفحة التي تبحث عنها أو لم تعد موجودة. دعنا نعيدك إلى المسار الصحيح.",
  "Back to home": "العودة إلى الصفحة الرئيسية",

  // Settings page ("Settings" key is already defined in the sidebar nav above)
  "Restaurant profile and payment preferences.": "ملف المطعم وتفضيلات الدفع.",
  "Restaurant name": "اسم المطعم",
  "Tax rate (%)": "نسبة الضريبة (%)",
  Currency: "العملة",
  "Automatic receipts": "الإيصالات التلقائية",
  "Email or SMS receipt after each payment":
    "إيصال عبر البريد الإلكتروني أو الرسائل النصية بعد كل دفعة",
  "Tip prompts": "اقتراحات الإكرامية",
  "Show tip suggestions at checkout": "إظهار اقتراحات الإكرامية عند الدفع",
  "Number of tables": "عدد الطاولات",
  "Number of branches": "عدد الفروع",
  // POS integration
  "POS integration": "ربط نقاط البيع",
  "Connected": "مُتصل",
  "Needs details": "يلزم استكمال البيانات",
  "Not set": "غير محدّد",
  "Connect your point-of-sale so orders and payments stay in sync.":
    "اربط نظام نقاط البيع لتبقى الطلبات والمدفوعات متزامنة.",
  "Your POS system": "نظام نقاط البيع لديك",
  None: "لا يوجد",
  "(optional)": "(اختياري)",
  "Test connection": "اختبر الاتصال",
  // Branches
  Branches: "الفروع",
  Branch: "فرع",
  "Manage tables": "إدارة الطاولات",
  "+ Add branch": "+ إضافة فرع",
  "Branch name": "اسم الفرع",
  "POS branch ID": "معرّف فرع نقاط البيع",
  "POS system": "نظام نقاط البيع",
  "e.g. 1024": "مثال: 1024",
  "Save branch": "حفظ الفرع",
  Saved: "تم الحفظ",
  "Confirm delete?": "تأكيد الحذف؟",
  table: "طاولة",
  tables: "طاولات",
  "Name each location, set its POS branch ID, and manage its tables separately.":
    "سمِّ كل موقع، وحدّد معرّف فرع نقاط البيع، وأدِر طاولاته بشكل منفصل.",
  "No branches yet": "لا توجد فروع بعد",
  "Add your first branch to get started.": "أضف أول فرع للبدء.",
  "Couldn't load your branches. Please refresh.": "تعذّر تحميل فروعك. يرجى التحديث.",
  "Couldn't add a branch. Please retry.": "تعذّرت إضافة فرع. يرجى المحاولة مرة أخرى.",
  "Couldn't test the connection.": "تعذّر اختبار الاتصال.",
  "Couldn't delete this branch. Please retry.": "تعذّر حذف هذا الفرع. يرجى المحاولة مرة أخرى.",
  "You must keep at least one branch.": "يجب الإبقاء على فرع واحد على الأقل.",
  "Save changes": "حفظ التغييرات",
  "Saving.": "جارٍ الحفظ.",
  "Settings saved.": "تم حفظ الإعدادات.",
  "Tax rate must be a number between 0 and 30.":
    "يجب أن تكون نسبة الضريبة رقمًا بين 0 و30.",
  "Couldn't save. Please retry.": "تعذّر الحفظ. يرجى المحاولة مرة أخرى.",
  "USD (US Dollar $)": "دولار أمريكي (USD $)",
  "GBP (British Pound £)": "جنيه إسترليني (GBP £)",
  "EUR (Euro €)": "يورو (EUR €)",
  "SAR (Saudi Riyal)": "ريال سعودي (SAR)",
};
