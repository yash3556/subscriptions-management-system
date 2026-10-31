import pytest

from app.utils.calculations import (
	allocate_discount,
	calculate_invoice_totals,
	calculate_line_totals,
)


def test_tax_is_calculated_on_discounted_line_subtotal():
	line = calculate_line_totals(
		quantity=2,
		unit_price_paise=100_000,
		discount_paise=10_000,
		tax_rate_bps=1_800,
	)
	assert line == {
		"subtotal_paise": 200_000,
		"discount_paise": 10_000,
		"taxable_paise": 190_000,
		"tax_paise": 34_200,
		"total_paise": 224_200,
	}


def test_money_calculations_reject_invalid_values():
	with pytest.raises(ValueError):
		calculate_line_totals(
			quantity=1,
			unit_price_paise=1_000,
			discount_paise=1_001,
			tax_rate_bps=0,
		)
	with pytest.raises(ValueError):
		calculate_invoice_totals(
			[{"quantity": 1, "unit_price_paise": 1_000, "tax_rate_bps": 10_001}]
		)


def test_fixed_discount_allocates_exactly_across_lines():
	lines = [
		{"quantity": 1, "unit_price_paise": 100},
		{"quantity": 1, "unit_price_paise": 200},
	]
	allocations = allocate_discount(lines, discount_type="fixed", discount_value=50)
	assert allocations == [17, 33]
	assert sum(allocations) == 50
