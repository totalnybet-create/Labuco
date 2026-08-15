"use client";

import { Mail } from "lucide-react";
import { useActionState } from "react";
import {
  type NewsletterState,
  subscribeToNewsletter,
} from "@/lib/data/newsletter";

const initialNewsletterState: NewsletterState = {
  status: "idle",
  message: "",
};

export function NewsletterSignup() {
  const [state, formAction, isPending] = useActionState(
    subscribeToNewsletter,
    initialNewsletterState,
  );

  return (
    <div>
      <form className="labuco-newsletter-form" action={formAction}>
        <label className="sr-only" htmlFor="labuco-newsletter-email">
          Twój e-mail
        </label>
        <Mail aria-hidden="true" />
        <input
          id="labuco-newsletter-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Twój e-mail"
          required
          disabled={isPending || state.status === "success"}
        />
        <button
          type="submit"
          aria-label="Zapisz się do newslettera"
          disabled={isPending || state.status === "success"}
        >
          {isPending ? "…" : "→"}
        </button>
      </form>
      <p
        className={`labuco-newsletter-status is-${state.status}`}
        role="status"
        aria-live="polite"
      >
        {state.message}
      </p>
    </div>
  );
}
