"use client";

// Shared chrome for /demo/admin and every subpage: the locale + branch demo
// state lives here (context provider), and AdminShell renders the sidebar +
// topbar + main content slot. Each route's page.tsx renders into {children}.

import { AdminDemoProvider, AdminShell } from "./_shared";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminDemoProvider>
      <AdminShell>{children}</AdminShell>
    </AdminDemoProvider>
  );
}
