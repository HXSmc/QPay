import { CustomerView } from "../components/CustomerView";

export const dynamic = "force-dynamic";

export default function CustomerPage({
  searchParams,
}: {
  searchParams: { table?: string };
}) {
  const tableNumber = searchParams.table?.trim() || "12";
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F1F5F9",
        color: "#0B1221",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <CustomerView tableNumber={tableNumber} />
    </div>
  );
}
