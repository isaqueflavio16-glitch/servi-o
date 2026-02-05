from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import json
import os
from typing import Any

from openai import OpenAI


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


PROMPT_BASE = """
Você é um agente especialista em ocorrências do Maya.

Transforme o texto em JSON:

[
  {
    "start": "HH:MM",
    "end": "HH:MM",
    "motivo": "UM DOS MOTIVOS PERMITIDOS",
    "paralisado": "S ou N",
    "descricao": "curta"
  }
]

Motivos permitidos:
Almoço, DDS, Mobilização, Desmobilização,
Organização, Mal Tempo - Chuva/Trovoada,
Concreto - Aguardando Entrega,
Concreto - Aguardando Bomba,
Concreto - Entupimento,
Concreto - Problema na Bomba,
Falta de Acesso,
Falta de Marcação,
Troca de Trado,
Outro Motivo

Responda SOMENTE JSON.
"""


@dataclass
class JobResult:
    job_id: str
    executed_at: datetime
    status: str
    details: dict[str, Any]


def run_job(job_id: str, payload: dict[str, Any]) -> JobResult:

    now = datetime.utcnow()

    result_details = {
        "message": "Automação executada com sucesso (simulação).",
        "payload": payload,
    }

    return JobResult(
        job_id=job_id,
        executed_at=now,
        status="success",
        details=result_details,
    )


def process_with_gpt(texto: str) -> list[dict[str, Any]]:

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[
            {"role": "system", "content": PROMPT_BASE},
            {"role": "user", "content": f"Texto:\n{texto}"},
        ],
    )

    content = response.choices[0].message.content

    return json.loads(content)
