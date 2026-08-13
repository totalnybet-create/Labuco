#!/usr/bin/env python3
"""Classify Labuco catalog into the approved 9-category taxonomy.

Reads the prepared Labuco JSON catalog and adds:
- category: normalized main category
- subcategory: Labuco subcategory
- category_path: Categories -> <main> -> <sub>

Conservative keyword rules are intentionally ordered from specific to general.
Use --report to inspect low-confidence/unmatched records before production import.
"""
from __future__ import annotations
import argparse, json, re
from pathlib import Path

RULES = [
 ("Growboxy i namioty","Kompletne zestawy Growbox", r"growbox.*(zestaw|\+)|zestaw.*growbox"),
 ("Growboxy i namioty","Namioty uprawowe", r"growbox|namiot|royalroom|homebox|secret jardin|dark room"),
 ("Oświetlenie","Lampy LED Grow", r"\bled\b|lumatek|spider farmer|mars hydro|quantum board|luckygrow"),
 ("Oświetlenie","HPS / MH", r"\bhps\b|\bmh\b|sodowa|metalohalogen"),
 ("Oświetlenie","CMH", r"\bcmh\b|lec 315"),
 ("Oświetlenie","CFL i żarówki", r"\bcfl\b|żar[oó]wk|zarowk"),
 ("Oświetlenie","Odbłyśniki", r"odb[łl]y[sś]nik|reflektor"),
 ("Oświetlenie","Zasilacze / ballasty", r"ballast|statecznik|zasilacz.*lamp"),
 ("Oświetlenie","Programatory i sterowanie", r"programator|timer|sterownik.*lamp"),
 ("Oświetlenie","Wieszaki i akcesoria montażowe", r"wieszak|zawieszk|uchwyt.*lamp|haki.*lamp"),
 ("Wentylacja i klimat","Filtry węglowe", r"filtr.*w[eę]gl|carbon filter|can filters"),
 ("Wentylacja i klimat","Wentylatory kanałowe", r"wentylator.*kana[łl]|extractor|inline fan"),
 ("Wentylacja i klimat","Wentylatory mieszające", r"wentylator.*(miesz|klips|oscyl)"),
 ("Wentylacja i klimat","Przewody i złączki", r"przew[oó]d.*went|rura.*went|redukcj|kolano.*went|z[łl][aą]czk.*went"),
 ("Wentylacja i klimat","Tłumiki", r"t[łl]umik"),
 ("Wentylacja i klimat","Zestawy wentylacyjne", r"zestaw.*wentyl|wentylacja.*zestaw"),
 ("Wentylacja i klimat","Nawilżacze i osuszacze", r"nawil[zż]acz|osuszacz"),
 ("Wentylacja i klimat","Sterowanie temperaturą i klimatem", r"termostat|higrostat|kontroler.*(temper|wilgot|klimat)"),
 ("Nawozy i stymulatory","Regulatory pH", r"ph plus|ph minus|ph\+|ph-|lemon kick|regulator.*ph|obni[zż]enie ph|podniesienie ph"),
 ("Nawozy i stymulatory","Ukorzeniacze", r"rooting|ukorzeni|power roots|root juice"),
 ("Nawozy i stymulatory","Zestawy nawozów", r"zestaw.*naw[oó]z|starter pack|top grow box|try pack|start pack"),
 ("Nawozy i stymulatory","Nawozy organiczne", r"organicz|bio[- ]?bizz|biotabs|alga grow|alga bloom"),
 ("Nawozy i stymulatory","Nawozy na wzrost", r"terra grow|alga grow|grow fertilizer|na wzrost|vega"),
 ("Nawozy i stymulatory","Nawozy na kwitnienie", r"terra bloom|alga bloom|na kwitnienie|bloom fertilizer|flores"),
 ("Nawozy i stymulatory","Stymulatory / boostery", r"stymulator|booster|boost|green sensation|sugar royal|pk 13.?14|vita race"),
 ("Nawozy i stymulatory","Enzymy i dodatki", r"enzym|zym|additive|dodatek.*naw"),
 ("Nawozy i stymulatory","Nawozy mineralne", r"naw[oó]z|mineral fertilizer|canna aqua|canna coco"),
 ("Podłoża i media","Kokos", r"coco|kokos"),
 ("Podłoża i media","Keramzyt", r"keramzyt|clay pebble|hydroton"),
 ("Podłoża i media","Perlit", r"perlit"),
 ("Podłoża i media","Wełna mineralna / kostki", r"rockwool|we[łl]na mineral|kostk.*(grodan|upraw)"),
 ("Podłoża i media","Podłoża do sadzonek", r"seed.?mix|light.?mix|sadzonk|wysiew"),
 ("Podłoża i media","Ziemia", r"ziemia|soil|substrat|pod[łl]o[zż]e"),
 ("Doniczki, tace i pojemniki","Doniczki materiałowe", r"fabric pot|smart pot|doniczk.*materia"),
 ("Doniczki, tace i pojemniki","Air Pots / Root Pots", r"air.?pot|root.?pot"),
 ("Doniczki, tace i pojemniki","Doniczki hydroponiczne", r"net pot|doniczk.*hydro"),
 ("Doniczki, tace i pojemniki","Tace", r"\btac[ae]\b|tray"),
 ("Doniczki, tace i pojemniki","Podstawki", r"podstawk"),
 ("Doniczki, tace i pojemniki","Zbiorniki i pojemniki", r"zbiornik|pojemnik"),
 ("Doniczki, tace i pojemniki","Doniczki plastikowe", r"doniczk"),
 ("Nawadnianie i hydroponika","Systemy AutoPot", r"autopot"),
 ("Nawadnianie i hydroponika","Systemy Blumat / kroplujące", r"blumat|kropl|dripper"),
 ("Nawadnianie i hydroponika","Pompy wodne", r"pompa.*wod|water pump"),
 ("Nawadnianie i hydroponika","Przewody i złączki", r"w[aą][zż].*(nawad|wod)|przew[oó]d.*wod|z[łl][aą]czk.*wod"),
 ("Nawadnianie i hydroponika","Napowietrzacze", r"napowietrz|air pump|kamie[nń].*powiet"),
 ("Nawadnianie i hydroponika","Zestawy hydroponiczne", r"zestaw.*hydro|hydroponic system|dwc"),
 ("Nawadnianie i hydroponika","Akcesoria hydroponiczne", r"hydropon|hydro"),
 ("Pomiary i automatyka","Mierniki kombinowane", r"miernik.*(ph.*ec|ec.*ph)|combo meter"),
 ("Pomiary i automatyka","Mierniki pH", r"miernik.*ph|kwasomierz|ph meter"),
 ("Pomiary i automatyka","Mierniki EC / TDS", r"miernik.*(ec|tds)|ec meter|tds meter"),
 ("Pomiary i automatyka","Termometry i higrometry", r"termometr|higrometr"),
 ("Pomiary i automatyka","Płyny kalibracyjne", r"kalibr|buffer.*ph|p[łl]yn.*(ph|ec)"),
 ("Pomiary i automatyka","Elektrody i akcesoria", r"elektrod|sonda.*(ph|ec)"),
 ("Pomiary i automatyka","Kontrolery i automatyka", r"kontroler|controller|automatyk"),
 ("Akcesoria do uprawy","Klonowanie i ukorzenianie", r"klon|clone|rooting gel|ukorzeni"),
 ("Akcesoria do uprawy","Propagatory", r"propagator"),
 ("Akcesoria do uprawy","Nożyczki i narzędzia", r"no[zż]ycz|sekator|narz[eę]dzi"),
 ("Akcesoria do uprawy","Miarki, pipety i spryskiwacze", r"pipet|miark|strzykawk|spryskiw"),
 ("Akcesoria do uprawy","Podpory i siatki", r"siatk|scrog|podpor|tyczk"),
 ("Akcesoria do uprawy","Neutralizacja zapachów", r"neutraliz.*zapach|ona gel|odor"),
 ("Akcesoria do uprawy","Wieszaki", r"wieszak|zawieszk|haki"),
]
COMPILED=[(a,b,re.compile(c,re.I)) for a,b,c in RULES]

