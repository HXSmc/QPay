// Arabic translations for the customer surface. Keyed by English source string.
export const ar: Record<string, string> = {
  // Page-level
  Restaurant: "مطعم",

  // Header
  "Your bill at": "فاتورتك في",
  TABLE: "طاولة",
  "Live bill": "فاتورة مباشرة",
  "other phone paying": "هاتف آخر يدفع",
  "other phones paying": "هواتف أخرى تدفع",

  // Menu / order action buttons
  "View menu": "عرض القائمة",
  "Hide menu": "إخفاء القائمة",
  "Order food": "اطلب طعامًا",
  "Close order": "إغلاق الطلب",
  "Order sent to the kitchen": "تم إرسال الطلب إلى المطبخ",

  // Empty bill
  "No items yet": "لا توجد أصناف بعد",
  "Your server is still adding items to this table. Your bill will appear here shortly.":
    "لا يزال النادل يضيف الأصناف إلى هذه الطاولة. ستظهر فاتورتك هنا قريبًا.",

  // Totals
  "Order summary": "ملخص الطلب",
  Subtotal: "المجموع الفرعي",
  Tax: "الضريبة",
  Total: "الإجمالي",
  "Paid so far": "المدفوع حتى الآن",
  Settled: "تمت التسوية",
  Remaining: "المتبقي",

  // Receipt
  Paid: "مدفوع",
  "Bill fully paid. Thanks!": "تم دفع الفاتورة بالكامل. شكرًا.",
  "Payment received,": "تم استلام الدفعة،",
  remaining: "متبقي",
  "This bill is fully paid. Thank you.": "تم دفع هذه الفاتورة بالكامل. شكرًا لك.",

  // Split
  "How do you want to pay?": "كيف تريد الدفع؟",
  "Pay full": "ادفع كامل المبلغ",
  "Split equally": "تقسيم بالتساوي",
  "Pay per item": "ادفع لكل صنف",
  ea: "للفرد",
  Choose: "اختر",
  "People at the table": "عدد الأشخاص على الطاولة",
  "You're paying for": "تدفع عن",
  "You pay": "أنت تدفع",
  "per person": "لكل شخص",
  ", capped at remaining": "، بحد أقصى المبلغ المتبقي",
  "Fewer people": "عدد أقل من الأشخاص",
  "More people": "عدد أكثر من الأشخاص",
  "Pay for fewer": "الدفع عن عدد أقل",
  "Pay for more": "الدفع عن عدد أكثر",

  // Pay per item
  "Tap the items you're paying for. Paid & held items lock for everyone.":
    "اضغط على الأصناف التي تدفع ثمنها. الأصناف المدفوعة والمحجوزة تكون مقفلة للجميع.",
  "No items selected yet": "لم يتم اختيار أي صنف بعد",
  "item selected": "صنف محدد",
  "items selected": "أصناف محددة",
  ", selected": "، محدد",
  "Remove one": "إزالة واحد",
  "Add one": "إضافة واحد",
  at: "بسعر",
  each: "للوحدة",
  paid: "مدفوع",
  held: "محجوز",
  Held: "محجوز",
  // Whole-sentence templates (placeholders substituted after lookup) instead
  // of gluing translated fragments - Arabic word order/agreement doesn't
  // survive fragment concatenation the way English does.
  "{qty} at {price} each": "{qty} بسعر {price} للوحدة",

  // Tip
  "Add a tip": "أضف إكرامية",
  "No tip": "بدون إكرامية",
  Custom: "مخصص",
  "Custom tip amount": "مبلغ الإكرامية المخصص",
  "custom tip": "إكرامية مخصصة",

  // Pay buttons
  Pay: "ادفع",
  Processing: "جارٍ المعالجة.",
  "Processing.": "جارٍ المعالجة.",
  "Bill fully paid": "تم دفع الفاتورة بالكامل",
  "Select items to pay": "اختر الأصناف للدفع",
  " (your share)": " (حصتك)",
  " (your items)": " (أصنافك)",
  "Secured by Nuqra, 256-bit encryption": "محمي بواسطة Nuqra، تشفير 256-بت",

  // Demo-payment honesty labels (payments are simulated pending SAMA licensing)
  "Demo payment — simulated, no money is charged.":
    "دفع تجريبي — محاكاة فقط، لا يتم خصم أي مبلغ.",
  "Simulated payment — no real money was charged.":
    "دفعة محاكاة — لم يتم خصم أي مبلغ حقيقي.",

  // MenuModal
  Menu: "القائمة",
  "View menu fullscreen": "عرض القائمة بملء الشاشة",
  Fullscreen: "ملء الشاشة",
  "Loading.": "جارٍ التحميل.",
  "No menu uploaded yet": "لم يتم رفع قائمة بعد",
  "The restaurant hasn't added a menu.": "لم يضف المطعم قائمة بعد.",
  "Menu PDF": "قائمة PDF",
  // "Zoom" is the aria-label for the whole zoom control group (distinct from
  // the "Zoom in" button below) - must read differently for screen readers.
  Zoom: "التحكم بالتكبير",
  "Zoom out": "تصغير",
  "Reset zoom": "إعادة ضبط التكبير",
  "Zoom in": "تكبير",
  "Exit fullscreen": "الخروج من ملء الشاشة",

  // OrderModal
  "Add items and any notes for the kitchen.": "أضف الأصناف وأي ملاحظات للمطبخ.",
  "Add a note, e.g. no cheese": "أضف ملاحظة، مثل بدون جبن",
  "Could not place the order. Try again.": "تعذر إرسال الطلب. حاول مرة أخرى.",
  "Choose items to order": "اختر الأصناف للطلب",
  "Place order": "إرسال الطلب",
  item: "صنف",
  items: "أصناف",
  Add: "إضافة",
  // Whole-sentence templates for the "Place order" CTA (see note above on
  // the qty/price template). ceiling: binary singular/plural split only,
  // matches the existing English count===1 ternary - "{count} أصناف" is
  // correct MSA for 3-10 items but not for the dual (2) or 11+ (which need
  // "صنفان" / "صنفًا"). Upgrade to real Arabic numeral-noun agreement if a
  // plural-rules helper is ever added.
  "Place order, {count} item, {total}": "إرسال الطلب، صنف واحد، {total}",
  "Place order, {count} items, {total}": "إرسال الطلب، {count} أصناف، {total}",
};
