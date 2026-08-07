// Shared mock data for the immersive demo surfaces (landing hero content,
// /demo/customer, /demo/admin, /demo/branch). One typed source instead of each
// builder inventing its own numbers — keeps the four surfaces telling the same
// story about the same restaurant. Pure data + types, no JSX, no side effects.
//
// Flavor: "Lumah Pizza" — a fictional multi-branch restaurant, Dhahran
// (Eastern Province, KSA). Two more branches (Al Khobar, Dammam) round out
// the multi-branch admin view. All names/prices/timestamps are invented mock
// content, not real business data. Settings identifiers shown in the admin
// demo (ZATCA/VAT/branch IDs) are invented placeholders too — structurally
// shaped like the real format but checksum-invalid, never a real taxpayer.

export interface Bilingual {
  en: string;
  ar: string;
}

// --- Restaurant --------------------------------------------------------------

export const RESTAURANT = {
  name: { en: "Lumah Pizza", ar: "لُمة بيتزا" } satisfies Bilingual,
  legalName: "Lumah Pizza Co.",
  posIntegration: "Foodics" as const,
};

// --- Branches ------------------------------------------------------------

export type PlanTier = "Starter" | "Growth" | "Scale";

export interface Branch {
  id: string;
  name: Bilingual;
  city: Bilingual;
  address: Bilingual;
  tier: PlanTier;
  tableCount: number;
  isPilot?: boolean;
}

export const BRANCHES: Branch[] = [
  {
    id: "br_dhahran",
    name: { en: "Dhahran — Corniche", ar: "الظهران — الكورنيش" },
    city: { en: "Dhahran", ar: "الظهران" },
    address: { en: "Prince Mohammed bin Fahd Rd, Dhahran", ar: "طريق الأمير محمد بن فهد، الظهران" },
    tier: "Growth",
    tableCount: 14,
    isPilot: true,
  },
  {
    id: "br_khobar",
    name: { en: "Al Khobar — Corniche", ar: "الخبر — الكورنيش" },
    city: { en: "Al Khobar", ar: "الخبر" },
    address: { en: "King Faisal St, Al Khobar", ar: "شارع الملك فيصل، الخبر" },
    tier: "Starter",
    tableCount: 8,
  },
  {
    id: "br_dammam",
    name: { en: "Dammam — Al Shatea", ar: "الدمام — الشاطئ" },
    city: { en: "Dammam", ar: "الدمام" },
    address: { en: "Al Shatea District, Dammam", ar: "حي الشاطئ، الدمام" },
    tier: "Scale",
    tableCount: 22,
  },
];

// --- Pricing tiers (matches the marketing pricing table) --------------------

export const PRICING_TIERS: { tier: PlanTier; priceSar: number; popular?: boolean }[] = [
  { tier: "Starter", priceSar: 299 },
  { tier: "Growth", priceSar: 699, popular: true },
  { tier: "Scale", priceSar: 1499 },
];

// --- Tables ------------------------------------------------------------------

export type TableState =
  | "available"
  | "seated"
  | "ordered"
  | "bill_requested"
  | "paying"
  | "paid"
  | "cleaning";

export interface Table {
  id: string;
  branchId: string;
  number: number;
  seats: number;
  state: TableState;
  guests?: number;
  openedAt?: string; // ISO timestamp, only set once seated
  currentTotalSar?: number;
}

