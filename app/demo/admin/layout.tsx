// Shared chrome for /demo/admin and every subpage: the locale + branch demo
// state lives here (context provider), and AdminShell renders the sidebar +
// topbar + main content slot. Each route's page.tsx renders into {children}.
// Server component (no hooks of its own — it composes the client AdminDemoProvider
// + AdminShell), so it can export metadata: keep the mock admin out of search
// indexes so it can't outrank the real /admin/login. Rest of /demo stays indexable.

import { AdminDemoProvider, AdminShell } from "./_shared";

export const metadata = { robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminDemoProvider>
      <AdminShell>{children}</AdminShell>
    </AdminDemoProvider>
  );
}
