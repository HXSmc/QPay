import { Sidebar } from "../../components/admin/Sidebar";

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
        background: "#F8FAFC",
        color: "#0B1221",
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>{children}</div>
    </div>
  );
}
