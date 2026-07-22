# backend/app/services/push_service.py
"""
Serviço responsável por enviar notificações Web Push.

Depende das variáveis de ambiente:
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY_PEM
- VAPID_ADMIN_EMAIL   (ex: "mailto:contato@lattech.com.br")

Gere essas chaves rodando o script generate_vapid_keys.py uma única vez.
"""
import os
import json
import logging
from sqlmodel import Session, select
from pywebpush import webpush, WebPushException

from app.models import PushSubscription

logger = logging.getLogger(__name__)

VAPID_PRIVATE_KEY_PEM = os.getenv("VAPID_PRIVATE_KEY_PEM")
VAPID_ADMIN_EMAIL = os.getenv("VAPID_ADMIN_EMAIL", "mailto:admin@lattech.com.br")


def notify_new_appointment(
    session: Session,
    company_id: int,
    customer_name: str,
    service_name: str,
    time_str: str,
) -> None:
    """
    Busca todas as inscrições de push da empresa e envia a notificação
    de novo agendamento pra cada uma. Falhas de envio (ex: inscrição
    expirada) não devem quebrar a criação do agendamento - só logamos
    e seguimos em frente.
    """
    if not VAPID_PRIVATE_KEY_PEM:
        logger.warning("VAPID_PRIVATE_KEY_PEM não configurada - notificação push ignorada.")
        return

    subscriptions = session.exec(
        select(PushSubscription).where(PushSubscription.company_id == company_id)
    ).all()

    if not subscriptions:
        return

    payload = json.dumps({
        "title": "Novo agendamento! 🗓️",
        "body": f"{customer_name} marcou {service_name} às {time_str}",
        "url": "/admin/dashboard",
    })

    expired_ids = []

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth,
                    },
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY_PEM,
                vapid_claims={"sub": VAPID_ADMIN_EMAIL},
            )
        except WebPushException as ex:
            status_code = getattr(ex.response, "status_code", None)
            # 404/410 = a inscrição não existe mais (usuário desinstalou, trocou de navegador, etc.)
            if status_code in (404, 410):
                expired_ids.append(sub.id)
            else:
                logger.error(f"Erro ao enviar push pra subscription {sub.id}: {ex}")
        except Exception as ex:
            logger.error(f"Erro inesperado ao enviar push pra subscription {sub.id}: {ex}")

    # Limpa inscrições mortas pra não tentar de novo no futuro
    if expired_ids:
        for sub_id in expired_ids:
            sub_obj = session.get(PushSubscription, sub_id)
            if sub_obj:
                session.delete(sub_obj)
        session.commit()