export const TABLES: Table[] = [
  { id: "t_dh_1", branchId: "br_dhahran", number: 1, seats: 2, state: "available" },
  { id: "t_dh_2", branchId: "br_dhahran", number: 2, seats: 4, state: "seated", guests: 3, openedAt: "2026-08-07T18:12:00+03:00" },
  { id: "t_dh_3", branchId: "br_dhahran", number: 3, seats: 4, state: "ordered", guests: 4, openedAt: "2026-08-07T17:48:00+03:00", currentTotalSar: 168 },
  { id: "t_dh_4", branchId: "br_dhahran", number: 4, seats: 2, state: "cleaning" },
  { id: "t_dh_5", branchId: "br_dhahran", number: 5, seats: 6, state: "bill_requested", guests: 6, openedAt: "2026-08-07T17:10:00+03:00", currentTotalSar: 312 },
  { id: "t_dh_6", branchId: "br_dhahran", number: 6, seats: 2, state: "available" },
  { id: "t_dh_7", branchId: "br_dhahran", number: 7, seats: 4, state: "paying", guests: 2, openedAt: "2026-08-07T18:02:00+03:00", currentTotalSar: 94 },
  { id: "t_dh_8", branchId: "br_dhahran", number: 8, seats: 4, state: "seated", guests: 4, openedAt: "2026-08-07T18:20:00+03:00" },
  { id: "t_dh_9", branchId: "br_dhahran", number: 9, seats: 2, state: "paid", guests: 2, openedAt: "2026-08-07T16:40:00+03:00", currentTotalSar: 77.49 },
  { id: "t_dh_10", branchId: "br_dhahran", number: 10, seats: 8, state: "ordered", guests: 7, openedAt: "2026-08-07T17:30:00+03:00", currentTotalSar: 486 },
  { id: "t_dh_11", branchId: "br_dhahran", number: 11, seats: 2, state: "available" },
  { id: "t_dh_12", branchId: "br_dhahran", number: 12, seats: 4, state: "seated", guests: 4, openedAt: "2026-08-07T18:25:00+03:00" },
  { id: "t_dh_13", branchId: "br_dhahran", number: 13, seats: 4, state: "available" },
  { id: "t_dh_14", branchId: "br_dhahran", number: 14, seats: 6, state: "bill_requested", guests: 5, openedAt: "2026-08-07T17:22:00+03:00", currentTotalSar: 227 },
];

// --- Menu ---------------------------------------------------------------------

export interface MenuCategory {
  id: string;
  name: Bilingual;
}

export const MENU_CATEGORIES: MenuCategory[] = [
  { id: "cat_pizza", name: { en: "Pizzas", ar: "بيتزا" } },
  { id: "cat_sides", name: { en: "Sides & Salads", ar: "الأطباق الجانبية والسلطات" } },
  { id: "cat_desserts", name: { en: "Desserts", ar: "الحلويات" } },
  { id: "cat_drinks", name: { en: "Drinks", ar: "المشروبات" } },
];

