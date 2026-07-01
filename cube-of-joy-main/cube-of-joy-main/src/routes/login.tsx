import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { loginUser } from "@/lib/selfie-store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Join · Blocks of Brilliance" }],
  }),
  component: LoginPage,
});

const VALID_TLDS = new Set([
  // Global
  'com','net','org','edu','gov','mil','int','info','biz','name','mobi','pro',
  // Country codes
  'in','uk','us','au','de','fr','jp','cn','br','ca','ru','za','sg','ae','nz',
  'mx','it','es','nl','se','no','fi','dk','pl','pt','gr','ch','at','be','cz',
  'hu','ro','tr','th','vn','ph','my','id','pk','lk','np','bd','kw','sa','qa',
  // Tech / startup TLDs
  'io','co','dev','app','tech','ai','me','tv','cc','fm','ac','im',
]);

function isValidEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  if (!/^[^\s@]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(lower)) return false;
  const [local, domain] = lower.split('@');
  if (local.length < 2) return false;
  const parts = domain.split('.');
  if (parts.some(p => p.length < 2)) return false;
  const tld = parts[parts.length - 1];
  return VALID_TLDS.has(tld);
}

function validate(name: string, email: string) {
  const errors: { name?: string; email?: string } = {};
  if (!name.trim()) {
    errors.name = "Name is required.";
  } else if (name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (name.trim().length > 100) {
    errors.name = "Name must be under 100 characters.";
  }

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = validate(name, email);
  const isValid = Object.keys(errors).length === 0;

  function blur(field: 'name' | 'email') {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true });
    if (!isValid) return;
    setLoading(true);
    setServerError(null);
    try {
      await loginUser(name.trim(), email.trim());
      navigate({ to: "/" });
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center px-4"
      style={{
        minHeight: '100dvh',
        backgroundImage: "url('/PHOTOBOOTH_02_background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/50 backdrop-blur-md p-8 shadow-xl">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/titan-logo-63.png" alt="Titan Company" className="h-14 w-auto" />
        </div>

        <h1 className="text-center text-2xl font-bold text-white mb-1">Welcome!</h1>
        <p className="text-center text-sm text-white/60 mb-6">Enter your details to get started</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-white/70 uppercase tracking-wider">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => blur('name')}
              placeholder="Your name"
              className={`rounded-xl border px-4 py-3 text-white placeholder-white/30 outline-none transition bg-white/10
                ${touched.name && errors.name
                  ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400/40'
                  : 'border-white/20 focus:border-white/50 focus:ring-1 focus:ring-white/30'}`}
            />
            {touched.name && errors.name && (
              <p className="text-xs text-red-400 mt-0.5">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-white/70 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => blur('email')}
              placeholder="your@email.com"
              className={`rounded-xl border px-4 py-3 text-white placeholder-white/30 outline-none transition bg-white/10
                ${touched.email && errors.email
                  ? 'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400/40'
                  : 'border-white/20 focus:border-white/50 focus:ring-1 focus:ring-white/30'}`}
            />
            {touched.email && errors.email && (
              <p className="text-xs text-red-400 mt-0.5">{errors.email}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-red-400 text-center">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait…" : "Let's Go →"}
          </button>
        </form>
      </div>
    </div>
  );
}
