#!/usr/bin/env python3
"""Dynamic Labuco retail pricing.

Input: JSON array of Labuco catalog records.
Output: JSON array enriched with retail pricing fields.

The engine is intentionally deterministic and conservative:
- target markup falls as wholesale cost rises,
- an optional market reference caps Labuco at a competitive level,
- products are classified A/B/C by realized markup,
- prices are rounded to Polish e-commerce endings (x.90).

No network access is performed here. If market_reference_price is absent,
the engine uses only the wholesale cost and marks market_check_required=True.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any


MONEY_RE = re.compile(r"(-?\d[\d\s]*(?:[.,]\d{1,2})?)")


def parse_money(value: Any) -> Decimal:
    if isinstance(value, (int, float, Decimal)):
        return Decimal(str(value))
    if value is None:
        raise ValueError("missing price")
    match = MONEY_RE.search(str(value).replace("\xa0", " "))
    if not match:
        raise ValueError(f"cannot parse price: {value!r}")
    normalized = match.group(1).replace(" ", "").replace(",", ".")
    return Decimal(normalized)


def target_markup(cost: Decimal) -> Decimal:
    if cost <= Decimal("50"):
        return Decimal("0.25")
    if cost <= Decimal("150"):
        return Decimal("0.20")
    if cost <= Decimal("300"):
        return Decimal("0.17")
    if cost <= Decimal("700"):
        return Decimal("0.14")
    return Decimal("0.11")


def round_to_90(value: Decimal) -> Decimal:
    """Round UP to the nearest price ending in .90."""
    whole = value.to_integral_value(rounding="ROUND_FLOOR")
    candidate = whole + Decimal("0.90")
    if candidate < value:
        candidate += Decimal("1.00")
    return candidate.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def classify(realized_markup: Decimal, gross_profit: Decimal) -> str:
    if realized_markup >= Decimal("0.15") and gross_profit >= Decimal("8"):
        return "A"
    if realized_markup >= Decimal("0.08") and gross_profit >= Decimal("3"):
        return "B"
    return "C"


def price_product(record: dict[str, Any]) -> dict[str, Any]:
    cost = parse_money(
        record.get("wholesale_cost_pln")
        or record.get("source_price_with_question")
        or record.get("source_price")
        or record.get("price_pln")
        or record.get("price")
    )
    markup = target_markup(cost)
    target = round_to_90(cost * (Decimal("1") + markup))

    market_raw = record.get("market_reference_price")
    market_price = None
    if market_raw not in (None, ""):
        market_price = parse_money(market_raw)
        competitive_cap = round_to_90(market_price * Decimal("0.985"))
        # Never sell below cost; if the market is below cost, retain cost + 1 grosz
        # and classify the product as C for review.
        floor = cost + Decimal("0.01")
        retail = max(floor, min(target, competitive_cap))
    else:
        retail = target

    gross_profit = retail - cost
    realized_markup = gross_profit / cost if cost else Decimal("0")
    margin_on_sale = gross_profit / retail if retail else Decimal("0")
    tier = classify(realized_markup, gross_profit)

    enriched = dict(record)
    enriched.update(
        {
            "wholesale_cost_pln": f"{cost:.2f}",
            "labuco_price_pln": f"{retail:.2f}",
            "labuco_gross_profit_pln": f"{gross_profit:.2f}",
            "labuco_markup_pct": float((realized_markup * 100).quantize(Decimal("0.01"))),
            "labuco_margin_pct": float((margin_on_sale * 100).quantize(Decimal("0.01"))),
            "price_class": tier,
            "target_markup_pct": float((markup * 100).quantize(Decimal("0.01"))),
            "market_check_required": market_price is None,
            "market_reference_price_pln": f"{market_price:.2f}" if market_price is not None else None,
        }
    )
    return enriched


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    records = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        raise SystemExit("Input must be a JSON array")

    priced = []
    errors = []
    for record in records:
        try:
            priced.append(price_product(record))
        except Exception as exc:  # keep batch deterministic and auditable
            errors.append({"labuco_sku": record.get("labuco_sku"), "error": str(exc)})

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(priced, ensure_ascii=False, indent=2), encoding="utf-8")

    classes = {"A": 0, "B": 0, "C": 0}
    for item in priced:
        classes[item["price_class"]] += 1
    print(json.dumps({"priced": len(priced), "errors": len(errors), "classes": classes}, ensure_ascii=False))
    if errors:
        err_path = args.output.with_suffix(".errors.json")
        err_path.write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
