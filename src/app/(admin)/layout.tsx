import { getSessionUser } from '@/lib/auth/guards'
import { Sidebar } from '@/components/admin/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { ConfirmProvider } from '@/components/ui/confirm-dialog'

// Layout for the (admin) route group.
// Strategy:
//   - No session  → render children only (login page, no sidebar)
//   - Session exists → validate role → render sidebar shell + children
//
// Middleware already redirects unauthenticated users to /admin/login,
// so "no session" in this layout only occurs on the login page itself.

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionUser()

  if (!session) {
    // Login page — render without chrome
    return <>{children}</>
  }

  return (
    <ConfirmProvider>
      <div className="admin-shell">
        <Sidebar
          userName={session.fullName}
          userEmail={session.email}
          userRole={session.role}
        />
        <main className="admin-main">{children}</main>
        <Toaster />
      </div>
    </ConfirmProvider>
  )
}
