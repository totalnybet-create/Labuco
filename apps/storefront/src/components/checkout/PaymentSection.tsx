"use client";

import type {
  AddressParams,
  Cart,
  Country,
  PaymentMethod,
  CreditCard as SpreeCreditCard,
  State,
} from "@spree/sdk";
import { CircleAlert, CreditCard, Info, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import { AddressFormFields } from "@/components/checkout/AddressFormFields";
import {
  AdyenPaymentForm,
  type AdyenPaymentFormHandle,
} from "@/components/checkout/AdyenPaymentForm";
import {
  HotPayPaymentForm,
  type HotPayPaymentFormHandle,
} from "@/components/checkout/HotPayPaymentForm";
import {
  PayPalPaymentForm,
  type PayPalPaymentFormHandle,
} from "@/components/checkout/PayPalPaymentForm";
import {
  confirmWithSavedCard,
  StripePaymentForm,
  type StripePaymentFormHandle,
} from "@/components/checkout/StripePaymentForm";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCountryStates } from "@/hooks/useCountryStates";
import { getCreditCards } from "@/lib/data/credit-cards";
import {
  createCheckoutPaymentSession,
  createDirectPayment,
  updateCheckoutPaymentSession,
} from "@/lib/data/payment";
import {
  type AddressFormData,
  addressToFormData,
  formDataToAddress,
  updateAddressField,
} from "@/lib/utils/address";
import { getCardIconType, getCardLabel } from "@/lib/utils/credit-card";
import { extractBasePath } from "@/lib/utils/path";
import { resolveGatewayId } from "@/lib/utils/payment-gateway";

export type PaymentCompleteResult =
  | { type: "session"; sessionId: string; sessionResult?: string }
  | { type: "direct" };

export interface PaymentSectionHandle {
  submit: () => Promise<{ error?: string }>;
}

interface PaymentSectionProps {
  ref?: Ref<PaymentSectionHandle>;
  cart: Cart;
  countries: Country[];
  isAuthenticated: boolean;
  fetchStates: (countryIso: string) => Promise<State[]>;
  onUpdateBillingAddress: (data: {
    billing_address?: AddressParams;
    use_shipping?: boolean;
  }) => Promise<boolean>;
  onPaymentComplete: (result: PaymentCompleteResult) => Promise<void>;
  processing: boolean;
  setProcessing: (processing: boolean) => void;
  onSessionMethodChange?: (isSessionBased: boolean) => void;
  errors?: string[];
}

type GatewayHandle =
  | StripePaymentFormHandle
  | AdyenPaymentFormHandle
  | PayPalPaymentFormHandle
  | HotPayPaymentFormHandle;

