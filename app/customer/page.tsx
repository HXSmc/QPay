import { BrandHeader } from "../components/site/BrandHeader";
import { CustomerView } from "../components/CustomerView";
import { getTable } from "../lib/store";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  searchParams,
}: {
  searchParams: { table?: string };
}) {
  const tableNumber = searchParams.table?.trim() || "12";
  const table = await getTable(tableNumber);
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
      <CustomerView tableNumber={tableNumber} initialTable={table} />
    </div>
  );
}
