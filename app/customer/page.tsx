import { BrandHeader } from "../components/site/BrandHeader";
import { CustomerView } from "../components/CustomerView";
import { getPublicRestaurant, getTableByToken } from "../lib/store";
import { DEFAULT_TAX_RATE } from "../lib/data";
import { C } from "../lib/theme";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; t?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.t?.trim() || "";
  // Resolve by the unique token — the `table` number in the URL is now per-owner
  // and can't identify a table on its own. The token IS the capability.
  const raw = token ? await getTableByToken(token) : null;
  const ok = !!raw;
  const table = ok
    ? (() => {
        const { owner: _o, token: _t, ...rest } = raw;
        void _o;
        void _t;
        return rest;
      })()
    : null;
  // Display the table's own (per-owner) number, falling back to the URL value.
  const tableNumber = table?.num || sp.table?.trim() || "";
  // Non-secret display name + tax rate for the scanned table's restaurant.
  const info = ok ? await getPublicRestaurant(token) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.canvas,
        color: C.text,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <BrandHeader />
      <CustomerView
        tableNumber={tableNumber || "—"}
        token={token}
        initialTable={table}
        restaurant={info?.name || "Restaurant"}
        taxRate={info?.taxRate ?? DEFAULT_TAX_RATE}
      />
    </div>
  );
}
