#!/usr/bin/env python3
"""Guarded Labuco -> Spree Admin API importer.

Designed for the 3316-product Labuco catalog. Safe defaults:
- dry-run unless --commit is supplied,
- products are created as drafts unless --activate is supplied,
- --activate requires LABUCO_ALLOW_PRODUCTION_IMPORT=YES,
- optional --limit enables a small smoke import first,
- deterministic Idempotency-Key per SKU reduces duplicate risk on retries.

Spree Admin API v3 accepts SKU/price/cost fields on a product. The importer
performs a follow-up PATCH after creation to enforce those commercial fields on
the product's default variant as well. This makes imports resilient across
Spree minor versions where create/update parameter handling may differ.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


REQUIRED = (
    "labuco_sku",
    "our_title",
    "our_description",
    "labuco_price_pln",
    "wholesale_cost_pln",
)


def validate(record: dict[str, Any]) -> list[str]:
    errors = []
    for field in REQUIRED:
        if record.get(field) in (None, ""):
            errors.append(f"missing {field}")
    if record.get("labuco_price_class") == "C":
        errors.append("price class C requires review")
    return errors


def build_description(record: dict[str, Any]) -> str:
    short = str(record.get("our_short_description") or "").strip()
    full = str(record.get("our_description") or "").strip()
    if short and short != full:
        return f"{short}\n\n{full}"
    return full


def commercial_fields(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "sku": str(record["labuco_sku"]),
        "price": float(record["labuco_price_pln"]),
        "cost_price": float(record["wholesale_cost_pln"]),
        "cost_currency": "PLN",
    }


def build_payload(record: dict[str, Any], category_map: dict[str, str], active: bool) -> dict[str, Any]:
    category_id = category_map.get(str(record.get("category") or ""))
    tags = ["Labuco"]
    brand = str(record.get("brand") or "").strip()
    if brand:
        tags.append(brand)

    payload: dict[str, Any] = {
        "name": record["our_title"],
        "description": build_description(record),
        "status": "active" if active else "draft",
        "tags": tags,
        **commercial_fields(record),
    }
    if category_id:
        payload["category_ids"] = [category_id]
    return payload


def request_json(
    base_url: str,
    api_key: str,
    method: str,
    path: str,
    payload: dict[str, Any],
    idempotency_key: str,
) -> dict[str, Any]:
    url = base_url.rstrip("/") + path
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-spree-api-key": api_key,
            "Idempotency-Key": idempotency_key,
            "User-Agent": "LabucoCatalogImporter/1.1",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def create_and_enforce_product(
    base_url: str,
    api_key: str,
    sku: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    created = request_json(
        base_url,
        api_key,
        "POST",
        "/api/v3/admin/products",
        payload,
        f"labuco-product-{sku}",
    )
    product_id = created.get("id")
    if not product_id:
        raise RuntimeError(f"Spree create response has no product id for {sku}")

    # The v3 Admin API documents sku/price/cost_price/cost_currency as product
    # update fields. Enforce them after create so the default variant is
    # populated even on versions where POST silently ignores one of them.
    enforced = request_json(
        base_url,
        api_key,
        "PATCH",
        f"/api/v3/admin/products/{product_id}",
        {
            "sku": payload["sku"],
            "price": payload["price"],
            "cost_price": payload["cost_price"],
            "cost_currency": payload["cost_currency"],
        },
        f"labuco-product-commercial-{sku}",
    )
    return enforced or created


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
        "skipped": 0,
        "failed": 0,
        "items": [],
    }

    if args.commit:
        base_url = os.getenv("SPREE_API_URL", "").strip()
        api_key = os.getenv("SPREE_API_KEY", "").strip()
        if not base_url or not api_key:
            raise SystemExit("SPREE_API_URL and SPREE_API_KEY are required for --commit")
    else:
        base_url = api_key = ""

    for record in selected:
        sku = str(record.get("labuco_sku") or "")
        problems = validate(record)
        if record.get("labuco_price_class") == "C" and args.include_class_c:
            problems = [p for p in problems if p != "price class C requires review"]

        if problems:
            report["skipped"] += 1
            report["items"].append({"sku": sku, "result": "skipped", "reasons": problems})
            continue

        payload = build_payload(record, category_map, args.activate)
        if not args.commit:
            report["created"] += 1
            report["items"].append(
                {
                    "sku": sku,
                    "result": "dry-run-ok",
                    "status": payload["status"],
                    "price": payload["price"],
                    "category_mapped": bool(payload.get("category_ids")),
                }
            )
            continue

        try:
            result = create_and_enforce_product(base_url, api_key, sku, payload)
            report["created"] += 1
            report["items"].append(
                {
                    "sku": sku,
                    "result": "created",
                    "id": result.get("id"),
                    "price": result.get("price", {}).get("amount") if isinstance(result.get("price"), dict) else result.get("price"),
                    "cost_price": result.get("cost_price"),
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
    print(json.dumps({k: report[k] for k in ("mode", "status", "requested", "created", "skipped", "failed")}, ensure_ascii=False))
    return 1 if report["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
