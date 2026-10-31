from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.utils.email import EmailDeliveryError, send_password_reset_email


def test_password_reset_email_uses_configured_smtp(
    settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings.smtp_host = "smtp.example.test"
    settings.smtp_username = "sender@example.test"
    settings.smtp_password = "test-app-password"
    settings.smtp_from_email = "sender@example.test"
    smtp = MagicMock()
    smtp.__enter__.return_value = smtp

    monkeypatch.setattr("app.utils.email.smtplib.SMTP", lambda *_args, **_kwargs: smtp)

    reset_link = "https://app.example.test/reset-password?token=single-use-token"
    send_password_reset_email(settings, "customer@example.test", reset_link)

    smtp.starttls.assert_called_once_with()
    smtp.login.assert_called_once_with("sender@example.test", "test-app-password")
    message = smtp.send_message.call_args.args[0]
    assert message["To"] == "customer@example.test"
    assert message["From"] == "sender@example.test"
    assert reset_link in message.get_content()


def test_password_reset_email_fails_explicitly_without_smtp(
    settings,
) -> None:
    with pytest.raises(EmailDeliveryError, match="SMTP is not configured"):
        send_password_reset_email(
            settings,
            "customer@example.test",
            "https://app.example.test/reset-password?token=single-use-token",
        )
