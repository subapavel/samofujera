import { NextResponse } from "next/server";

// Session cookie lives on the API domain (cross-origin), so middleware
// cannot see it. Auth protection is handled client-side by AuthGuard
// which calls the API with credentials: "include".
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|api).*)",
  ],
};
