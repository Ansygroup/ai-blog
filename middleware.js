import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === '/admin/login';
  const isApiRoute = pathname.startsWith('/admin/api/');
  // The NextAuth handler and the OAuth sign-in flow must stay public.
  const isAuthHandler = pathname.startsWith('/admin/api/auth/');

  if (!token && !isLoginPage) {
    if (isApiRoute) {
      // SECURITY: every admin API except the auth handler requires a session.
      // Previously the whole /admin/api/* tree was exempt, letting anyone on
      // the internet trigger GitHub Actions / deploys / data mutations.
      if (!isAuthHandler) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Guard /admin pages AND the /admin/api/* tree (auth handler exempted above).
  matcher: ['/admin', '/admin/((?!login).*)'],
};
