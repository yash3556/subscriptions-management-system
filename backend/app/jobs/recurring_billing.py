from __future__ import annotations

import asyncio
import logging
from typing import Any

from pymongo.errors import PyMongoError
from starlette.concurrency import run_in_threadpool

from app.services.billing_service import generate_due_invoices
from app.services.payment_service import reconcile_pending_payments

logger = logging.getLogger("brightloop.billing")


def run_billing_cycle(database: Any) -> dict[str, int]:
	generated = generate_due_invoices(database)
	reconciled = reconcile_pending_payments(database)
	return {"invoices_generated": len(generated), "payments_reconciled": reconciled}


async def billing_worker(application: Any, interval_seconds: int = 60) -> None:
	while True:
		try:
			result = await run_in_threadpool(
				run_billing_cycle,
				application.state.mongo.database,
			)
			if result["invoices_generated"] or result["payments_reconciled"]:
				logger.info("billing_cycle_completed", extra=result)
		except PyMongoError as exc:
			logger.error(
				"billing_cycle_database_failure",
				extra={"exception_type": type(exc).__name__},
			)
		except Exception as exc:
			logger.error(
				"billing_cycle_failed",
				extra={"exception_type": type(exc).__name__},
			)
		await asyncio.sleep(interval_seconds)
