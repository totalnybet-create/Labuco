import importlib.util
from pathlib import Path
import unittest
from unittest import mock


MODULE_PATH = Path(__file__).resolve().parents[1] / "tools" / "labuco_spree_import.py"
spec = importlib.util.spec_from_file_location("labuco_spree_import", MODULE_PATH)
spree_import = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(spree_import)


def catalog_record(**overrides):
    record = {
        "labuco_sku": "LAB-TEST-001",
        "brand": "Labuco Test",
        "title": "Namiot testowy",
        "short_description": "Krótki opis.",
        "description": "Pełny opis produktu.",
        "category": "Namioty",
        "wholesale_cost_pln": "100.00",
        "labuco_price_pln": "120.90",
        "price_class": "A",
        "raw": {"availability": "InStock"},
    }
    record.update(overrides)
    return record


class LabucoSpreeImportTests(unittest.TestCase):
    def test_accepts_current_catalog_schema(self):
        record = catalog_record()
        self.assertEqual(spree_import.validate(record), [])

        payload = spree_import.build_payload(record, {"Namioty": "category-1"}, active=False)

        self.assertEqual(payload["name"], "Namiot testowy")
        self.assertEqual(payload["description"], "Krótki opis.\n\nPełny opis produktu.")
        self.assertEqual(payload["category_ids"], ["category-1"])
        self.assertEqual(payload["status"], "draft")
        self.assertEqual(
            payload["variants"],
            [
                {
                    "sku": "LAB-TEST-001",
                    "cost_price": "100.00",
                    "cost_currency": "PLN",
                    "track_inventory": False,
                    "options": [],
                    "prices": [{"amount": "120.90", "currency": "PLN"}],
                }
            ],
        )

    def test_out_of_stock_and_unknown_products_remain_unavailable(self):
        out_of_stock = spree_import.commercial_variant(
            catalog_record(raw={"availability": "OutOfStock"})
        )
        unknown = spree_import.commercial_variant(catalog_record(raw={}))

        self.assertTrue(out_of_stock["track_inventory"])
        self.assertTrue(unknown["track_inventory"])

    def test_retains_legacy_schema_compatibility(self):
        record = catalog_record()
        record["our_title"] = record.pop("title")
        record["our_short_description"] = record.pop("short_description")
        record["our_description"] = record.pop("description")
        record["labuco_price_class"] = record.pop("price_class")

        self.assertEqual(spree_import.validate(record), [])
        self.assertEqual(spree_import.build_payload(record, {}, active=True)["name"], "Namiot testowy")

    def test_class_c_requires_explicit_review(self):
        self.assertEqual(spree_import.validate(catalog_record(price_class="C")), ["price class C requires review"])

    def test_missing_current_title_is_reported(self):
        self.assertEqual(spree_import.validate(catalog_record(title="")), ["missing title"])

    def test_idempotency_key_tracks_payload_changes(self):
        original = spree_import.idempotency_key("product-update", "LAB-TEST-001", {"price": "120.90"})
        retry = spree_import.idempotency_key("product-update", "LAB-TEST-001", {"price": "120.90"})
        repriced = spree_import.idempotency_key("product-update", "LAB-TEST-001", {"price": "121.90"})
        self.assertEqual(original, retry)
        self.assertNotEqual(original, repriced)

    def test_creates_product_when_sku_is_new(self):
        payload = spree_import.build_payload(catalog_record(), {}, active=False)
        responses = [
            {"data": []},
            {"id": "prod-new"},
            {"id": "prod-new", "price": {"amount": "120.90"}},
        ]
        with mock.patch.object(spree_import, "request_json", side_effect=responses) as request:
            product, action = spree_import.upsert_and_enforce_product(
                "https://spree.example", "sk_test", "LAB-TEST-001", payload
            )

        self.assertEqual(action, "created")
        self.assertEqual(product["id"], "prod-new")
        self.assertEqual(request.call_args_list[0].args[2], "GET")
        self.assertEqual(request.call_args_list[1].args[2], "POST")
        self.assertEqual(request.call_args_list[2].args[2], "PATCH")
        self.assertEqual(
            request.call_args_list[2].args[4],
            {"variants": payload["variants"]},
        )

    def test_updates_product_when_sku_exists(self):
        payload = spree_import.build_payload(catalog_record(), {}, active=False)
        responses = [
            {"data": [{"id": "prod-existing"}]},
            {"id": "prod-existing"},
            {"id": "prod-existing", "price": {"amount": "120.90"}},
        ]
        with mock.patch.object(spree_import, "request_json", side_effect=responses) as request:
            product, action = spree_import.upsert_and_enforce_product(
                "https://spree.example", "sk_test", "LAB-TEST-001", payload
            )

        self.assertEqual(action, "updated")
        self.assertEqual(product["id"], "prod-existing")
        self.assertEqual(request.call_args_list[0].args[2], "GET")
        self.assertEqual(request.call_args_list[1].args[2], "PATCH")
        self.assertEqual(request.call_args_list[2].args[2], "PATCH")

    def test_corrects_spree_nested_price_subunit_regression(self):
        payload = spree_import.build_payload(catalog_record(), {}, active=False)
        responses = [
            {"data": []},
            {"id": "prod-new"},
            {"id": "prod-new", "price": {"amount": "12090.0"}},
            {"id": "prod-new", "price": {"amount": "120.90"}},
        ]
        with mock.patch.object(spree_import, "request_json", side_effect=responses) as request:
            product, action = spree_import.upsert_and_enforce_product(
                "https://spree.example", "sk_test", "LAB-TEST-001", payload
            )

        self.assertEqual(action, "created")
        self.assertEqual(product["price"]["amount"], "120.90")
        self.assertEqual(
            request.call_args_list[3].args[4]["variants"][0]["prices"][0]["amount"],
            "1.209",
        )

    def test_reuses_detected_price_divisor_during_bulk_import(self):
        first = spree_import.build_payload(catalog_record(), {}, active=True)
        second = spree_import.build_payload(
            catalog_record(labuco_sku="LAB-TEST-002", labuco_price_pln="50.00"),
            {},
            active=True,
        )
        pricing_state = {}
        responses = [
            {"data": []},
            {"id": "prod-first", "price": {"amount": "12090.0"}},
            {"id": "prod-first", "price": {"amount": "120.90"}},
            {"data": []},
            {"id": "prod-second", "price": {"amount": "50.00"}},
            {"id": "prod-second", "price": {"amount": "50.00"}},
        ]

        with mock.patch.object(spree_import, "request_json", side_effect=responses) as request:
            spree_import.upsert_and_enforce_product(
                "https://spree.example",
                "sk_test",
                "LAB-TEST-001",
                first,
                pricing_state,
            )
            spree_import.upsert_and_enforce_product(
                "https://spree.example",
                "sk_test",
                "LAB-TEST-002",
                second,
                pricing_state,
            )

        self.assertEqual(pricing_state["nested_price_divisor"], spree_import.Decimal("100"))
        self.assertEqual(
            request.call_args_list[4].args[4]["variants"][0]["prices"][0]["amount"],
            "0.50",
        )
        self.assertEqual(len(request.call_args_list), 6)

    def test_accepts_draft_response_that_omits_resolved_price(self):
        payload = spree_import.build_payload(catalog_record(), {}, active=False)
        responses = [{"data": []}, {"id": "prod-new"}, {"id": "prod-new"}]
        with mock.patch.object(spree_import, "request_json", side_effect=responses):
            product, action = spree_import.upsert_and_enforce_product(
                "https://spree.example", "sk_test", "LAB-TEST-001", payload
            )

        self.assertEqual(action, "created")
        self.assertEqual(product["id"], "prod-new")


if __name__ == "__main__":
    unittest.main()
