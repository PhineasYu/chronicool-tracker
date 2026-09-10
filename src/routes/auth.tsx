import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import portalHero from "@/assets/portal-hero.png";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Dimension-Locked" },
      { name: "description", content: "Sign in to sync your daily schedule streak across dimensions (and devices)." },
      { property: "og:title", content: "Sign in — Dimension-Locked" },
      { property: "og:description", content: "Sign in to sync your daily schedule streak across dimensions (and devices)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await router.invalidate();
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice("Check your email to confirm your account, then sign in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed");
    }
    // On success the browser redirects / session is set — nothing else to do.
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      {/* nebula glows */}
      <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-purple-900/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-primary/10 blur-[120px]" />

      <img
        src={portalHero}
        alt=""
        aria-hidden
        width={1024}
        height={1024}
        className="pointer-events-none absolute -right-24 -top-24 w-80 animate-spin-slow opacity-40"
      />

      <div className="relative w-full max-w-md rounded-3xl border-4 border-border bg-card p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <div className="mb-6 border-b-4 border-primary pb-4">
          <h1 className="font-display text-4xl uppercase tracking-wider text-primary portal-text-glow">
            Dimension-Locked
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Streak Protocol // Sector C-137
          </p>
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary"
              placeholder="morty@c137.earth"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="font-mono text-xs text-destructive">{error}</p>}
          {notice && <p className="font-mono text-xs text-neon">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary py-2.5 font-display text-xl uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {busy ? "Opening portal…" : mode === "signin" ? "Enter the portal" : "Create account"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full rounded-xl border-2 border-border bg-secondary py-2.5 font-mono text-sm text-secondary-foreground transition-colors hover:border-primary"
        >
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 w-full text-center font-mono text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
        </button>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            ← back to the lab
          </Link>
        </p>
      </div>
    </div>
  );
}
