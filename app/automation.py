from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass
class JobResult:
    job_id: str
    executed_at: datetime
    status: str
    details: dict[str, Any]


def run_job(job_id: str, payload: dict[str, Any]) -> JobResult:
    """Executa a automação do serviço.

    Substitua esta lógica pelo fluxo real do seu serviço.
    """
    now = datetime.utcnow()
    result_details = {
        "message": "Automação executada com sucesso (simulação).",
        "payload": payload,
    }
    return JobResult(job_id=job_id, executed_at=now, status="success", details=result_details)