export interface MenuItem {
  id: string;
  categoryId: string;
  name: Bilingual;
  description: Bilingual;
  priceSar: number;
  spicy?: boolean;
  popular?: boolean;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "mi_margherita",
    categoryId: "cat_pizza",
    name: { en: "Margherita", ar: "مارغريتا" },
    description: { en: "San Marzano tomato, fior di latte, basil", ar: "طماطم سان مارزانو، جبن فيور دي لاتيه، ريحان" },
    priceSar: 42,
    popular: true,
  },
  {
    id: "mi_pepperoni",
    categoryId: "cat_pizza",
    name: { en: "Double Pepperoni", ar: "بيبروني مضاعف" },
    description: { en: "Beef pepperoni, mozzarella, oregano", ar: "بيبروني لحم بقري، موزاريلا، أوريجانو" },
    priceSar: 49,
    popular: true,
  },
  {
    id: "mi_bbq_chicken",
    categoryId: "cat_pizza",
    name: { en: "BBQ Chicken", ar: "دجاج باربكيو" },
    description: { en: "Grilled chicken, red onion, smoked BBQ sauce", ar: "دجاج مشوي، بصل أحمر، صلصة باربكيو مدخنة" },
    priceSar: 47,
    spicy: true,
  },
  {
    id: "mi_four_cheese",
    categoryId: "cat_pizza",
    name: { en: "Four Cheese", ar: "أربعة أجبان" },
    description: { en: "Mozzarella, gorgonzola, parmesan, provolone", ar: "موزاريلا، غورغونزولا، بارميزان، بروفولوني" },
    priceSar: 52,
  },
  {
    id: "mi_truffle_mushroom",
    categoryId: "cat_pizza",
    name: { en: "Truffle Mushroom", ar: "فطر بالكمأة" },
    description: { en: "Wild mushroom, truffle oil, thyme, pecorino", ar: "فطر بري، زيت الكمأة، زعتر، بيكورينو" },
    priceSar: 59,
  },
  {
    id: "mi_garlic_bread",
    categoryId: "cat_sides",
    name: { en: "Garlic Bread", ar: "خبز بالثوم" },
    description: { en: "Wood-fired dough, garlic butter, parsley", ar: "عجينة مخبوزة على الحطب، زبدة بالثوم، بقدونس" },
    priceSar: 18,
  },
  {
    id: "mi_caesar_salad",
    categoryId: "cat_sides",
    name: { en: "Caesar Salad", ar: "سلطة سيزر" },
    description: { en: "Romaine, parmesan, sourdough croutons", ar: "خس روماني، بارميزان، مكعبات خبز العجين المخمر" },
    priceSar: 26,
  },
  {
    id: "mi_arancini",
    categoryId: "cat_sides",
    name: { en: "Arancini", ar: "أرانشيني" },
    description: { en: "Saffron risotto balls, mozzarella core", ar: "كرات ريزوتو بالزعفران، بقلب موزاريلا" },
    priceSar: 24,
  },
  {
    id: "mi_tiramisu",
    categoryId: "cat_desserts",
    name: { en: "Tiramisu", ar: "تيراميسو" },
    description: { en: "Espresso-soaked sponge, mascarpone", ar: "إسفنجية منقوعة بالإسبريسو، جبن ماسكاربوني" },
    priceSar: 22,
  },
  {
    id: "mi_nutella_calzone",
    categoryId: "cat_desserts",
    name: { en: "Nutella Calzone", ar: "كالزوني نوتيلا" },
    description: { en: "Folded dough, hazelnut spread, powdered sugar", ar: "عجينة مطوية، كريمة البندق، سكر بودرة" },
    priceSar: 25,
    popular: true,
  },
  {
    id: "mi_soft_drink",
    categoryId: "cat_drinks",
    name: { en: "Soft Drink", ar: "مشروب غازي" },
    description: { en: "330ml can", ar: "علبة ٣٣٠ مل" },
    priceSar: 9,
  },
  {
    id: "mi_sparkling_water",
    categoryId: "cat_drinks",
    name: { en: "Sparkling Water", ar: "مياه فوارة" },
    description: { en: "500ml bottle", ar: "زجاجة ٥٠٠ مل" },
    priceSar: 11,
  },
  {
    id: "mi_fresh_lemonade",
    categoryId: "cat_drinks",
    name: { en: "Fresh Lemonade & Mint", ar: "ليمون بالنعناع الطازج" },
    description: { en: "House-pressed, no added sugar", ar: "معصور طازجًا بدون سكر مضاف" },
    priceSar: 15,
    popular: true,
  },
];

// --- Live orders ---------------------------------------------------------

export interface OrderLineItem {
  menuItemId: string;
  qty: number;
}

export interface Order {
  id: string;
  branchId: string;
  tableId: string;
  status: "open" | "sent" | "preparing" | "served" | "closed";
  items: OrderLineItem[];
  openedAt: string;
  guests: number;
}

export const ORDERS: Order[] = [
  {
    id: "ord_3001",
    branchId: "br_dhahran",
    tableId: "t_dh_3",
    status: "preparing",
    items: [
      { menuItemId: "mi_pepperoni", qty: 2 },
      { menuItemId: "mi_garlic_bread", qty: 1 },
      { menuItemId: "mi_soft_drink", qty: 4 },
    ],
    openedAt: "2026-08-07T17:48:00+03:00",
    guests: 4,
  },
  {
    id: "ord_3002",
    branchId: "br_dhahran",
    tableId: "t_dh_5",
    status: "served",
    items: [
      { menuItemId: "mi_margherita", qty: 2 },
      { menuItemId: "mi_bbq_chicken", qty: 1 },
      { menuItemId: "mi_caesar_salad", qty: 2 },
      { menuItemId: "mi_tiramisu", qty: 3 },
      { menuItemId: "mi_fresh_lemonade", qty: 6 },
    ],
    openedAt: "2026-08-07T17:10:00+03:00",
    guests: 6,
  },
  {
    id: "ord_3003",
    branchId: "br_dhahran",
    tableId: "t_dh_7",
    status: "served",
    items: [
      { menuItemId: "mi_four_cheese", qty: 1 },
      { menuItemId: "mi_sparkling_water", qty: 2 },
    ],
    openedAt: "2026-08-07T18:02:00+03:00",
    guests: 2,
  },
  {
    id: "ord_3004",
    branchId: "br_dhahran",
    tableId: "t_dh_10",
    status: "sent",
    items: [
      { menuItemId: "mi_truffle_mushroom", qty: 2 },
      { menuItemId: "mi_pepperoni", qty: 2 },
      { menuItemId: "mi_arancini", qty: 3 },
      { menuItemId: "mi_nutella_calzone", qty: 2 },
      { menuItemId: "mi_fresh_lemonade", qty: 7 },
    ],
    openedAt: "2026-08-07T17:30:00+03:00",
    guests: 7,
  },
  {
    id: "ord_3005",
    branchId: "br_dhahran",
    tableId: "t_dh_14",
    status: "served",
    items: [
      { menuItemId: "mi_bbq_chicken", qty: 2 },
      { menuItemId: "mi_four_cheese", qty: 1 },
      { menuItemId: "mi_garlic_bread", qty: 2 },
      { menuItemId: "mi_soft_drink", qty: 5 },
    ],
    openedAt: "2026-08-07T17:22:00+03:00",
    guests: 5,
  },
];

