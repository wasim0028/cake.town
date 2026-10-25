"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { AuthResponse } from "@caketown/shared";
import { BakeArt } from "@/components/art/BakeArt";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/form";
import { api } from "@/lib/api";
import { errorsFrom, safeNext } from "@/lib/hooks";
import { toast, useAuth } from "@/lib/stores";
import styles from "./AuthForms.module.css";

export function AuthShell({ title, intro, children, footer }: { title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className={`container ${styles.shell}`}>
      <div className={styles.art} aria-hidden>
        <div className={styles.plateA}>
          <BakeArt name="Red Velvet Cupcakes" category="cupcakes" />
        </div>
        <div className={styles.plateB}>
          <BakeArt name="Butter Croissant" category="pastries" />
        </div>
        <div className={styles.plateC}>
          <BakeArt name="Chocolate Chip Cookies" category="cookies" />
        </div>
      </div>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
        {children}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className={styles.password}>
      <Input {...props} type={show ? "text" : "password"} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className={styles.eye}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function useAuthSubmit() {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuth((s) => s.setUser);
  return (res: AuthResponse, greeting: string) => {
    setUser(res.user);
    toast(greeting, { tone: "success" });
    router.replace(safeNext(params.get("next")));
    router.refresh();
  };
}

/* ---------- login ---------- */

export function LoginForm() {
  const params = useSearchParams();
  const done = useAuthSubmit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({ fields: {} });
    try {
      const res = await api.post<AuthResponse>("/auth/login", { email, password });
      done(res, `Welcome back, ${res.user.name.split(" ")[0]}`);
    } catch (err) {
      setErrors(errorsFrom(err));
    } finally {
      setBusy(false);
    }
  };

  const next = params.get("next");
  return (
    <AuthShell
      title="Welcome back"
      intro="Sign in to check out, track orders and keep your favourites."
      footer={
        <>
          New to caketown?{" "}
          <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-link">
            Create an account
          </Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <Field label="Email" error={errors.fields.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </Field>
        <Field label="Password" error={errors.fields.password}>
          {(p) => <PasswordInput {...p} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </Field>
        <Link href="/forgot-password" className={`text-link ${styles.forgot}`}>
          Forgot your password?
        </Link>
        <FormError>{errors.message}</FormError>
        <Button type="submit" size="lg" block loading={busy}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}

/* ---------- signup ---------- */

export function SignupForm() {
  const params = useSearchParams();
  const done = useAuthSubmit();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({ fields: {} });
    try {
      const res = await api.post<AuthResponse>("/auth/signup", form);
      done(res, `Welcome to caketown, ${res.user.name.split(" ")[0]}!`);
    } catch (err) {
      setErrors(errorsFrom(err));
    } finally {
      setBusy(false);
    }
  };

  const next = params.get("next");
  return (
    <AuthShell
      title="Create your account"
      intro="Save addresses, reorder in two taps, and get 10% off your first order with WELCOME10."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-link">
            Sign in
          </Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <Field label="Your name" error={errors.fields.name}>
          {(p) => <Input {...p} autoComplete="name" value={form.name} onChange={set("name")} required />}
        </Field>
        <Field label="Email" error={errors.fields.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} required />}
        </Field>
        <Field label="Mobile number" hint="For delivery updates. We never share it." error={errors.fields.phone}>
          {(p) => <Input {...p} type="tel" autoComplete="tel-national" inputMode="tel" placeholder="98765 43210" value={form.phone} onChange={set("phone")} required />}
        </Field>
        <div className={styles.pair}>
          <Field label="Password" hint="8+ characters with a letter and a number" error={errors.fields.password}>
            {(p) => <PasswordInput {...p} autoComplete="new-password" value={form.password} onChange={set("password")} required />}
          </Field>
          <Field label="Confirm password" error={errors.fields.confirmPassword}>
            {(p) => <PasswordInput {...p} autoComplete="new-password" value={form.confirmPassword} onChange={set("confirmPassword")} required />}
          </Field>
        </div>
        <FormError>{errors.message}</FormError>
        <Button type="submit" size="lg" block loading={busy}>
          Create account
        </Button>
        <p className="muted small">
          By creating an account you agree to our <Link href="/terms" className="text-link">terms</Link> and{" "}
          <Link href="/privacy" className="text-link">privacy policy</Link>.
        </p>
      </form>
    </AuthShell>
  );
}

/* ---------- forgot / reset password ---------- */

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({ fields: {} });
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setErrors(errorsFrom(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Reset your password" intro="Enter the email you signed up with and we'll send a link to choose a new password." footer={<Link href="/login" className="text-link">Back to sign in</Link>}>
      {sent ? (
        <p className={styles.sent} role="status">
          If {email} has a caketown account, the reset link is on its way. It works for 30 minutes. Check your spam folder if it hasn&rsquo;t arrived in a few minutes.
        </p>
      ) : (
        <form className={styles.form} onSubmit={submit} noValidate>
          <Field label="Email" error={errors.fields.email}>
            {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
          </Field>
          <FormError>{errors.message}</FormError>
          <Button type="submit" size="lg" block loading={busy}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const done = useAuthSubmit();
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ fields: Record<string, string>; message?: string }>({ fields: {} });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({ fields: {} });
    try {
      const res = await api.post<AuthResponse>("/auth/reset-password", { token, password });
      done(res, "Password changed. You're signed in.");
    } catch (err) {
      setErrors(errorsFrom(err));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="This link is incomplete" intro="Open the link from the email again, or request a new one." footer={<Link href="/forgot-password" className="text-link">Request a new link</Link>}>
        <span />
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password" intro="You'll be signed out on your other devices.">
      <form className={styles.form} onSubmit={submit} noValidate>
        <Field label="New password" hint="8+ characters with a letter and a number" error={errors.fields.password}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </Field>
        <FormError>
          {errors.message}
          {errors.message && (
            <>
              {" "}
              <Link href="/forgot-password" className="text-link">
                Request a new link
              </Link>
            </>
          )}
        </FormError>
        <Button type="submit" size="lg" block loading={busy}>
          Save password
        </Button>
      </form>
    </AuthShell>
  );
}
