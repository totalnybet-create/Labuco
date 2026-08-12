#!/usr/bin/env python3
"""GrowTent / QuickClick catalog importer.

Priority:
1. Official private QuickClick XML feed (GROWTENT_XML_URL), when provided.
2. Public GrowTent.pl catalog discovered through robots.txt/sitemaps and product pages.

Exports JSON, CSV, source URLs and optionally downloads all public product images.
The crawler does not bypass authentication or access controls.
"""
from __future__ import annotations

import csv
import gzip
import html
import io
import json
import os
import re
import sys
import threading
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.growtent.pl/"
HOST = "www.growtent.pl"
UA = "LabucoCatalogImporter/1.0 (+catalog import for reseller integration)"
TIMEOUT = 30
PRODUCT_RE = re.compile(r"/product-(?:pol|eng)-\d+-.+\.html(?:$|\?)", re.I)
MAX_PRODUCTS = int(os.getenv("MAX_PRODUCTS", "0") or "0")
DOWNLOAD_IMAGES = os.getenv("DOWNLOAD_IMAGES", "1") not in {"0", "false", "False"}
WORKERS = max(1, min(int(os.getenv("WORKERS", "8")), 16))
IMAGE_WORKERS = max(1, min(int(os.getenv("IMAGE_WORKERS", "10")), 16))
REQUEST_INTERVAL = max(0.10, float(os.getenv("REQUEST_INTERVAL", "0.22")))
OUT = Path(os.getenv("OUTPUT_DIR", "artifacts/growtent"))
IMAGES = OUT / "images"

_rate_lock = threading.Lock()
_last_request = 0.0


