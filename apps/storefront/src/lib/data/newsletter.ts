"use server";

import { getClient } from "@/lib/spree";

export interface NewsletterState {
  status: "idle" | "success" | "error";
  message: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeToNewsletter(
  _previousState: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const value = formData.get("email");
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return {
      status: "error",
      message: "Podaj poprawny adres e-mail.",
    };
  }

  try {
    await getClient().newsletterSubscribers.create({ email });
    return {
      status: "success",
      message: "Dziękujemy — adres został zapisany.",
    };
  } catch (error) {
    console.error("Newsletter subscription failed", error);
    return {
      status: "error",
      message: "Nie udało się zapisać adresu. Spróbuj ponownie za chwilę.",
    };
  }
}
