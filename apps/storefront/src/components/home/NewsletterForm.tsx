"use client";

import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Nie udało się zapisać adresu.");
      }

      setStatus("success");
      setMessage(payload.message || "Adres został zapisany.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Nie udało się zapisać adresu.",
      );
    }
  };

  return (
    <div>
      <form className="labuco-newsletter-form" onSubmit={submit}>
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
          value={email}
          required
          disabled={status === "loading"}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button
          type="submit"
          aria-label="Zapisz się do newslettera"
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : status === "success" ? (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          ) : (
            "→"
          )}
        </button>
      </form>
      {message && (
        <p
          className="mt-2 text-sm"
          role="status"
          aria-live="polite"
          data-status={status}
        >
          {message}
        </p>
      )}
    </div>
  );
}
