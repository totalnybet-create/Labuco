import importlib.util
from pathlib import Path
import unittest


MODULE_PATH = Path(__file__).resolve().parents[1] / "tools" / "labuco_supabase_prepare.py"
spec = importlib.util.spec_from_file_location("labuco_supabase_prepare", MODULE_PATH)
catalog_prepare = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(catalog_prepare)


class LabucoSupabasePrepareTests(unittest.TestCase):
    def test_maps_current_public_scraper_schema_without_faking_b2b_margin(self):
        product = catalog_prepare.prepare(
            {
                "source": "growtent-public",
                "id": "42",
                "title": "Secret Jardin growbox 60x60",
                "producer": "Secret Jardin",
                "sku": "SJ-60",
                "ean": "1234567890123",
                "price_retail_gross": "100,00 PLN",
                "url": "https://www.growtent.pl/product-pol-42-example.html",
                "images": ["https://www.growtent.pl/image-1.jpg"],
            }
        )

        self.assertEqual(product["labuco_sku"], "LAB-00042")
        self.assertEqual(product["brand"], "Secret Jardin")
        self.assertEqual(product["wholesale_cost_pln"], "100.00")
        self.assertEqual(product["labuco_price_pln"], "100.00")
        self.assertEqual(product["price_class"], "C")
        self.assertTrue(product["market_check_required"])
        self.assertEqual(product["reference_image"], "https://www.growtent.pl/image-1.jpg")
        self.assertEqual(product["raw"]["price_source"], "public_retail_reference")

    def test_prices_official_b2b_feed_with_market_reference(self):
        product = catalog_prepare.prepare(
            {
                "source": "quickclick-xml",
                "id": "84",
                "title": "Nawóz testowy 1L",
                "price_b2b_gross": "100.00",
                "price_retail_gross": "150.00",
            }
        )

        self.assertEqual(product["wholesale_cost_pln"], "100.00")
        self.assertEqual(product["labuco_price_pln"], "120.90")
        self.assertEqual(product["price_class"], "A")
        self.assertFalse(product["market_check_required"])
        self.assertEqual(product["raw"]["price_source"], "b2b_gross")


if __name__ == "__main__":
    unittest.main()