// --- Transactions --------------------------------------------------------

export type PaymentMethod = "mada" | "visa" | "applepay" | "stcpay";
export type SplitType = "even" | "by_item" | "full";

export interface Transaction {
  id: string;
  branchId: string;
  tableNumber: number;
  method: PaymentMethod;
  amountSar: number;
  tipSar: number;
  splitType: SplitType;
  guestsSplit: number;
  status: "completed" | "refunded" | "pending";
  timestamp: string;
}

export const TRANSACTIONS: Transaction[] = [
  { id: "txn_9001", branchId: "br_dhahran", tableNumber: 9, method: "applepay", amountSar: 77.49, tipSar: 7.49, splitType: "full", guestsSplit: 1, status: "completed", timestamp: "2026-08-07T17:02:00+03:00" },
  { id: "txn_9002", branchId: "br_dhahran", tableNumber: 2, method: "mada", amountSar: 156.0, tipSar: 12.0, splitType: "even", guestsSplit: 3, status: "completed", timestamp: "2026-08-07T16:44:00+03:00" },
  { id: "txn_9003", branchId: "br_khobar", tableNumber: 4, method: "visa", amountSar: 214.5, tipSar: 0, splitType: "full", guestsSplit: 1, status: "completed", timestamp: "2026-08-07T16:20:00+03:00" },
  { id: "txn_9004", branchId: "br_dammam", tableNumber: 11, method: "stcpay", amountSar: 98.0, tipSar: 10.0, splitType: "by_item", guestsSplit: 2, status: "completed", timestamp: "2026-08-07T15:58:00+03:00" },
  { id: "txn_9005", branchId: "br_dhahran", tableNumber: 6, method: "mada", amountSar: 63.0, tipSar: 5.0, splitType: "even", guestsSplit: 2, status: "completed", timestamp: "2026-08-07T15:31:00+03:00" },
  { id: "txn_9006", branchId: "br_dammam", tableNumber: 3, method: "applepay", amountSar: 340.0, tipSar: 25.0, splitType: "by_item", guestsSplit: 5, status: "completed", timestamp: "2026-08-07T14:55:00+03:00" },
  { id: "txn_9007", branchId: "br_khobar", tableNumber: 1, method: "visa", amountSar: 41.0, tipSar: 0, splitType: "full", guestsSplit: 1, status: "refunded", timestamp: "2026-08-07T14:10:00+03:00" },
  { id: "txn_9008", branchId: "br_dhahran", tableNumber: 8, method: "stcpay", amountSar: 129.0, tipSar: 9.0, splitType: "even", guestsSplit: 4, status: "pending", timestamp: "2026-08-07T18:21:00+03:00" },
];

// --- Analytics timeseries (14 days, Dhahran pilot branch) --------------------

export interface AnalyticsPoint {
  date: string; // YYYY-MM-DD
  revenueSar: number;
  orders: number;
  avgTicketSar: number;
  avgTurnMinutes: number;
}

