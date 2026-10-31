from datetime import datetime, timezone

import pytest

from app.utils.calculations import add_calendar_months, billing_date


@pytest.mark.parametrize(
	("start", "expected_february", "expected_march"),
	[
		(datetime(2025, 1, 31, 9, 0, tzinfo=timezone.utc), 28, 31),
		(datetime(2024, 1, 31, 9, 0, tzinfo=timezone.utc), 29, 31),
	],
)
def test_monthly_billing_clamps_month_end_from_original_anchor(
	start, expected_february, expected_march
):
	assert billing_date(start, 1, "monthly").day == expected_february
	assert billing_date(start, 2, "monthly").day == expected_march


def test_monthly_billing_preserves_timezone_and_time():
	start = datetime(2026, 1, 31, 14, 30, tzinfo=timezone.utc)
	next_date = add_calendar_months(start, 1)
	assert next_date == datetime(2026, 2, 28, 14, 30, tzinfo=timezone.utc)


def test_billing_dates_require_timezone_aware_start():
	with pytest.raises(ValueError, match="timezone-aware"):
		billing_date(datetime(2026, 1, 1), 1, "monthly")
