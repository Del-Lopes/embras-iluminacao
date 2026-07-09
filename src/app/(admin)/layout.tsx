import { createSupabaseServerClient } from '@/lib/db/supabase-server'
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
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Login page — render without chrome
    return <>{children}</>
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  return (
    <ConfirmProvider>
      <div className="admin-shell">
        <Sidebar
          userName={profile?.full_name ?? 'Admin'}
          userRole={profile?.role ?? 'editor'}
        />
        <main className="admin-main">{children}</main>
        <Toaster />
      </div>
    </ConfirmProvider>
  )
}
