import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminOnlyPath, FALLBACK_PATH } from '@/lib/auth/permissions'

export const middleware = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: true,     // VULN-004: prevent JS access to session cookies
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            })
          )
        },
      },
    }
  )

  // IMPORTANT: never call supabase.auth.getSession() here.
  // getUser() validates the token with the Supabase Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/admin/login'

  // Redirect authenticated users away from login → área padrão (Produtos)
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/admin/products', request.url))
  }

  // Redirect /admin (exact) → área padrão (Produtos) quando autenticado
  if (pathname === '/admin' || pathname === '/admin/') {
    const target = user ? '/admin/products' : '/admin/login'
    return NextResponse.redirect(new URL(target, request.url))
  }

  // Protect all /admin/* except /admin/login
  if (!user && !isLoginPage && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Perfil: papel + status. Uma busca por chave primária por navegação
  // no admin — o preço de "desativado" significar alguma coisa de fato.
  if (user && !isLoginPage && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    // Conta desativada (ou perfil sumido) com sessão ainda válida no
    // cookie: encerra a sessão em vez de só redirecionar. Sem isso o
    // middleware devolveria para /admin/login, que por já ter usuário
    // autenticado manda de volta para /admin/products — um laço.
    if (!profile || !profile.is_active) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      for (const cookie of request.cookies.getAll()) {
        if (cookie.name.startsWith('sb-')) response.cookies.delete(cookie.name)
      }
      return response
    }

    if (profile.role !== 'admin' && isAdminOnlyPath(pathname)) {
      return NextResponse.redirect(new URL(FALLBACK_PATH, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
