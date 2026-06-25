import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  // Protect everything except auth endpoints, the login page, the translate
  // API, and Next.js static assets.
  matcher: [
    "/((?!api/auth|api/translate|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
