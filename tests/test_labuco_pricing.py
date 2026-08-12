import importlib.util
from decimal import Decimal
from pathlib import Path
import unittest


MODULE_PATH = Path(__file__).resolve().parents[1] / "tools" / "labuco_pricing.py"
spec = importlib.util.spec_from_file_location("labuco_pricing", MODULE_PATH)
pricing = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(pricing)


class LabucoPricingTests(unittest.TestCase):
    def test_parse_polish_price(self):
        self.assertEqual(pricing.parse_money("27,87 zł ?"), Decimal("27.87"))

    def test_markup_bands(self):
        self.assertEqual(pricing.target_markup(Decimal("40")), Decimal("0.25"))
        self.assertEqual(pricing.target_markup(Decimal("100")), Decimal("0.20"))
        self.assertEqual(pricing.target_markup(Decimal("200")), Decimal("0.17"))
        self.assertEqual(pricing.target_markup(Decimal("500")), Decimal("0.14"))
        self.assertEqual(pricing.target_markup(Decimal("1000")), Decimal("0.11"))

    def test_rounds_up_to_90(self):
        self.assertEqual(pricing.round_to_90(Decimal("34.83")), Decimal("34.90"))
        self.assertEqual(pricing.round_to_90(Decimal("34.91")), Decimal("35.90"))

    def test_price_without_market_reference(self):
        product = pricing.price_product({"source_price_with_question": "100,00 zł ?"})
        self.assertEqual(product["labuco_price_pln"], "120.90")
        self.assertTrue(product["market_check_required"])
        self.assertEqual(product["labuco_price_class"], "A")

    def test_market_cap_can_lower_price_class(self):
        product = pricing.price_product(
            {
                "source_price_with_question": "100,00 zł ?",
                "market_reference_price": "108,00 zł",
            }
        )
        self.assertLessEqual(Decimal(product["labuco_price_pln"]), Decimal("108.90"))
        self.assertIn(product["labuco_price_class"], {"B", "C"})
        self.assertFalse(product["market_check_required"])


if __name__ == "__main__":
    unittest.main()
