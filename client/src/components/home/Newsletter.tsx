"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/lib/stores";
import styles from "./Sections.module.css";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/newsletter", { email });
      setDone(true);
      toast("You're subscribed", { body: "The next weekly menu lands on Friday morning.", tone: "success" });
    } catch (err) {
      setError(err instanceof ApiError ? (err.details?.email?.[0] ?? err.message) : "Couldn't subscribe. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`section ${styles.newsletter}`} aria-labelledby="newsletter">
      <div className={`container ${styles.newsletterInner}`}>
        <div>
          <h2 id="newsletter">This week&rsquo;s bakes, every Friday</h2>
          <p className="muted">One short email: the weekend specials, new class dates and the odd recipe. Unsubscribe any time.</p>
        </div>
        {done ? (
          <p className={styles.subscribed} role="status">
            Subscribed with {email}. See you on Friday.
          </p>
        ) : (
          <form className={styles.form} onSubmit={submit} noValidate>
            <label htmlFor="nl-email" className="visually-hidden">
              Email address
            </label>
            <input
              id="nl-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "nl-error" : undefined}
              required
              className={styles.input}
            />
            <Button type="submit" loading={busy}>
              Subscribe
            </Button>
            {error && (
              <p id="nl-error" className={styles.error}>
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