export const ANALYTICS_DHAHRAN: AnalyticsPoint[] = [
  { date: "2026-07-25", revenueSar: 6210, orders: 84, avgTicketSar: 73.9, avgTurnMinutes: 52 },
  { date: "2026-07-26", revenueSar: 6840, orders: 91, avgTicketSar: 75.2, avgTurnMinutes: 51 },
  { date: "2026-07-27", revenueSar: 5980, orders: 79, avgTicketSar: 75.7, avgTurnMinutes: 50 },
  { date: "2026-07-28", revenueSar: 7120, orders: 95, avgTicketSar: 74.9, avgTurnMinutes: 47 },
  { date: "2026-07-29", revenueSar: 7460, orders: 98, avgTicketSar: 76.1, avgTurnMinutes: 45 },
  { date: "2026-07-30", revenueSar: 8330, orders: 108, avgTicketSar: 77.1, avgTurnMinutes: 43 },
  { date: "2026-07-31", revenueSar: 9120, orders: 117, avgTicketSar: 77.9, avgTurnMinutes: 41 },
  { date: "2026-08-01", revenueSar: 7040, orders: 92, avgTicketSar: 76.5, avgTurnMinutes: 42 },
  { date: "2026-08-02", revenueSar: 7280, orders: 95, avgTicketSar: 76.6, avgTurnMinutes: 41 },
  { date: "2026-08-03", revenueSar: 7690, orders: 99, avgTicketSar: 77.7, avgTurnMinutes: 40 },
  { date: "2026-08-04", revenueSar: 8010, orders: 103, avgTicketSar: 77.8, avgTurnMinutes: 39 },
  { date: "2026-08-05", revenueSar: 8640, orders: 110, avgTicketSar: 78.5, avgTurnMinutes: 38 },
  { date: "2026-08-06", revenueSar: 9480, orders: 121, avgTicketSar: 78.3, avgTurnMinutes: 36 },
  { date: "2026-08-07", revenueSar: 10120, orders: 129, avgTicketSar: 78.4, avgTurnMinutes: 35 },
];

/** Per-branch month-to-date summary — the admin cross-branch comparison strip. */
export interface BranchSummary {
  branchId: string;
  revenueMtdSar: number;
  tableTurnsToday: number;
  avgTipPct: number;
}

export const BRANCH_SUMMARIES: BranchSummary[] = [
  { branchId: "br_dhahran", revenueMtdSar: 148600, tableTurnsToday: 5.2, avgTipPct: 11.4 },
  { branchId: "br_khobar", revenueMtdSar: 61200, tableTurnsToday: 3.8, avgTipPct: 9.1 },
  { branchId: "br_dammam", revenueMtdSar: 203400, tableTurnsToday: 4.6, avgTipPct: 10.7 },
];

// --- Staff ---------------------------------------------------------------

export interface StaffMember {
  id: string;
  name: Bilingual;
  role: "owner" | "branch_manager" | "server" | "cashier";
  branchId?: string; // absent = all branches (owner)
  status: "active" | "invited";
}

export const STAFF: StaffMember[] = [
  { id: "stf_1", name: { en: "Faisal Al-Rashid", ar: "فيصل الرشيد" }, role: "owner", status: "active" },
  { id: "stf_2", name: { en: "Hessa Al-Sulaiman", ar: "حصة السليمان" }, role: "branch_manager", branchId: "br_dhahran", status: "active" },
  { id: "stf_3", name: { en: "Turki Al-Ghanim", ar: "تركي الغانم" }, role: "branch_manager", branchId: "br_khobar", status: "active" },
  { id: "stf_4", name: { en: "Sara Al-Harbi", ar: "سارة الحربي" }, role: "branch_manager", branchId: "br_dammam", status: "active" },
  { id: "stf_5", name: { en: "Omar Al-Ghamdi", ar: "عمر الغامدي" }, role: "server", branchId: "br_dhahran", status: "active" },
  { id: "stf_6", name: { en: "Lama Al-Zahrani", ar: "لمى الزهراني" }, role: "server", branchId: "br_dhahran", status: "active" },
  { id: "stf_7", name: { en: "Khalid Al-Shehri", ar: "خالد الشهري" }, role: "cashier", branchId: "br_dhahran", status: "active" },
  { id: "stf_8", name: { en: "Rana Al-Mutairi", ar: "رنا المطيري" }, role: "server", branchId: "br_khobar", status: "invited" },
];
