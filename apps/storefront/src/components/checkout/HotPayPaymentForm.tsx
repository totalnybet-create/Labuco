"use client";

import { ExternalLink, LockKeyhole } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export interface HotPayPaymentFormHandle {
  confirmPayment: (returnUrl: string) => Promise<{ error?: string }>;
  fetchUpdates: () => Promise<void>;
}

interface HotPayPaymentFormProps {
  paymentUrl: string;
  onReady: (handle: HotPayPaymentFormHandle) => void;
}

export function HotPayPaymentForm({
  paymentUrl,
  onReady,
}: HotPayPaymentFormProps) {
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const confirmPayment = useCallback(
    async (_returnUrl: string): Promise<{ error?: string }> => {
      try {
        const url = new URL(paymentUrl);
        if (url.protocol !== "https:" || !url.hostname.endsWith("hotpay.pl")) {
          return { error: "Nieprawidłowy adres płatności HotPay." };
        }
        window.location.assign(url.toString());
        return {};
      } catch {
        return { error: "Nie udało się otworzyć płatności HotPay." };
      }
    },
    [paymentUrl],
  );

  useEffect(() => {
    onReadyRef.current({
      confirmPayment,
      fetchUpdates: async () => {},
    });
  }, [confirmPayment]);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-gray-700" />
        <div>
          <p className="text-sm font-semibold text-gray-900">
            BLIK i szybki przelew przez HotPay
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Po kliknięciu przycisku zamówienia przejdziesz do zabezpieczonego
            panelu HotPay, gdzie wybierzesz BLIK lub swój bank.
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
            Bezpieczne przekierowanie
            <ExternalLink className="h-3 w-3" />
          </p>
        </div>
      </div>
    </div>
  );
}
