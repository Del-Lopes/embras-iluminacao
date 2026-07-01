import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
