from __future__ import annotations

from dataclasses import asdict
from datetime import UTC, datetime
import time
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from app.automation import process_with_gpt, run_job


app = FastAPI(title="Servi-o Automation")

AGENT_LOGS: list[dict[str, Any]] = []
MAX_AGENT_LOGS = 500


# ================= MODELS =================

class JobCreate(BaseModel):
    name: str = Field(..., min_length=2)
    payload: dict[str, Any] = Field(default_factory=dict)


class Job(BaseModel):
    id: str
    name: str
    payload: dict[str, Any]


class JobExecutionResponse(BaseModel):
    job_id: str
    executed_at: str
    status: str
    details: dict[str, Any]


class MayaRequest(BaseModel):
    texto: str = Field(..., min_length=1)


JOBS: dict[str, Job] = {}


# ================= ROUTES =================

@app.get("/health")
async def health():
    return {"status": "ok", "jobs": len(JOBS), "logs": len(AGENT_LOGS)}


@app.post("/jobs", response_model=Job)
async def create_job(job: JobCreate):

    job_id = str(uuid4())
    created = Job(id=job_id, name=job.name, payload=job.payload)
    JOBS[job_id] = created

    return created


@app.get("/jobs", response_model=list[Job])
async def list_jobs():
    return list(JOBS.values())


@app.post("/jobs/{job_id}/run", response_model=JobExecutionResponse)
async def run_job_endpoint(job_id: str):

    job = JOBS.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")

    result = run_job(job_id=job.id, payload=job.payload)

    result_dict = asdict(result)
    result_dict["executed_at"] = result.executed_at.isoformat()

    return JobExecutionResponse(**result_dict)


@app.post("/maya-agent")
async def maya_agent(req: MayaRequest):

    start = time.monotonic()

    try:
        resultado = process_with_gpt(req.texto)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Resposta inválida do modelo: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao processar com IA: {exc}") from exc

    duration_ms = int((time.monotonic() - start) * 1000)

    AGENT_LOGS.append(
        {
            "time": datetime.now(UTC).isoformat(),
            "input": req.texto,
            "output": resultado,
            "duration_ms": duration_ms,
        }
    )

    # Mantém somente os logs mais recentes em memória.
    if len(AGENT_LOGS) > MAX_AGENT_LOGS:
        del AGENT_LOGS[:-MAX_AGENT_LOGS]

    return {"status": "ok", "ocorrencias": resultado}


@app.get("/maya-agent/logs")
async def maya_agent_logs():
    return AGENT_LOGS


@app.get("/dashboard", response_class=HTMLResponse)
async def maya_agent_panel():

    html = """
<!DOCTYPE html>
<html>
<head>
<title>Maya Agent Live</title>
</head>
<body>

<h1>📡 Maya Agent Live</h1>
<pre id="logs"></pre>

<script>

async function atualizar(){
    const res = await fetch('/maya-agent/logs');
    const data = await res.json();
    document.getElementById("logs").innerText =
        JSON.stringify(data,null,2);
}

setInterval(atualizar,2000);

</script>

</body>
</html>
"""

    return HTMLResponse(content=html)
