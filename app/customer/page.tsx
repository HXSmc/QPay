import { BrandHeader } from "../components/site/BrandHeader";
import { CustomerView } from "../components/CustomerView";
import { getTable } from "../lib/store";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  searchParams,
}: {
  searchParams: { table?: string; t?: string };
}) {
  const tableNumber = searchParams.table?.trim() || "";
  const token = searchParams.t?.trim() || "";
  const raw = tableNumber ? await getTable(tableNumber) : null;
  // Only hand the table to the client if the QR capability token matches; never
  // leak the owner id or the token itself into the client payload.
  const ok = raw && token && raw.token === token;
  const table = ok
    ? (() => {
        const { owner: _o, token: _t, ...rest } = raw;
        void _o;
        void _t;
        return rest;
      })()
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F1F5F9",
        color: "#0B1221",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <BrandHeader />
      <CustomerView
        tableNumber={tableNumber || "—"}
        token={token}
        initialTable={table}
      />
    </div>
  );
}
