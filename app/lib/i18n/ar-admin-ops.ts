// Arabic translations for admin ops pages. Keyed by English source string.
export const ar: Record<string, string> = {
  // Orders page
  "Orders": "الطلبات",
  "Live orders diners placed from their phones, with kitchen notes.":
    "الطلبات المباشرة التي أرسلها الزبائن من هواتفهم، مع ملاحظات المطبخ.",
  // "Active" intentionally omitted - shared key lives in ar-admin-super (نشط).
  "All": "الكل",
  "No active orders": "لا توجد طلبات نشطة",
  "No orders yet": "لا توجد طلبات بعد",
  "When diners order from their phone, their orders appear here in real time. Add orderable items under Menu → Order items to enable this.":
    "عندما يطلب الزبائن من هواتفهم، تظهر طلباتهم هنا فورياً. أضف عناصر قابلة للطلب ضمن قائمة الطعام، تبويب عناصر الطلب، لتفعيل ذلك.",
  "Table": "طاولة",
  "placed": "مُرسَل",
  "preparing": "قيد التحضير",
  "served": "تم التقديم",
  "cancelled": "ملغى",
  "Start": "ابدأ",
  "Served": "تم التقديم",
  "Cancel": "إلغاء",

  // Menu page ("Menu" intentionally omitted - shared key lives in ar-common (القائمة) to avoid overriding the customer/nav surfaces)
  "Upload a menu file diners can view, and optionally add orderable items so they can order from their phone.":
    "ارفع ملف قائمة طعام يمكن للزبائن عرضه، وأضف اختيارياً عناصر قابلة للطلب ليتمكنوا من الطلب من هواتفهم.",
  "Menu file": "ملف القائمة",
  "Order items": "عناصر الطلب",
  "Menu type": "نوع القائمة",
  "Replace menu": "استبدال القائمة",
  "Upload menu": "رفع القائمة",
  "Remove": "إزالة",
  "Upload failed. Use an image or PDF (max 20MB).":
    "فشل الرفع. استخدم صورة أو ملف PDF (بحد أقصى 20 ميغابايت).",
  "No menu uploaded": "لم يتم رفع قائمة",
  "PNG, JPG, WebP, GIF, or PDF. Diners can view it before they pay.":
    "PNG أو JPG أو WebP أو GIF أو PDF. يمكن للزبائن عرضها قبل الدفع.",
  "uploaded": "تم الرفع في",
  "Uploaded menu": "القائمة المرفوعة",

  // Menu items editor
  "Add an item": "إضافة عنصر",
  "Item name": "اسم العنصر",
  "Price": "السعر",
  "Category (optional)": "الفئة (اختياري)",
  "Description (optional)": "الوصف (اختياري)",
  "Enter a name and a valid price.": "أدخل اسماً وسعراً صحيحاً.",
  "Could not add item.": "تعذرت إضافة العنصر.",
  "No orderable items yet": "لا توجد عناصر قابلة للطلب بعد",
  "Adding items is optional. When you add some, diners can order and leave notes (like ‘no cheese’) straight from their phone. Without items, they’ll still see your uploaded menu.":
    "إضافة العناصر اختيارية. عند إضافتها، يمكن للزبائن الطلب وترك ملاحظات (مثل «بدون جبن») مباشرة من هواتفهم. وبدون عناصر، سيظل بإمكانهم رؤية القائمة المرفوعة.",
  "Available. Click to hide.": "متاح. اضغط للإخفاء.",
  "Hidden. Click to show.": "مخفي. اضغط للإظهار.",
  "Available": "متاح",
  "Hidden": "مخفي",
  "Edit": "تعديل",
  "Delete": "حذف",
  "Save": "حفظ",
  "Category": "الفئة",
  "Description": "الوصف",
};
