import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Nieprawidłowe dane formularza." }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? String((body as { email?: unknown }).email ?? "").trim().toLowerCase()
      : "";

  if (email.length < 5 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ message: "Podaj prawidłowy adres e-mail." }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json(
      { message: "Newsletter nie jest jeszcze skonfigurowany na tym środowisku." },
      { status: 503 },
    );
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/labuco_newsletter_subscribers`,
    {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ email, source: "storefront" }),
      cache: "no-store",
    },
  );

  if (response.ok) {
    return NextResponse.json({ message: "Gotowe. Adres został zapisany." });
  }

  // Unique e-mail is intentional: repeated signup is treated as success from
  // the user's perspective and does not disclose subscriber state elsewhere.
  if (response.status === 409) {
    return NextResponse.json({ message: "Ten adres jest już zapisany." });
  }

  console.error("Newsletter signup failed", response.status, await response.text());
  return NextResponse.json(
    { message: "Nie udało się zapisać adresu. Spróbuj ponownie później." },
    { status: 502 },
  );
}
