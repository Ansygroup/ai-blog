import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // let the default redirect happen
  },
  {
    pages: {
      signIn: '/admin/login',
    },
  }
);

export const config = {
  matcher: ['/admin', '/admin/((?!login|api/).*)'],
};
