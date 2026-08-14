"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useEffect, useRef } from "react";
import { getHotPayReturnStatus } from "@/lib/data/hotpay-status";
import { confirmPaymentAndCompleteCart } from "@/lib/data/payment";
import { extractBasePath } from "@/lib/utils/path";

interface ConfirmPaymentPageProps {
  params: Promise<{
    id: string;
    country: string;
    locale: string;
  }>;
}

/**
 * Intermediate page that offsite payment gateways redirect to.
 *
 * HotPay is special: the browser return is never proof of payment. For HotPay
 * we only poll our own backend until the signed provider notification settles
 * the payment. Other gateways keep their existing confirmation flow.
 */
export default function ConfirmPaymentPage({
  params,
}: ConfirmPaymentPageProps) {
  const { id: cartId } = use(params);
  const t = useTranslations("checkout");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = extractBasePath(pathname);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const isHotPayReturn = searchParams.get("hotpay") === "1";
    const sessionId = searchParams.get("session");
    const sessionResult = searchParams.get("sessionResult");
    const redirectResult = searchParams.get("redirectResult");
    const adyenSessionId = searchParams.get("sessionId");

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, ms));

    async function handleHotPayReturn() {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const status = await getHotPayReturnStatus(cartId);
        if (status.status === "completed") {
          if (status.order) {
            const { cacheCompletedOrder } = await import(
              "@/lib/utils/completed-order-cache"
            );
            cacheCompletedOrder(cartId, status.order);
          }
          router.replace(`${basePath}/order-placed/${cartId}`);
          return;
        }
        if (status.status === "error") break;
        await sleep(750);
      }

      const message = encodeURIComponent(
        "Płatność została przekazana do weryfikacji. Status zamówienia zaktualizuje się po potwierdzeniu HotPay.",
      );
      router.replace(`${basePath}/checkout/${cartId}?payment_error=${message}`);
    }

    async function confirmAndRedirect() {
      if (isHotPayReturn) {
        await handleHotPayReturn();
        return;
      }

      const result = await confirmPaymentAndCompleteCart(
        cartId,
        sessionId ?? undefined,
        sessionResult ?? undefined,
        redirectResult ?? undefined,
        adyenSessionId ?? undefined,
      );

      if (result.success) {
        if (result.order) {
          const { cacheCompletedOrder } = await import(
            "@/lib/utils/completed-order-cache"
          );
          cacheCompletedOrder(cartId, result.order);
        }

        router.replace(`${basePath}/order-placed/${cartId}`);
      } else {
        const errorMessage = encodeURIComponent(
          result.error || t("paymentError"),
        );
        router.replace(
          `${basePath}/checkout/${cartId}?payment_error=${errorMessage}`,
        );
      }
    }

    confirmAndRedirect();
  }, [cartId, searchParams, basePath, router, t]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      <p className="text-sm text-gray-500">{t("confirmingPayment")}</p>
    </div>
  );
}