def classify(r):
    text=" ".join(str(r.get(k) or "") for k in ("title","short_description","description","our_title","our_short_description","our_description","brand","category"))
    for main,sub,rx in COMPILED:
        if rx.search(text): return main,sub,"rule"
    old=str(r.get("category") or "").lower()
    fallback={"oświetlenie":"Oświetlenie","wentylacja":"Wentylacja i klimat","nawozy":"Nawozy i stymulatory","pomiary":"Pomiary i automatyka","nawadnianie":"Nawadnianie i hydroponika","doniczki":"Doniczki, tace i pojemniki","namioty":"Growboxy i namioty","podłoża":"Podłoża i media","akcesoria":"Akcesoria do uprawy"}
    for key,main in fallback.items():
        if key in old: return main,"Pozostałe", "fallback"
    return "Akcesoria do uprawy","Pozostałe akcesoria","unmatched"

def main():
    p=argparse.ArgumentParser(); p.add_argument("catalog",type=Path); p.add_argument("output",type=Path); p.add_argument("--report",type=Path,default=Path("labuco-category-report.json")); a=p.parse_args()
    rows=json.loads(a.catalog.read_text(encoding="utf-8")); counts={}; review=[]
    for r in rows:
        main,sub,confidence=classify(r); r["category"]=main; r["subcategory"]=sub; r["category_path"]=f"Categories -> {main} -> {sub}"; counts[r["category_path"]]=counts.get(r["category_path"],0)+1
        if confidence!="rule": review.append({"sku":r.get("labuco_sku"),"title":r.get("title") or r.get("our_title"),"category_path":r["category_path"],"reason":confidence})
    a.output.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding="utf-8")
    a.report.write_text(json.dumps({"products":len(rows),"paths":counts,"needs_review":len(review),"review":review},ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"products":len(rows),"category_paths":len(counts),"needs_review":len(review)},ensure_ascii=False))
if __name__=="__main__": main()