export function PaymentSection({
  ref,
  cart,
  countries,
  isAuthenticated,
  fetchStates,
  onUpdateBillingAddress,
  onPaymentComplete,
  processing,
  setProcessing,
  onSessionMethodChange,
  errors,
}: PaymentSectionProps) {
  const t = useTranslations("checkout");

  const paymentMethods = cart.payment_methods ?? [];
  const hasMultipleMethods = paymentMethods.length > 1;

  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    () => paymentMethods[0]?.id ?? "",
  );
  const selectedMethod: PaymentMethod | undefined =
    paymentMethods.find((pm) => pm.id === selectedMethodId) ??
    paymentMethods[0];
  const effectiveSelectedMethodId = selectedMethod?.id ?? "";

  const rawAmountDue = cart.amount_due ?? cart.total;
  const amountDue =
    rawAmountDue == null ? Number.NaN : parseFloat(rawAmountDue);
  const isZeroAmount = Number.isFinite(amountDue) && amountDue === 0;
  const isSessionBased =
    !isZeroAmount && (selectedMethod?.session_required ?? false);

  const onSessionMethodChangeRef = useRef(onSessionMethodChange);
  onSessionMethodChangeRef.current = onSessionMethodChange;
  const prevIsSessionRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevIsSessionRef.current === isSessionBased) return;
    prevIsSessionRef.current = isSessionBased;
    onSessionMethodChangeRef.current?.(isSessionBased);
  }, [isSessionBased]);

  const shipAddressData = useMemo(
    () => addressToFormData(cart.shipping_address),
    [cart.shipping_address],
  );
  const billAddressData = useMemo(
    () => addressToFormData(cart.billing_address),
    [cart.billing_address],
  );
  const initialUseShipping =
    !cart.billing_address || cart.shipping_eq_billing_address;

  const [billAddress, setBillAddress] = useState<AddressFormData>(
    initialUseShipping ? shipAddressData : billAddressData,
  );
  const [useShippingForBilling, setUseShippingForBilling] =
    useState(initialUseShipping);

  const [savedCards, setSavedCards] = useState<SpreeCreditCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const [sessionExternalData, setSessionExternalData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const gatewayHandleRef = useRef<GatewayHandle | null>(null);
  const initRef = useRef(false);
  const sessionRequestIdRef = useRef(0);
  const completionInFlightRef = useRef(false);

  const handleGatewayReady = useCallback((handle: GatewayHandle) => {
    gatewayHandleRef.current = handle;
  }, []);

  const createSession = useCallback(
    async (cardId: string | null, method: PaymentMethod) => {
      const currentGatewayId = resolveGatewayId(method.type);
      const requestId = ++sessionRequestIdRef.current;

      setLoading(true);
      setGatewayError(null);
      setSessionExternalData(null);
      setPaymentSessionId(null);
      gatewayHandleRef.current = null;

      try {
        const basePath = extractBasePath(window.location.pathname);
        const returnUrl = `${window.location.origin}${basePath}/confirm-payment/${cart.id}`;
        const externalData: Record<string, unknown> = { return_url: returnUrl };

        if (currentGatewayId === "stripe" && cardId) {
          externalData.stripe_payment_method_id = cardId;
        }

        const result = await createCheckoutPaymentSession(
          cart.id,
          method.id,
          externalData,
        );

        if (requestId !== sessionRequestIdRef.current) return;

        if (result.success && result.session) {
          const extData = result.session.external_data;
          if (extData && Object.keys(extData).length > 0) {
            setSessionExternalData({
              ...extData,
              _external_id: result.session.external_id,
            });
            setPaymentSessionId(result.session.id);
          } else {
            setGatewayError(t("failedToInitPayment"));
          }
        } else if (!result.success) {
          setGatewayError(result.error || t("failedToCreateSession"));
        }
      } catch {
        if (requestId !== sessionRequestIdRef.current) return;
        setGatewayError(t("failedToInitPayment"));
      } finally {
        if (requestId === sessionRequestIdRef.current) setLoading(false);
      }
    },
    [cart.id, t],
  );

  const lastTotalRef = useRef<string | null>(null);
  const selectedCardRef = useRef<string | null>(null);

  useEffect(() => {
    if (initRef.current || !selectedMethod || isZeroAmount || !isSessionBased)
      return;

    initRef.current = true;
    const init = async () => {
      setLoading(true);
      let initialCardId: string | null = null;

      if (isAuthenticated) {
        try {
          const result = await getCreditCards();
          const gatewayCards = result.data.filter(
            (card) => card.gateway_payment_profile_id,
          );
          setSavedCards(gatewayCards);
          if (gatewayCards.length > 0) {
            const defaultCard =
              gatewayCards.find((c) => c.default) || gatewayCards[0];
            initialCardId = defaultCard.gateway_payment_profile_id;
            setSelectedCardId(initialCardId);
          }
        } catch {
          // Proceed without saved cards.
        }
      }

      selectedCardRef.current = initialCardId;
      lastTotalRef.current = cart.total;
      await createSession(initialCardId, selectedMethod);
    };
    init();
  }, [
    selectedMethod,
    isSessionBased,
    isAuthenticated,
    createSession,
    cart.total,
    isZeroAmount,
  ]);

  useEffect(() => {
    if (!initRef.current || !isSessionBased || !selectedMethod) return;
    if (lastTotalRef.current === cart.total) return;

    lastTotalRef.current = cart.total;
    if (!paymentSessionId) {
      createSession(selectedCardRef.current, selectedMethod);
      return;
    }

    const method = selectedMethod;
    const sync = async () => {
      try {
        const result = await updateCheckoutPaymentSession(
          cart.id,
          paymentSessionId,
          { amount: cart.total ?? undefined },
        );
        if (!result.success || !result.session) {
          throw new Error("session update rejected");
        }
        const extData = result.session.external_data;
        if (extData && Object.keys(extData).length > 0) {
          const next = {
            ...extData,
            _external_id: result.session.external_id,
          };
          setSessionExternalData((prev) =>
            JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
          );
          setPaymentSessionId(result.session.id);
        }
      } catch {
        createSession(selectedCardRef.current, method);
      }
    };
    sync();
  }, [
    cart.id,
    cart.total,
    createSession,
    isSessionBased,
    paymentSessionId,
    selectedMethod,
  ]);

  const [billStates, isPendingBill] = useCountryStates(
    billAddress.country_iso,
    fetchStates,
    !useShippingForBilling,
  );

  const handleUseShippingChange = (checked: boolean) => {
    setUseShippingForBilling(checked);
    if (checked) setBillAddress(shipAddressData);
  };

  const handleCardSelect = (cardId: string | null) => {
    if (cardId === selectedCardId || !selectedMethod) return;
    setSelectedCardId(cardId);
    selectedCardRef.current = cardId;
    createSession(cardId, selectedMethod);
  };

  const handleMethodSelect = (methodId: string) => {
    if (methodId === selectedMethodId) return;
    setSelectedMethodId(methodId);

    const newMethod = paymentMethods.find((pm) => pm.id === methodId);
    if (!newMethod) return;

    if (newMethod.session_required) {
      if (!initRef.current) {
        initRef.current = true;
        const init = async () => {
          setLoading(true);
          let cardId: string | null = null;
          if (isAuthenticated) {
            try {
              const result = await getCreditCards();
              const gatewayCards = result.data.filter(
                (card) => card.gateway_payment_profile_id,
              );
              setSavedCards(gatewayCards);
              if (gatewayCards.length > 0) {
                const defaultCard =
                  gatewayCards.find((c) => c.default) || gatewayCards[0];
                cardId = defaultCard.gateway_payment_profile_id;
                setSelectedCardId(cardId);
              }
            } catch {
              // Proceed without saved cards.
            }
          }
          selectedCardRef.current = cardId;
          lastTotalRef.current = cart.total;
          await createSession(cardId, newMethod);
        };
        init();
      } else {
        createSession(selectedCardRef.current, newMethod);
      }
    } else {
      sessionRequestIdRef.current += 1;
      setSessionExternalData(null);
      setPaymentSessionId(null);
      setGatewayError(null);
      gatewayHandleRef.current = null;
      setLoading(false);
    }
  };

  const updateBillAddress = (field: keyof AddressFormData, value: string) => {
    setBillAddress((prev) => updateAddressField(prev, field, value));
  };

  const handleGatewayApproved = useCallback(
    async (sessionResult?: string) => {
      if (completionInFlightRef.current || !paymentSessionId) return;

      completionInFlightRef.current = true;
      setProcessing(true);
      setGatewayError(null);

      try {
        let addressSuccess: boolean;
        if (useShippingForBilling) {
          addressSuccess = await onUpdateBillingAddress({ use_shipping: true });
        } else {
          addressSuccess = await onUpdateBillingAddress({
            billing_address: formDataToAddress(billAddress),
          });
        }
        if (!addressSuccess) {
          setProcessing(false);
          completionInFlightRef.current = false;
          setGatewayError(t("failedToSaveBilling"));
          return;
        }

        await onPaymentComplete({
          type: "session",
          sessionId: paymentSessionId,
          sessionResult,
        });
      } catch {
        setGatewayError(t("paymentError"));
        setProcessing(false);
        completionInFlightRef.current = false;
      }
    },
    [
      paymentSessionId,
      useShippingForBilling,
      billAddress,
      onUpdateBillingAddress,
      onPaymentComplete,
      setProcessing,
      t,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      submit: async () => {
        if (completionInFlightRef.current) return {};
        completionInFlightRef.current = true;

        try {
          if (isZeroAmount) {
            setProcessing(true);
            try {
              const addressSuccess = useShippingForBilling
                ? await onUpdateBillingAddress({ use_shipping: true })
                : await onUpdateBillingAddress({
                    billing_address: formDataToAddress(billAddress),
                  });
              if (!addressSuccess) {
                setProcessing(false);
                return { error: t("failedToSaveBilling") };
              }
              await onPaymentComplete({ type: "direct" });
              return {};
            } catch {
              setProcessing(false);
              return { error: t("paymentError") };
            }
          }

          if (!selectedMethod) return { error: t("selectPaymentMethod") };

          setProcessing(true);
          setGatewayError(null);

          try {
            const addressSuccess = useShippingForBilling
              ? await onUpdateBillingAddress({ use_shipping: true })
              : await onUpdateBillingAddress({
                  billing_address: formDataToAddress(billAddress),
                });
            if (!addressSuccess) {
              setProcessing(false);
              return { error: t("failedToSaveBilling") };
            }

            if (selectedMethod.session_required) {
              if (!paymentSessionId || !sessionExternalData) {
                setProcessing(false);
                return { error: t("failedToInitPayment") };
              }

              const basePath = extractBasePath(window.location.pathname);
              const returnUrl = `${window.location.origin}${basePath}/confirm-payment/${cart.id}?session=${paymentSessionId}`;
              const clientSecret = sessionExternalData.client_secret as
                | string
                | undefined;
              const gatewayId = resolveGatewayId(selectedMethod.type);
              const isStripe = gatewayId === "stripe";
              const isExternalCompletion =
                gatewayId === "adyen" ||
                gatewayId === "paypal" ||
                gatewayId === "hotpay";
              const canUseSavedCard =
                isStripe && Boolean(selectedCardId && clientSecret);

              if (!canUseSavedCard && !gatewayHandleRef.current) {
                setProcessing(false);
                return { error: t("failedToInitPayment") };
              }

              let error: string | undefined;
              if (canUseSavedCard) {
                const result = await confirmWithSavedCard(
                  clientSecret!,
                  selectedCardId!,
                  returnUrl,
                );
                error = result.error;
              } else {
                const result =
                  await gatewayHandleRef.current!.confirmPayment(returnUrl);
                error = result.error;
              }

              if (error) {
                setGatewayError(error);
                setProcessing(false);
                return { error };
              }

              if (isExternalCompletion) return {};

              await onPaymentComplete({
                type: "session",
                sessionId: paymentSessionId,
              });
              return {};
            }

            const paymentResult = await createDirectPayment(
              cart.id,
              selectedMethod.id,
            );
            if (!paymentResult.success) {
              const msg = paymentResult.error || t("failedToCreatePayment");
              setGatewayError(msg);
              setProcessing(false);
              return { error: msg };
            }

            await onPaymentComplete({ type: "direct" });
            return {};
          } catch {
            const msg = t("paymentError");
            setGatewayError(msg);
            setProcessing(false);
            return { error: msg };
          }
        } finally {
          completionInFlightRef.current = false;
        }
      },
    }),
    [
      isZeroAmount,
      selectedMethod,
      paymentSessionId,
      sessionExternalData,
      selectedCardId,
      useShippingForBilling,
      billAddress,
      onUpdateBillingAddress,
      onPaymentComplete,
      cart.id,
      setProcessing,
      t,
    ],
  );

  const isAddingNew = selectedCardId === null;

  if (isZeroAmount) {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {t("paymentMethod")}
        </h2>
        <div className="mt-2 rounded-sm border bg-gray-50 px-4 py-6 text-center">
          <Info
            className="w-8 h-8 text-gray-300 mx-auto mb-2"
            strokeWidth={1.5}
          />
          <p className="text-sm text-gray-600">{t("noPaymentRequired")}</p>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={useShippingForBilling}
              onCheckedChange={(checked) =>
                handleUseShippingChange(checked === true)
              }
            />
            <span className="text-sm text-gray-900">{t("sameAsShipping")}</span>
          </label>
          {!useShippingForBilling && (
            <div className="mt-4">
              <AddressFormFields
                address={billAddress}
                countries={countries}
                states={billStates}
                loadingStates={isPendingBill}
                onChange={updateBillAddress}
                idPrefix="bill"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {t("paymentMethod")}
        </h2>
        <div className="mt-2 rounded-sm border bg-gray-50 px-4 py-8 text-center">
          <CreditCard
            className="w-10 h-10 text-gray-300 mx-auto mb-3"
            strokeWidth={1.5}
          />
          <p className="text-sm text-gray-500">{t("noPaymentMethods")}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900">{t("paymentMethod")}</h2>
      <p className="text-sm text-gray-500 mt-0.5">{t("secureTransactions")}</p>

      {errors && errors.length > 0 && (
        <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3 mb-3 mt-2">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-700">
              {err}
            </p>
          ))}
        </div>
      )}

      <RadioGroup
        value={effectiveSelectedMethodId}
        onValueChange={handleMethodSelect}
        className="rounded-sm border overflow-hidden gap-0 mt-3"
      >
        {paymentMethods.map((pm, index) => {
          const isSelected = pm.id === effectiveSelectedMethodId;
          const pmGatewayId = pm.session_required
            ? resolveGatewayId(pm.type)
            : null;

          return (
            <div key={pm.id}>
              {hasMultipleMethods && (
                <label
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50" : "bg-white hover:bg-gray-50"
                  } ${index > 0 ? "border-t" : ""}`}
                >
                  <RadioGroupItem value={pm.id} />
                  <span className="text-sm font-medium text-gray-900">
                    {pm.name}
                  </span>
                </label>
              )}

              {!hasMultipleMethods && (
                <div className="flex items-center justify-between px-4 py-3.5 bg-blue-50">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={pm.id} />
                    <span className="text-sm font-medium text-gray-900">
                      {pm.name}
                    </span>
                  </div>
                </div>
              )}

              {isSelected && (
                <div className="border-t bg-gray-50">
                  {pm.session_required ? (
                    <>
                      {pmGatewayId === "stripe" && (
                        <>
                          <p className="text-xs text-gray-400 px-4 pt-3">
                            {t("testCardNote", {
                              testCard: "4242 4242 4242 4242",
                            })}
                          </p>
                          {savedCards.length > 0 && (
                            <div className="px-4 pt-3">
                              <RadioGroup
                                value={selectedCardId ?? "__new__"}
                                onValueChange={(val) =>
                                  handleCardSelect(
                                    val === "__new__" ? null : val,
                                  )
                                }
                                className="gap-0 rounded-sm border overflow-hidden"
                              >
                                {savedCards.map((card, cardIndex) => (
                                  <label
                                    key={card.id}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors bg-white ${
                                      cardIndex > 0 ? "border-t" : ""
                                    }`}
                                  >
                                    <RadioGroupItem
                                      value={
                                        card.gateway_payment_profile_id ??
                                        card.id
                                      }
                                    />
                                    <PaymentIcon
                                      type={getCardIconType(card.brand)}
                                      format="flatRounded"
                                      width={34}
                                    />
                                    <span className="text-sm text-gray-900 flex-1">
                                      {t("savedCardLabel", {
                                        brand: getCardLabel(card.brand),
                                        digits: card.last4,
                                      })}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {t("cardExpiry", {
                                        month: String(card.month).padStart(
                                          2,
                                          "0",
                                        ),
                                        year: String(card.year),
                                      })}
                                    </span>
                                    {card.default && (
                                      <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                        {t("default")}
                                      </span>
                                    )}
                                  </label>
                                ))}
                                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer border-t bg-white">
                                  <RadioGroupItem value="__new__" />
                                  <CreditCard
                                    className="w-5 h-5 text-gray-400"
                                    strokeWidth={1.5}
                                  />
                                  <span className="text-sm text-gray-900">
                                    {t("addNewPaymentMethod")}
                                  </span>
                                </label>
                              </RadioGroup>
                            </div>
                          )}
                        </>
                      )}

                      {loading && (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
                          <span className="ml-2 text-sm text-gray-500">
                            {t("loadingPaymentForm")}
                          </span>
                        </div>
                      )}

                      {gatewayError && !loading && (
                        <div className="px-4 py-3">
                          <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3">
                            <p className="text-sm text-red-700 flex items-center gap-2">
                              <CircleAlert className="h-4 w-4 flex-shrink-0" />
                              {gatewayError}
                            </p>
                          </div>
                        </div>
                      )}

                      {!loading &&
                        sessionExternalData &&
                        (() => {
                          const ext = sessionExternalData;
                          switch (pmGatewayId) {
                            case "stripe": {
                              const secret = ext.client_secret as
                                | string
                                | undefined;
                              return secret && isAddingNew ? (
                                <div className="p-4">
                                  <StripePaymentForm
                                    key={secret}
                                    clientSecret={secret}
                                    onReady={handleGatewayReady}
                                  />
                                </div>
                              ) : null;
                            }
                            case "adyen": {
                              const sid = ext._external_id as
                                | string
                                | undefined;
                              const sdata = ext.session_data as
                                | string
                                | undefined;
                              return sid && sdata ? (
                                <div className="p-4">
                                  <AdyenPaymentForm
                                    key={sid}
                                    sessionId={sid}
                                    sessionData={sdata}
                                    onReady={handleGatewayReady}
                                    onApproved={handleGatewayApproved}
                                  />
                                </div>
                              ) : null;
                            }
                            case "paypal": {
                              const orderId = ext.id as string | undefined;
                              return orderId ? (
                                <div className="p-4">
                                  <PayPalPaymentForm
                                    key={orderId}
                                    paypalOrderId={orderId}
                                    currency={cart.currency}
                                    onReady={handleGatewayReady}
                                    onApproved={handleGatewayApproved}
                                  />
                                </div>
                              ) : null;
                            }
                            case "hotpay": {
                              const paymentUrl = ext.payment_url as
                                | string
                                | undefined;
                              return paymentUrl ? (
                                <div className="p-4">
                                  <HotPayPaymentForm
                                    key={paymentUrl}
                                    paymentUrl={paymentUrl}
                                    onReady={handleGatewayReady}
                                  />
                                </div>
                              ) : null;
                            }
                            default:
                              return (
                                <div className="px-4 py-6 text-center">
                                  <Info
                                    className="w-8 h-8 text-gray-300 mx-auto mb-2"
                                    strokeWidth={1.5}
                                  />
                                  <p className="text-sm text-gray-500">
                                    {t("unsupportedGateway")}
                                  </p>
                                </div>
                              );
                          }
                        })()}
                    </>
                  ) : (
                    <div className="px-4 py-4">
                      {pm.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {pm.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        {t("manualPaymentInfo")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </RadioGroup>

      <div className="mt-4">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Checkbox
            checked={useShippingForBilling}
            onCheckedChange={(checked) =>
              handleUseShippingChange(checked === true)
            }
          />
          <span className="text-sm text-gray-900">{t("sameAsShipping")}</span>
        </label>

        {!useShippingForBilling && (
          <div className="mt-4">
            <AddressFormFields
              address={billAddress}
              countries={countries}
              states={billStates}
              loadingStates={isPendingBill}
              onChange={updateBillAddress}
              idPrefix="bill"
            />
          </div>
        )}
      </div>
    </div>
  );
}
