"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/hooks/useT";

/** The multicolour Google "G" mark (lucide-react has no brand icons). Decorative. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.07-1.47-.22-2.12H12v3.85h6.34c-.13 1.03-.82 2.58-2.36 3.62l-.02.14 3.42 2.65.24.02c2.18-2.01 3.44-4.97 3.44-8.16z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.63-2.79l-3.64-2.81c-.97.68-2.28 1.15-3.99 1.15-3.05 0-5.63-2.01-6.55-4.79l-.13.01-3.56 2.75-.05.13C3.61 21.3 7.5 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.45 14.76c-.24-.72-.38-1.49-.38-2.28s.14-1.56.37-2.28l-.01-.15L1.83 7.3l-.12.06A11.99 11.99 0 0 0 .44 12.48c0 1.93.46 3.76 1.27 5.38l3.74-3.1z"
      />
      <path
        fill="#EB4335"
        d="M12 4.75c2.16 0 3.62.93 4.45 1.71l3.25-3.17C17.71 1.19 15.11 0 12 0 7.5 0 3.61 2.7 1.71 6.62l3.73 2.9C6.37 6.76 8.95 4.75 12 4.75z"
      />
    </svg>
  );
}

/**
 * "Continue with Google" — starts the Google OAuth flow. New Google users land on /dashboard and
 * are routed to /onboarding by the tier gate; returning users go straight to their dashboard.
 * Shared by the login and register pages.
 */
export function GoogleAuthButton({ label }: { label: string }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      fullWidth
      loading={loading}
      icon={!loading ? <GoogleMark /> : undefined}
      onClick={() => {
        setLoading(true);
        // Full-page redirect to Google; NextAuth returns to callbackUrl on success.
        void signIn("google", { callbackUrl: "/dashboard" }).catch(() => {
          setLoading(false);
          toast.error(t("Could not start Google sign-in"));
        });
      }}
    >
      {label}
    </Button>
  );
}