def rate_limit() -> None:
    global _last_request
    with _rate_lock:
        now = time.monotonic()
        wait = REQUEST_INTERVAL - (now - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.monotonic()


def get(url: str, *, binary: bool = False, retries: int = 4) -> requests.Response:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            rate_limit()
            r = requests.get(
                url,
                timeout=TIMEOUT,
                headers={"User-Agent": UA, "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.6"},
                allow_redirects=True,
            )
            if r.status_code in {429, 500, 502, 503, 504}:
                raise requests.HTTPError(f"retryable HTTP {r.status_code}", response=r)
            r.raise_for_status()
            return r
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(min(2 ** attempt, 8))
    raise RuntimeError(f"GET failed after {retries} attempts: {url}: {last}")


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    text = BeautifulSoup(html.unescape(str(value)), "html.parser").get_text(" ", strip=True)
    return re.sub(r"\s+", " ", text).strip()


def normalize_url(url: str, base: str = BASE_URL) -> str:
    return urljoin(base, url.strip())


def host_ok(url: str) -> bool:
    h = urlparse(url).netloc.lower()
    return h in {"growtent.pl", "www.growtent.pl", "client2745.idosell.com"} or h.endswith(".idosell.com")


def robots() -> tuple[RobotFileParser, list[str]]:
    rp = RobotFileParser()
    robots_url = urljoin(BASE_URL, "robots.txt")
    sitemaps: list[str] = []
    try:
        text = get(robots_url).text
        rp.parse(text.splitlines())
        for line in text.splitlines():
            if line.lower().startswith("sitemap:"):
                sitemaps.append(line.split(":", 1)[1].strip())
    except Exception as exc:  # noqa: BLE001
        print(f"WARN robots.txt: {exc}")
        rp.set_url(robots_url)
        rp.parse([])
    return rp, sitemaps


def parse_xml_bytes(content: bytes, url: str) -> ET.Element:
    if url.lower().split("?", 1)[0].endswith(".gz"):
        content = gzip.decompress(content)
    return ET.fromstring(content)


def discover_from_sitemaps(seed_sitemaps: list[str]) -> list[str]:
    candidates = seed_sitemaps + [
        urljoin(BASE_URL, "sitemap.xml"),
        urljoin(BASE_URL, "sitemap_index.xml"),
        urljoin(BASE_URL, "sitemap-products.xml"),
        urljoin(BASE_URL, "sitemap_products.xml"),
    ]
    queue: list[str] = []
    seen_maps: set[str] = set()
    products: set[str] = set()
    for u in candidates:
        if u and u not in queue:
            queue.append(u)

    while queue and len(seen_maps) < 500:
        sm = queue.pop(0)
        if sm in seen_maps:
            continue
        seen_maps.add(sm)
        try:
            root = parse_xml_bytes(get(sm, binary=True).content, sm)
        except Exception as exc:  # noqa: BLE001
            print(f"WARN sitemap {sm}: {exc}")
            continue
        for loc in root.iter():
            if not str(loc.tag).lower().endswith("loc") or not loc.text:
                continue
            u = loc.text.strip()
            if PRODUCT_RE.search(urlparse(u).path):
                products.add(u.split("#", 1)[0])
            elif "sitemap" in u.lower() and u not in seen_maps:
                queue.append(u)
    print(f"SITEMAP discovery: {len(products)} product URLs from {len(seen_maps)} sitemap files")
    return sorted(products)


def discover_by_crawl(rp: RobotFileParser, max_pages: int = 12000) -> list[str]:
    """Fallback same-host crawl focused on category/pagination pages."""
    seeds = [BASE_URL, urljoin(BASE_URL, "pol_m_--0.html"), urljoin(BASE_URL, "categories.php")]
    queue = list(seeds)
    seen: set[str] = set()
    products: set[str] = set()
    while queue and len(seen) < max_pages:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            if not rp.can_fetch(UA, url):
                continue
        except Exception:
            pass
        try:
            soup = BeautifulSoup(get(url).text, "lxml")
        except Exception as exc:  # noqa: BLE001
            print(f"WARN crawl {url}: {exc}")
            continue
        for a in soup.find_all("a", href=True):
            u = normalize_url(a["href"], url).split("#", 1)[0]
            p = urlparse(u)
            if p.netloc.lower() not in {"growtent.pl", "www.growtent.pl"}:
                continue
            if PRODUCT_RE.search(p.path):
                products.add(u)
                continue
            low = p.path.lower()
            if any(token in low for token in ("pol_m_", "menu", "category", "search", "producer", "node")) or "page=" in p.query.lower():
                if u not in seen and len(queue) < 20000:
                    queue.append(u)
        if len(seen) % 100 == 0:
            print(f"CRAWL pages={len(seen)} products={len(products)} queue={len(queue)}")
    print(f"CRAWL discovery: {len(products)} product URLs from {len(seen)} pages")
    return sorted(products)


@dataclass
class Product:
    source: str = "growtent-public"
    id: str = ""
    url: str = ""
    title: str = ""
    short_description: str = ""
    long_description: str = ""
    producer: str = ""
    sku: str = ""
    ean: str = ""
    availability: str = ""
    quantity_available: str = ""
    price_retail_gross: str = ""
    price_retail_net: str = ""
    price_b2b_gross: str = ""
    price_b2b_net: str = ""
    vat: str = ""
    currency: str = "PLN"
    weight_g: str = ""
    categories: list[str] = field(default_factory=list)
    images: list[str] = field(default_factory=list)
    attributes: dict[str, str] = field(default_factory=dict)


def jsonld_product(soup: BeautifulSoup) -> dict[str, Any]:
    candidates: list[dict[str, Any]] = []
    for node in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(node.string or node.get_text() or "")
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if isinstance(item, dict) and "@graph" in item and isinstance(item["@graph"], list):
                items.extend(x for x in item["@graph"] if isinstance(x, dict))
        for item in items:
            if not isinstance(item, dict):
                continue
            typ = item.get("@type")
            types = typ if isinstance(typ, list) else [typ]
            if any(str(x).lower() == "product" for x in types):
                candidates.append(item)
    return candidates[0] if candidates else {}


def first_text(soup: BeautifulSoup, selectors: Iterable[str]) -> str:
    for sel in selectors:
        el = soup.select_one(sel)
        if el:
            text = clean_text(el.get_text(" ", strip=True))
            if text:
                return text
    return ""


def label_value(soup: BeautifulSoup, labels: Iterable[str]) -> str:
    wanted = [re.sub(r"\s+", " ", x.lower()).strip() for x in labels]
    for el in soup.find_all(["dt", "th", "span", "div", "td", "strong"]):
        t = re.sub(r"\s+", " ", el.get_text(" ", strip=True).lower()).strip(" :")
        if not any(t == w or t.startswith(w + ":") for w in wanted):
            continue
        sibling = el.find_next_sibling()
        if sibling:
            val = clean_text(sibling.get_text(" ", strip=True))
            if val and val.lower() not in wanted:
                return val
        parent = el.parent
        if parent:
            texts = [clean_text(x) for x in parent.stripped_strings]
            joined = " ".join(x for x in texts if x)
            for w in wanted:
                joined = re.sub(re.escape(w), "", joined, count=1, flags=re.I).strip(" :")
            if joined:
                return joined
    return ""


def extract_attributes(soup: BeautifulSoup) -> dict[str, str]:
    out: dict[str, str] = {}
    selectors = [
        "#projector_dictionary table tr",
        ".projector_dictionary table tr",
        ".dictionary__param",
        ".projector_details__item",
        ".traits__item",
    ]
    for sel in selectors:
        for row in soup.select(sel):
            parts = [clean_text(x) for x in row.stripped_strings]
            parts = [x for x in parts if x]
            if len(parts) >= 2:
                key = parts[0].strip(" :")
                val = " ".join(parts[1:]).strip()
                if key and val and len(key) < 120:
                    out[key] = val
    if out:
        return out

    # Generic fallback for label/value blocks in the product-detail area.
    main = soup.select_one("main") or soup
    texts = [clean_text(x) for x in main.stripped_strings]
    known = ["Marka", "Kod producenta", "EAN", "Waga", "Moc", "Wymiary"]
    for i, txt in enumerate(texts[:-1]):
        if any(txt.lower() == k.lower() for k in known):
            out[txt] = texts[i + 1]
    return out


def extract_long_description(soup: BeautifulSoup, ld: dict[str, Any]) -> str:
    selectors = [
        "#projector_longdescription",
        ".projector_longdescription",
        "#product_description",
        ".product_description",
        ".projector_description",
        "[data-description=long]",
    ]
    for sel in selectors:
        el = soup.select_one(sel)
        if el:
            t = clean_text(el.decode_contents())
            if len(t) > 80:
                return t
    d = clean_text(ld.get("description", ""))
    if len(d) > 80:
        return d

    # IdoSell fallback: collect content between product detail heading and technical dictionary.
    h1 = soup.find("h1")
    chunks: list[str] = []
    if h1:
        for el in h1.find_all_next(["h2", "h3", "p", "li"], limit=180):
            txt = clean_text(el.get_text(" ", strip=True))
            if not txt:
                continue
            low = txt.lower()
            if low.startswith("opinie o ") or low == "zapytaj o produkt":
                break
            if txt not in chunks:
                chunks.append(txt)
    joined = "\n".join(chunks)
    return joined[:30000]


def parse_public_product(url: str) -> Product:
    r = get(url)
    soup = BeautifulSoup(r.text, "lxml")
    ld = jsonld_product(soup)
    p = Product(url=r.url)
    m = re.search(r"product-(?:pol|eng)-(\d+)-", urlparse(r.url).path, re.I)
    p.id = m.group(1) if m else str(ld.get("productID") or ld.get("sku") or "")
    p.title = clean_text(ld.get("name")) or first_text(soup, ["h1"])
    p.short_description = first_text(soup, [".projector_info__description", ".product_name__description", "h1 + *"])
    meta_desc = soup.find("meta", attrs={"name": re.compile("description", re.I)})
    if not p.short_description and meta_desc:
        p.short_description = clean_text(meta_desc.get("content", ""))
    p.long_description = extract_long_description(soup, ld)

    brand = ld.get("brand")
    if isinstance(brand, dict):
        p.producer = clean_text(brand.get("name"))
    elif brand:
        p.producer = clean_text(brand)
    p.producer = p.producer or label_value(soup, ["Producent", "Marka"])
    p.sku = clean_text(ld.get("sku")) or label_value(soup, ["Kod producenta", "Kod produktu", "SKU"])
    p.ean = clean_text(ld.get("gtin13") or ld.get("gtin") or ld.get("gtin8") or ld.get("gtin14")) or label_value(soup, ["EAN", "Kod EAN"])

    offers = ld.get("offers") or {}
    if isinstance(offers, list):
        offers = offers[0] if offers else {}
    if isinstance(offers, dict):
        p.price_retail_gross = clean_text(offers.get("price"))
        p.currency = clean_text(offers.get("priceCurrency")) or "PLN"
        av = clean_text(offers.get("availability"))
        p.availability = av.rsplit("/", 1)[-1] if av else ""
    if not p.price_retail_gross:
        price_meta = soup.find("meta", attrs={"itemprop": "price"})
        p.price_retail_gross = clean_text(price_meta.get("content", "")) if price_meta else ""
    if not p.availability:
        p.availability = first_text(soup, [".projector_status__info", ".projector_status", "[data-status]"])

    imgs: list[str] = []
    raw_images = ld.get("image", [])
    if isinstance(raw_images, str):
        raw_images = [raw_images]
    if isinstance(raw_images, list):
        for x in raw_images:
            if isinstance(x, dict):
                x = x.get("url") or x.get("contentUrl")
            if x:
                imgs.append(normalize_url(str(x), r.url))
    for img in soup.select("img[src], img[data-src], source[srcset]"):
        val = img.get("data-src") or img.get("src") or img.get("srcset") or ""
        if not val:
            continue
        val = val.split(",")[0].strip().split(" ")[0]
        u = normalize_url(val, r.url)
        low = u.lower()
        if host_ok(u) and any(token in low for token in ("product", "photo", "gfx", "data/include", "idosell")):
            imgs.append(u)
    p.images = list(dict.fromkeys(u for u in imgs if u.startswith("http")))

    crumbs = []
    for a in soup.select(".breadcrumbs a, .breadcrumb a, nav[aria-label*=breadcrumb] a, [class*=breadcrumb] a"):
        t = clean_text(a.get_text(" ", strip=True))
        if t and t.lower() not in {"strona główna", "home"}:
            crumbs.append(t)
    p.categories = list(dict.fromkeys(crumbs))
    p.attributes = extract_attributes(soup)
    if not p.sku:
        p.sku = p.attributes.get("Kod producenta", "")
    if not p.ean:
        p.ean = p.attributes.get("EAN", "") or p.attributes.get("Kod EAN", "")
    return p


def child_text(node: ET.Element, *paths: str) -> str:
    for path in paths:
        el = node.find(path)
        if el is not None and el.text:
            return clean_text(el.text)
    return ""


def parse_official_xml(url: str) -> list[Product]:
    print("MODE official XML")
    root = parse_xml_bytes(get(url, binary=True).content, url)
    nodes = [x for x in root.iter() if str(x.tag).split("}")[-1].lower() == "product"]
    products: list[Product] = []
    for n in nodes:
        p = Product(source="quickclick-xml")
        p.id = child_text(n, "id", "product_id") or clean_text(n.attrib.get("id", ""))
        p.url = child_text(n, "url", "product_url")
        p.title = child_text(n, "title", "name")
        p.short_description = child_text(n, "short_description")
        p.long_description = child_text(n, "long_description", "description")
        p.producer = child_text(n, "producer", "brand")
        p.quantity_available = child_text(n, "amount/quantity_available", "quantity_available", "amount")
        p.weight_g = child_text(n, "weight")
        p.price_b2b_gross = child_text(n, "prices/price_b2b_gross", "price_b2b_gross")
        p.price_b2b_net = child_text(n, "prices/price_b2b_net", "price_b2b_net")
        p.price_retail_gross = child_text(n, "prices/price_retail_gross", "price_retail_gross")
        p.price_retail_net = child_text(n, "prices/price_retail_net", "price_retail_net")
        p.vat = child_text(n, "prices/vat", "vat")
        p.categories = [clean_text(x.text) for x in n.findall(".//categories//menu") if x.text]
        images = []
        for x in n.findall(".//images//image"):
            u = clean_text(x.text or x.attrib.get("url", ""))
            if u:
                images.append(normalize_url(u, p.url or BASE_URL))
        p.images = list(dict.fromkeys(images))
        if p.title or p.url:
            products.append(p)
    print(f"XML parsed products={len(products)}")
    return products


def safe_filename(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip("-.")
    return value[:120] or "file"


def download_one_image(item: tuple[str, str, int]) -> tuple[str, str, bool, str]:
    product_id, url, index = item
    try:
        r = get(url, binary=True)
        content_type = (r.headers.get("content-type") or "").lower()
        ext = Path(urlparse(r.url).path).suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}:
            ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif"}.get(content_type.split(";", 1)[0], ".jpg")
        folder = IMAGES / safe_filename(product_id)
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{index:02d}{ext}"
        path.write_bytes(r.content)
        return product_id, url, True, str(path)
    except Exception as exc:  # noqa: BLE001
        return product_id, url, False, str(exc)


def write_exports(products: list[Product]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    payload = [asdict(p) for p in products]
    (OUT / "products.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    fields = [f.name for f in Product.__dataclass_fields__.values()]
    with (OUT / "products.csv").open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for row in payload:
            row = dict(row)
            row["categories"] = " | ".join(row["categories"])
            row["images"] = " | ".join(row["images"])
            row["attributes"] = json.dumps(row["attributes"], ensure_ascii=False)
            w.writerow(row)
    (OUT / "product_urls.txt").write_text("\n".join(p.url for p in products if p.url), encoding="utf-8")


def write_summary(products: list[Product], image_ok: int, image_fail: int, errors: list[str], mode: str) -> None:
    summary = {
        "mode": mode,
        "products": len(products),
        "products_with_images": sum(1 for p in products if p.images),
        "image_urls": sum(len(p.images) for p in products),
        "images_downloaded": image_ok,
        "images_failed": image_fail,
        "errors": len(errors),
        "generated_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "errors.log").write_text("\n".join(errors), encoding="utf-8")
    print("SUMMARY", json.dumps(summary, ensure_ascii=False))


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    feed = os.getenv("GROWTENT_XML_URL", "").strip()
    mode = "official-xml" if feed else "public-catalog"

    if feed:
        products = parse_official_xml(feed)
    else:
        rp, sitemaps = robots()
        urls = discover_from_sitemaps(sitemaps)
        if not urls:
            urls = discover_by_crawl(rp)
        if MAX_PRODUCTS > 0:
            urls = urls[:MAX_PRODUCTS]
        print(f"PUBLIC scrape product URLs={len(urls)} workers={WORKERS}")
        products = []
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futures = {ex.submit(parse_public_product, u): u for u in urls}
            done = 0
            for fut in as_completed(futures):
                u = futures[fut]
                try:
                    p = fut.result()
                    if p.title:
                        products.append(p)
                    else:
                        errors.append(f"NO_TITLE {u}")
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"PRODUCT {u} :: {exc}")
                done += 1
                if done % 50 == 0 or done == len(urls):
                    print(f"PRODUCTS done={done}/{len(urls)} ok={len(products)} errors={len(errors)}")
        products.sort(key=lambda x: (int(x.id) if x.id.isdigit() else 10**18, x.title))

    # De-duplicate by stable product id/url.
    dedup: dict[str, Product] = {}
    for p in products:
        key = p.id or p.url or p.title
        if key and key not in dedup:
            dedup[key] = p
    products = list(dedup.values())
    write_exports(products)

    image_ok = image_fail = 0
    if DOWNLOAD_IMAGES:
        items: list[tuple[str, str, int]] = []
        seen: set[tuple[str, str]] = set()
        for p in products:
            pid = p.id or safe_filename(p.title)
            for i, u in enumerate(p.images, 1):
                key = (pid, u)
                if key not in seen:
                    seen.add(key)
                    items.append((pid, u, i))
        print(f"IMAGES queued={len(items)} workers={IMAGE_WORKERS}")
        with ThreadPoolExecutor(max_workers=IMAGE_WORKERS) as ex:
            futures = [ex.submit(download_one_image, item) for item in items]
            for done, fut in enumerate(as_completed(futures), 1):
                pid, url, ok, info = fut.result()
                if ok:
                    image_ok += 1
                else:
                    image_fail += 1
                    errors.append(f"IMAGE {pid} {url} :: {info}")
                if done % 100 == 0 or done == len(items):
                    print(f"IMAGES done={done}/{len(items)} ok={image_ok} failed={image_fail}")

    write_summary(products, image_ok, image_fail, errors, mode)

    zip_path = OUT.parent / "growtent-catalog.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for path in OUT.rglob("*"):
            if path.is_file():
                z.write(path, path.relative_to(OUT.parent))
    print(f"ZIP {zip_path} bytes={zip_path.stat().st_size}")
    if not products:
        print("ERROR: no products exported", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
