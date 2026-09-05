from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from database import SessionLocal
from models import (
    AuditActor,
    AuditLog,
    CommitmentStatus,
    Task,
    TaskStatus,
    TaskType,
)

from payout_service import mock_payout_to_recipient


def mark_expired_tasks_as_failed():

    db = SessionLocal()

    try:

        now = datetime.now(timezone.utc)

        expired_tasks = (
            db.query(Task)
            .filter(
                Task.status == TaskStatus.IN_PROGRESS,
                Task.deadline <= now
            )
            .all()
        )

        for task in expired_tasks:

            # --------------------------------
            # NORMAL TASK
            # --------------------------------
            if task.task_type == TaskType.NORMAL:

                task.status = TaskStatus.FAILED

                continue

            # --------------------------------
            # HIGH STAKES TASK
            # --------------------------------
            commitment = task.high_stakes_commitment

            if commitment is None:
                task.status = TaskStatus.FAILED
                continue

            payment = commitment.payment

            # Mark task and commitment as failed
            task.status = TaskStatus.FAILED
            commitment.status = CommitmentStatus.FAILED
            commitment.evaluated_at = now

            # Perform the simulated payout
            if payment is not None:

                payment = mock_payout_to_recipient(payment)

                # Record the simulated payout
                db.add(
                    AuditLog(
                        user_id=commitment.user_id,
                        commitment_id=commitment.id,
                        event_type="PAYOUT_SIMULATED",
                        actor=AuditActor.SYSTEM,
                        event_metadata={
                            "payment_id": payment.id,
                            "payout_id": payment.razorpay_payout_id,
                            "recipient_id": commitment.recipient_id,
                            "amount": float(payment.amount),
                            "currency": payment.currency,
                            "reason": "HIGH_STAKES_TASK_FAILED",
                        }
                    )
                )

        db.commit()

    except Exception as e:

        db.rollback()

        print(
            f"Error while processing expired tasks: {e}"
        )

    finally:

        db.close()


scheduler = BackgroundScheduler()

scheduler.add_job(
    mark_expired_tasks_as_failed,
    "interval",
    seconds=5
)