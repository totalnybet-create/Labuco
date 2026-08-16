export interface GuideSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface GuideArticle {
  slug: string;
  kicker: string;
  title: string;
  excerpt: string;
  sections: GuideSection[];
}

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    slug: "jak-zaczac-uprawe-indoor",
    kicker: "PODSTAWY",
    title: "Jak zacząć uprawę indoor?",
    excerpt:
      "Praktyczny plan startowy: przestrzeń, światło, wentylacja, podłoże, pomiary i bezpieczna organizacja stanowiska.",
    sections: [
      {
        heading: "Zacznij od warunków, nie od sprzętu",
        paragraphs: [
          "Najpierw określ dostępną przestrzeń, temperaturę otoczenia, możliwość wymiany powietrza i maksymalny pobór energii. Dopiero do tych ograniczeń dobieraj namiot, oświetlenie i wentylację.",
          "Dobrze zaprojektowane stanowisko jest łatwiejsze do kontroli i zwykle tańsze niż zestaw złożony z przypadkowych, przewymiarowanych elementów.",
        ],
        bullets: [
          "zmierz realną powierzchnię i wysokość",
          "zaplanuj bezpieczne prowadzenie przewodów",
          "zostaw dostęp serwisowy do wentylatora, filtra i lampy",
          "przewidź miejsce na pomiary i podlewanie",
        ],
      },
      {
        heading: "Podstawowy zestaw",
        paragraphs: [
          "Do większości legalnych zastosowań indoor potrzebujesz stabilnego źródła światła, kontrolowanej wymiany powietrza, pojemników lub systemu uprawowego, odpowiedniego podłoża oraz podstawowych mierników.",
        ],
      },
    ],
  },
  {
    slug: "jak-dobrac-oswietlenie-do-namiotu",
    kicker: "OŚWIETLENIE",
    title: "Jak dobrać oświetlenie do namiotu?",
    excerpt:
      "Jak dopasować moc, powierzchnię świecenia i wysokość montażu bez kupowania lampy w ciemno.",
    sections: [
      {
        heading: "Liczy się powierzchnia i rozkład światła",
        paragraphs: [
          "Nie porównuj lamp wyłącznie po poborze mocy. Sprawdź zalecaną powierzchnię pracy, skuteczność oprawy, możliwość regulacji i równomierność pokrycia całej przestrzeni.",
          "W małych namiotach zbyt mocna lampa może utrudnić kontrolę temperatury, natomiast zbyt słaba ograniczy możliwości stanowiska.",
        ],
      },
      {
        heading: "Zostaw zapas regulacji",
        paragraphs: [
          "Ściemniacz oraz możliwość zmiany wysokości oprawy dają większy zakres pracy niż lampa działająca tylko z pełną mocą. Warto również uwzględnić ciepło oddawane do namiotu i wydajność wentylacji.",
        ],
      },
    ],
  },
  {
    slug: "nawozenie-roslin-poradnik",
    kicker: "NAWOŻENIE",
    title: "Nawożenie roślin — poradnik",
    excerpt:
      "Jak czytać dawkowanie, kontrolować wodę i unikać najczęstszego błędu: dokładania kolejnych preparatów bez pomiarów.",
    sections: [
      {
        heading: "Trzymaj się jednego, spójnego programu",
        paragraphs: [
          "Mieszanie przypadkowych produktów kilku systemów utrudnia diagnozę. Na początku bezpieczniej korzystać z jednej linii producenta i jej tabeli dawkowania, dostosowując ją do konkretnego podłoża i jakości wody.",
        ],
      },
      {
        heading: "Pomiary przed korektą",
        paragraphs: [
          "Jeżeli uprawa wymaga kontroli pH lub EC, najpierw wykonaj pomiar i dopiero później koryguj roztwór. Więcej preparatu nie oznacza automatycznie lepszego efektu.",
        ],
      },
    ],
  },
  {
    slug: "najczestsze-problemy-w-uprawie",
    kicker: "PROBLEMY",
    title: "Najczęstsze problemy w uprawie",
    excerpt:
      "Lista kontrolna do szybkiej diagnostyki: temperatura, wilgotność, przepływ powietrza, podlewanie i pomiary.",
    sections: [
      {
        heading: "Najpierw sprawdź środowisko",
        paragraphs: [
          "Objawy przypominające niedobory często wynikają z niewłaściwego podlewania, temperatury albo problemów z parametrami podłoża. Zanim dołożysz kolejny preparat, sprawdź podstawowe warunki.",
        ],
        bullets: [
          "temperatura i wilgotność",
          "ruch i wymiana powietrza",
          "częstotliwość podlewania",
          "pH i EC, jeżeli są istotne dla danego systemu",
          "stan korzeni i drożność odpływu",
        ],
      },
    ],
  },
];

export function getGuideArticle(slug: string): GuideArticle | undefined {
  return GUIDE_ARTICLES.find((article) => article.slug === slug);
}
