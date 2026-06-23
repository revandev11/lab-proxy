"use client";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({
  children,
  allowedRoles = null, // e.g. ['ADMIN'] or ['USER','ADMIN']
  redirectTo = "/auth",
  forbiddenComponent = null,
}) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();

  // Re-verify token with backend when entering a protected route.
  // If the backend responds 401/invalid, force logout and redirect.
  // Client-side re-validation moved to server proxy; no fetch here anymore.

  // Redirect unauthenticated users after loading completes
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const role = user?.role;
      if (!role || !allowedRoles.includes(role)) {
        // If a forbidden UI is provided, stay and render it; otherwise redirect home
        if (!forbiddenComponent) router.push("/");
      }
    }
  }, [loading, isAuthenticated, user, allowedRoles, router, redirectTo, forbiddenComponent]);

  if (loading) return null;

  if (!isAuthenticated) return null; // redirecting

  if (allowedRoles && allowedRoles.length > 0) {
    const role = user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return (
        <>
          {forbiddenComponent || (
            <div className="p-6">
              <h2 className="text-lg font-bold">Forbidden</h2>
              <p className="text-sm text-muted">You do not have access to this page.</p>
            </div>
          )}
        </>
      );
    }
  }

  return <>{children}</>;
}
