import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  getClient: vi.fn(),
}));

vi.mock("@/lib/spree", () => ({
  getClient: mocks.getClient,
}));

import { subscribeToNewsletter } from "@/lib/data/newsletter";

const idleState = { status: "idle", message: "" } as const;

function newsletterForm(email: string): FormData {
  const formData = new FormData();
  formData.set("email", email);
  return formData;
}

describe("subscribeToNewsletter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClient.mockReturnValue({
      newsletterSubscribers: { create: mocks.create },
    });
  });

  it("rejects an invalid email without calling Spree", async () => {
    const result = await subscribeToNewsletter(
      idleState,
      newsletterForm("niepoprawny-adres"),
    );

    expect(result.status).toBe("error");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("normalizes and submits a valid email", async () => {
    mocks.create.mockResolvedValue({ id: "subscriber-1" });

    const result = await subscribeToNewsletter(
      idleState,
      newsletterForm("  KLIENT@EXAMPLE.COM "),
    );

    expect(mocks.create).toHaveBeenCalledWith({ email: "klient@example.com" });
    expect(result.status).toBe("success");
  });

  it("returns a safe message when the API is unavailable", async () => {
    mocks.create.mockRejectedValue(new Error("backend unavailable"));

    const result = await subscribeToNewsletter(
      idleState,
      newsletterForm("klient@example.com"),
    );

    expect(result).toEqual({
      status: "error",
      message: "Nie udało się zapisać adresu. Spróbuj ponownie za chwilę.",
    });
  });
});
