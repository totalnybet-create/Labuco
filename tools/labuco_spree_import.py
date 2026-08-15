#!/usr/bin/env python3
"""Guarded Labuco -> Spree Admin API importer.

Designed for the 3316-product Labuco catalog. Safe defaults:
- dry-run unless --commit is supplied,
- products are created as drafts unless --activate is supplied,
- --activate requires LABUCO_ALLOW_PRODUCTION_IMPORT=YES,
- optional --limit enables a small smoke import first,
- deterministic Idempotency-Key per SKU and payload reduces duplicate risk on retries.

Spree Admin API v3 keeps purchasable fields on variants. For a simple product,
an inline variant with an empty ``options`` array addresses the auto-created
master variant. The importer uses that documented shape and performs a
follow-up PATCH after creation so SKU, price and cost are enforced reliably.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any


REQUIRED = ("labuco_sku", "title", "description", "labuco_price_pln", "wholesale_cost_pln")

FIELD_ALIASES = {
    "title": ("title", "our_title"),
    "short_description": ("short_description", "our_short_description"),
    "description": ("description", "our_description"),
    "price_class": ("price_class", "labuco_price_class"),
}


def normalize_record(record: dict[str, Any]) -> dict[str, Any]:
    """Normalize current catalog keys while retaining legacy import support."""
    normalized = dict(record)
    for canonical, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            value = record.get(alias)
            if value not in (None, ""):
                normalized[canonical] = value
                break
    return normalized


def validate(record: dict[str, Any]) -> list[str]:
    record = normalize_record(record)
    errors = []
    for field in REQUIRED:
        if record.get(field) in (None, ""):
            errors.append(f"missing {field}")
    if record.get("price_class") == "C":
        errors.append("price class C requires review")
    return errors


def build_description(record: dict[str, Any]) -> str:
    record = normalize_record(record)
    short = str(record.get("short_description") or "").strip()
    full = str(record.get("description") or "").strip()
    if short and short != full:
        return f"{short}\n\n{full}"
    return full


def source_is_in_stock(record: dict[str, Any]) -> bool:
    """Treat only an explicit source availability signal as sellable stock."""
    raw = record.get("raw")
    if not isinstance(raw, dict):
        return False
    availability = str(raw.get("availability") or "").strip().lower()
    return availability in {"instock", "in_stock", "in stock", "available"}


def commercial_variant(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "sku": str(record["labuco_sku"]),
        "cost_price": str(record["wholesale_cost_pln"]),
        "cost_currency": "PLN",
        # The source catalog has an explicit InStock/OutOfStock flag but no
        # numeric inventory. In-stock supplier items are therefore sellable
        # without local stock tracking; out-of-stock or unknown items keep
        # tracking enabled and remain unavailable at the default quantity 0.
        "track_inventory": not source_is_in_stock(record),
        "options": [],
        "prices": [
            {
                "amount": str(record["labuco_price_pln"]),
                "currency": "PLN",
            }
        ],
    }


def idempotency_key(prefix: str, sku: str, payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    digest = hashlib.sha256(encoded).hexdigest()[:24]
    return f"labuco-{prefix}-{sku}-{digest}"[:255]


def response_price_amount(product: dict[str, Any]) -> Decimal | None:
    price = product.get("price")
    if not isinstance(price, dict):
        return None
    try:
        return Decimal(str(price.get("amount")))
    except (InvalidOperation, TypeError):
        return None


def build_payload(record: dict[str, Any], category_map: dict[str, str], active: bool) -> dict[str, Any]:
    record = normalize_record(record)
    category_id = category_map.get(str(record.get("category") or ""))
    tags = ["Labuco"]
    brand = str(record.get("brand") or "").strip()
    if brand:
        tags.append(brand)

    payload: dict[str, Any] = {
        "name": record["title"],
        "description": build_description(record),
        "status": "active" if active else "draft",
        "tags": tags,
        "variants": [commercial_variant(record)],
    }
    if category_id:
        payload["category_ids"] = [category_id]
    return payload


def request_json(
    base_url: str,
    api_key: str,
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    url = base_url.rstrip("/") + path
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    headers = {
        "Accept": "application/json",
        "x-spree-api-key": api_key,
        "User-Agent": "LabucoCatalogImporter/1.2",
    }
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    request = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers=headers,
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as exc:
            if exc.code not in {429, 502, 503, 504} or attempt == 3:
                raise
            retry_after = exc.headers.get("Retry-After")
            try:
                delay = float(retry_after) if retry_after else 0.5 * (2**attempt)
            except ValueError:
                delay = 0.5 * (2**attempt)
            time.sleep(min(delay, 8.0))

    raise RuntimeError("unreachable HTTP retry state")


def find_product_by_sku(base_url: str, api_key: str, sku: str) -> dict[str, Any] | None:
    query = urllib.parse.urlencode({"q[master_sku_eq]": sku, "limit": 2})
    response = request_json(base_url, api_key, "GET", f"/api/v3/admin/products?{query}")
    products = response.get("data")
    if not isinstance(products, list):
        return None
    for product in products:
        if isinstance(product, dict) and product.get("id"):
            return product
    return None


def find_base_price_id(
    base_url: str,
    api_key: str,
    product: dict[str, Any],
    enforced: dict[str, Any],
) -> str | None:
    for candidate in (enforced, product):
        price = candidate.get("price")
        if isinstance(price, dict) and price.get("id"):
            return str(price["id"])

    variant_id = enforced.get("default_variant_id") or product.get("default_variant_id")
    if not variant_id:
        return None
    query = urllib.parse.urlencode(
        {
            "q[variant_id_eq]": str(variant_id),
            "q[currency_eq]": "PLN",
            "q[price_list_id_null]": "true",
            "limit": 2,
        }
    )
    response = request_json(base_url, api_key, "GET", f"/api/v3/admin/prices?{query}")
    prices = response.get("data")
    if not isinstance(prices, list):
        return None
    for price in prices:
        if isinstance(price, dict) and price.get("id"):
            return str(price["id"])
    return None


def upsert_and_enforce_product(
    base_url: str,
    api_key: str,
    sku: str,
    payload: dict[str, Any],
    pricing_state: dict[str, Decimal] | None = None,
) -> tuple[dict[str, Any], str]:
    pricing_state = pricing_state if pricing_state is not None else {}
    existing = find_product_by_sku(base_url, api_key, sku)
    if existing:
        product_id = existing["id"]
        product = request_json(
            base_url,
            api_key,
            "PATCH",
            f"/api/v3/admin/products/{product_id}",
            payload,
            idempotency_key("product-update", sku, payload),
        )
        action = "updated"
    else:
        product = request_json(
            base_url,
            api_key,
            "POST",
            "/api/v3/admin/products",
            payload,
            idempotency_key("product-create", sku, payload),
        )
        product_id = product.get("id")
        action = "created"

    if not product_id:
        raise RuntimeError(f"Spree {action} response has no product id for {sku}")

    # Spree v5.6 keeps purchasable fields on variants. An entry without option
    # values is an upsert of the simple product's master/default variant. Price
    # is deliberately handled by the dedicated prices endpoint below because
    # Spree 5.6.1 corrupts decimal amounts in nested product price updates.
    variant = {key: value for key, value in payload["variants"][0].items() if key != "prices"}
    commercial = {"variants": [variant]}
    enforced = request_json(
        base_url,
        api_key,
        "PATCH",
        f"/api/v3/admin/products/{product_id}",
        commercial,
        idempotency_key("product-commercial", sku, commercial),
    )

    expected_price = Decimal(str(payload["variants"][0]["prices"][0]["amount"]))
    price_id = find_base_price_id(base_url, api_key, product, enforced)
    if not price_id:
        raise RuntimeError(f"Spree response has no base PLN price id for {sku}")
    decimal_separator = str(pricing_state.get("price_decimal_separator", "."))
    formatted_price = format(expected_price, "f").replace(".", decimal_separator)
    price_payload = {"amount": formatted_price}
    updated_price = request_json(
        base_url,
        api_key,
        "PATCH",
        f"/api/v3/admin/prices/{price_id}",
        price_payload,
        idempotency_key("price-update", sku, price_payload),
    )
    actual_price = response_price_amount({"price": updated_price})
    if actual_price != expected_price and decimal_separator == ".":
        # Spree::LocalizedNumber parses strings with the backend's I18n
        # decimal separator. A Polish backend therefore strips a dot from
        # "25.90" and stores 2590. Retry with a comma and remember the
        # separator for the remainder of this import. English/newer backends
        # keep using the documented dot representation.
        decimal_separator = ","
        pricing_state["price_decimal_separator"] = decimal_separator
        price_payload = {"amount": format(expected_price, "f").replace(".", decimal_separator)}
        updated_price = request_json(
            base_url,
            api_key,
            "PATCH",
            f"/api/v3/admin/prices/{price_id}",
            price_payload,
            idempotency_key("price-locale-fix", sku, price_payload),
        )
        actual_price = response_price_amount({"price": updated_price})

    if actual_price != expected_price:
        raise RuntimeError(
            f"Spree price verification failed for {sku}: expected {expected_price}, got {actual_price}"
        )
    return enforced or product, action


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog", type=Path)
    parser.add_argument("--category-map", type=Path)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--commit", action="store_true")
    parser.add_argument("--activate", action="store_true")
    parser.add_argument("--include-class-c", action="store_true")
    parser.add_argument("--report", type=Path, default=Path("labuco-import-report.json"))
    args = parser.parse_args()

    if args.activate and os.getenv("LABUCO_ALLOW_PRODUCTION_IMPORT") != "YES":
        raise SystemExit("Refusing active import: set LABUCO_ALLOW_PRODUCTION_IMPORT=YES explicitly")

    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    if not isinstance(catalog, list):
        raise SystemExit("Catalog must be a JSON array")

    category_map: dict[str, str] = {}
    if args.category_map:
        category_map = json.loads(args.category_map.read_text(encoding="utf-8"))

    selected = catalog[: args.limit] if args.limit and args.limit > 0 else catalog
    report: dict[str, Any] = {
        "mode": "commit" if args.commit else "dry-run",
        "status": "active" if args.activate else "draft",
        "requested": len(selected),
        "created": 0,
        "updated": 0,
        "skipped": 0,
        "failed": 0,
        "items": [],
    }
    pricing_state: dict[str, Decimal] = {}
    if args.commit:
        base_url = os.getenv("SPREE_API_URL", "").strip()
        api_key = os.getenv("SPREE_API_KEY", "").strip()
        if not base_url or not api_key:
            raise SystemExit("SPREE_API_URL and SPREE_API_KEY are required for --commit")
    else:
        base_url = api_key = ""

    for raw_record in selected:
        if not isinstance(raw_record, dict):
            report["skipped"] += 1
            report["items"].append({"sku": "", "result": "skipped", "reasons": ["record is not an object"]})
            continue

        record = normalize_record(raw_record)
        sku = str(record.get("labuco_sku") or "")
        problems = validate(record)
        if record.get("price_class") == "C" and args.include_class_c:
            problems = [p for p in problems if p != "price class C requires review"]

        if problems:
            report["skipped"] += 1
            report["items"].append({"sku": sku, "result": "skipped", "reasons": problems})
            continue

        payload = build_payload(record, category_map, args.activate)
        variant_payload = payload["variants"][0]
        price_payload = variant_payload["prices"][0]
        if not args.commit:
            report["created"] += 1
            report["items"].append(
                {
                    "sku": sku,
                    "result": "dry-run-ok",
                    "status": payload["status"],
                    "price": price_payload["amount"],
                    "category_mapped": bool(payload.get("category_ids")),
                }
            )
            continue

        try:
            result, action = upsert_and_enforce_product(
                base_url, api_key, sku, payload, pricing_state
            )
            report[action] += 1
            report["items"].append(
                {
                    "sku": sku,
                    "result": action,
                    "id": result.get("id"),
                    "price": price_payload["amount"],
                    "cost_price": variant_payload["cost_price"],
                }
            )
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:1000]
            report["failed"] += 1
            report["items"].append({"sku": sku, "result": "failed", "http": exc.code, "detail": detail})
        except Exception as exc:
            report["failed"] += 1
            report["items"].append({"sku": sku, "result": "failed", "detail": str(exc)})
        time.sleep(0.05)

    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("mode", "status", "requested", "created", "updated", "skipped", "failed")}, ensure_ascii=False))
    for item in [entry for entry in report["items"] if entry.get("result") == "failed"][:10]:
        print(json.dumps(item, ensure_ascii=False), file=sys.stderr)
    return 1 if report["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
