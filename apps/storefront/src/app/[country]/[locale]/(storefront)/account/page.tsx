import { LockKeyhole, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { AccountPageClient } from "@/components/account/AccountPageClient";
import { Button } from "@/components/ui/button";
import { isTransactionalCommerceEnabled } from "@/lib/commerce/config";

interface AccountPageProps {
  params: Promise<{ country: string; locale: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { country, locale } = await params;
  const basePath = `/${country}/${locale}`;

  if (!isTransactionalCommerceEnabled()) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LockKeyhole className="size-7" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-950">
            Konto klienta będzie dostępne przy uruchomieniu sprzedaży
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-600">
            Katalog, wyszukiwarka, ulubione i koszyk podglądowy działają bez
            backendu transakcyjnego. Logowanie, historia zamówień, adresy i
            płatności pozostają celowo wyłączone do czasu podłączenia docelowego
            systemu commerce.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href={`${basePath}/products`}>
                <ShoppingBag className="size-4" aria-hidden="true" />
                Przeglądaj produkty
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`${basePath}/ulubione`}>Zobacz ulubione</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <AccountPageClient />;
}
