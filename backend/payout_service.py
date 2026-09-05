import uuid

from models import PaymentStatus


def mock_payout_to_recipient(payment):

    # Already paid out — don't create another payout
    if payment.status == PaymentStatus.SENT_TO_RECIPIENT:
        return payment

    # A payout can only happen after the original payment succeeded
    if payment.status != PaymentStatus.SUCCESS:
        raise ValueError(
            f"Cannot payout payment in status {payment.status}"
        )

    commitment = payment.commitment
    recipient = commitment.recipient

    if recipient is None:
        raise ValueError("Recipient not found")

    # Generate a fake payout reference
    mock_payout_id = f"mock_payout_{uuid.uuid4().hex[:12]}"

    payment.razorpay_payout_id = mock_payout_id
    payment.status = PaymentStatus.SENT_TO_RECIPIENT

    return payment