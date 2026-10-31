from __future__ import annotations

import smtplib
from email.message import EmailMessage
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl

from app.core.config import Settings


class EmailDeliveryError(RuntimeError):
    pass


def build_password_reset_link(base_url: str, token: str) -> str:
    parts = urlsplit(base_url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query["token"] = token
    return urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
    )


def send_password_reset_email(
    settings: Settings,
    recipient: str,
    reset_link: str,
) -> None:
    if not settings.smtp_host:
        raise EmailDeliveryError("SMTP is not configured")
    message = EmailMessage()
    message["Subject"] = "Reset your Brightloop password"
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(
        "A password reset was requested for your Brightloop account.\n\n"
        f"Use this single-use link before it expires:\n{reset_link}\n\n"
        "If you did not request this, you can ignore this email."
    )

    try:
        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
            ) as smtp:
                _authenticate_and_send(smtp, settings, message)
        else:
            with smtplib.SMTP(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
            ) as smtp:
                smtp.ehlo()
                if settings.smtp_use_tls:
                    smtp.starttls()
                    smtp.ehlo()
                _authenticate_and_send(smtp, settings, message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("Password reset email delivery failed") from exc


def _authenticate_and_send(
    smtp: smtplib.SMTP | smtplib.SMTP_SSL,
    settings: Settings,
    message: EmailMessage,
) -> None:
    if settings.smtp_username:
        smtp.login(settings.smtp_username, settings.smtp_password or "")
    smtp.send_message(message)