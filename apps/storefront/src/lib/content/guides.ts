export interface GuideSection {
  heading: string;
  paragraphs: string[];
  checklist?: string[];
}

export interface Guide {
  slug: string;
  kicker: string;
  title: string;
  description: string;
  readTime: string;
  sections: GuideSection[];
}

export const guides: Guide[] = [
  {
    slug: "jak-zaczac-uprawe-indoor",
    kicker: "PODSTAWY",
    title: "Jak zacząć uprawę indoor?",
    description:
      "Praktyczna lista decyzji, które warto podjąć przed zakupem pierwszego zestawu.",
    readTime: "6 min czytania",
    sections: [
      {
        heading: "Najpierw określ przestrzeń i cel",
        paragraphs: [
          "Zmierz dostępne miejsce, sprawdź możliwość bezpiecznego podłączenia zasilania i zaplanuj drogę wymiany powietrza. Rozmiar przestrzeni wpływa na dobór namiotu, lampy oraz wentylacji.",
          "Zaczynaj od prostego układu, który można później rozbudować. Nadmiar urządzeń utrudnia diagnozowanie problemów i podnosi koszt wejścia.",
        ],
        checklist: [
          "namiot dopasowany do miejsca",
          "oświetlenie o znanej mocy i powierzchni pracy",
          "wentylator wyciągowy oraz dopływ świeżego powietrza",
          "miernik temperatury i wilgotności",
          "bezpieczna listwa zasilająca i programator czasowy",
        ],
      },
      {
        heading: "Kontroluj warunki, nie zgaduj",
        paragraphs: [
          "Stabilność temperatury, wilgotności i obiegu powietrza jest ważniejsza niż liczba dodatków. Zapisuj odczyty i zmieniaj jedną rzecz naraz, aby wiedzieć, co rzeczywiście zadziałało.",
        ],
      },
    ],
  },
  {
    slug: "jak-dobrac-oswietlenie-do-namiotu",
    kicker: "OŚWIETLENIE",
    title: "Jak dobrać oświetlenie do namiotu?",
    description:
      "Moc, powierzchnia, odległość i odprowadzanie ciepła wyjaśnione bez marketingowych skrótów.",
    readTime: "7 min czytania",
    sections: [
      {
        heading: "Patrz na pobór mocy i obszar pracy",
        paragraphs: [
          "Porównuj rzeczywisty pobór energii, zalecaną powierzchnię pracy i mapę natężenia światła producenta. Sama nazwa modelu lub deklarowany odpowiednik tradycyjnej lampy nie wystarcza do rzetelnego porównania.",
          "Oprawa powinna równomiernie pokrywać całą powierzchnię namiotu. Zbyt mała tworzy niedoświetlone brzegi, a przewymiarowana generuje zbędne ciepło i koszt energii.",
        ],
      },
      {
        heading: "Zostaw zapas na wentylację",
        paragraphs: [
          "Każde źródło światła oddaje część energii jako ciepło. Przed zakupem sprawdź, czy układ wentylacji odprowadzi je także w najcieplejszych miesiącach.",
        ],
        checklist: [
          "regulacja mocy lub możliwość przyciemniania",
          "zalecana wysokość montażu",
          "gwarancja i dostępność serwisu",
          "bezpieczne okablowanie i ochrona przed wilgocią",
        ],
      },
    ],
  },
  {
    slug: "nawozenie-roslin-indoor",
    kicker: "NAWOŻENIE",
    title: "Nawożenie roślin indoor – poradnik",
    description:
      "Jak zbudować prosty plan nawożenia i unikać najczęstszego błędu: zbyt dużej dawki.",
    readTime: "6 min czytania",
    sections: [
      {
        heading: "Zacznij poniżej dawki maksymalnej",
        paragraphs: [
          "Tabela producenta jest punktem odniesienia, a nie obowiązkowym celem. Młode rośliny, świeże podłoże i miękka woda często wymagają mniejszej dawki.",
          "Obserwuj reakcję roślin i zwiększaj stężenie stopniowo. Łatwiej uzupełnić niedobór niż cofnąć skutki przenawożenia.",
        ],
      },
      {
        heading: "Mierz wodę i zapisuj wyniki",
        paragraphs: [
          "Mierniki pH oraz EC pomagają utrzymać powtarzalność. Kalibruj je regularnie, płucz sondy zgodnie z instrukcją i zapisuj dawkę, odczyty oraz datę podlewania.",
        ],
        checklist: [
          "jedna spójna linia nawozów",
          "miarka lub strzykawka dozująca",
          "miernik pH dopasowany do medium",
          "notatnik obserwacji",
        ],
      },
    ],
  },
  {
    slug: "najczestsze-problemy-w-uprawie",
    kicker: "PROBLEMY",
    title: "Najczęstsze problemy w uprawie",
    description:
      "Szybka diagnostyka temperatury, podlewania, wentylacji oraz pomiarów.",
    readTime: "5 min czytania",
    sections: [
      {
        heading: "Sprawdź podstawy w stałej kolejności",
        paragraphs: [
          "Gdy roślina wygląda gorzej, najpierw sprawdź wilgotność podłoża, temperaturę, wilgotność powietrza i przepływ powietrza. Dopiero później zmieniaj nawożenie.",
          "Kilka jednoczesnych zmian zaciera przyczynę problemu. Wprowadzaj jedną korektę, oznacz czas i obserwuj trend zamiast pojedynczego odczytu.",
        ],
      },
      {
        heading: "Najczęstsze źródła kłopotów",
        paragraphs: [
          "Zbyt częste podlewanie ogranicza dostęp tlenu do korzeni. Za mały obieg powietrza sprzyja zastojom wilgoci, a źle skalibrowany miernik prowadzi do pozornie prawidłowych, lecz błędnych decyzji.",
        ],
        checklist: [
          "sprawdź kalibrację mierników",
          "oceń wagę i wilgotność doniczki przed podlewaniem",
          "upewnij się, że powietrze krąży także pod koroną roślin",
          "skontroluj timery i połączenia elektryczne",
        ],
      },
    ],
  },
];

export function findGuide(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}
