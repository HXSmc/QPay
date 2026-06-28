import { Sidebar } from "../../components/admin/Sidebar";
import { C } from "../../lib/theme";

export default function AdminDashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="qp-admin-shell"
      style={{
        display: "flex",
        background: C.canvas,
        color: C.text,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>{children}</div>
    </div>
  );
}
