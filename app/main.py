from __future__ import annotations

from dataclasses import asdict

from datetime import datetime
import time

from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException

from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from app.automation import process_with_gpt, run_job

app = FastAPI(title="Servi-o Automation")

AGENT_LOGS: list[dict[str, Any]] = []


from pydantic import BaseModel, Field

from app.automation import run_job

app = FastAPI(title="Servi-o Automation")



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
    texto: str




JOBS: dict[str, Job] = {}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/jobs", response_model=Job)
async def create_job(job: JobCreate) -> Job:
    job_id = str(uuid4())
    created = Job(id=job_id, name=job.name, payload=job.payload)
    JOBS[job_id] = created
    return created


@app.get("/jobs", response_model=list[Job])
async def list_jobs() -> list[Job]:
    return list(JOBS.values())


@app.post("/jobs/{job_id}/run", response_model=JobExecutionResponse)
async def run_job_endpoint(job_id: str) -> JobExecutionResponse:
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")

    result = run_job(job_id=job.id, payload=job.payload)
    result_dict = asdict(result)
    result_dict["executed_at"] = result.executed_at.isoformat() + "Z"
    return JobExecutionResponse(**result_dict)



@app.post("/maya-agent")
async def maya_agent(req: MayaRequest) -> dict[str, Any]:
    start = time.monotonic()
    resultado = process_with_gpt(req.texto)
    duration_ms = int((time.monotonic() - start) * 1000)
    AGENT_LOGS.append(
        {
            "time": datetime.utcnow().isoformat() + "Z",
            "input": req.texto,
            "output": resultado,
            "duration_ms": duration_ms,
        }
    )
    return {"status": "ok", "ocorrencias": resultado}


@app.get("/maya-agent/logs")
async def maya_agent_logs() -> list[dict[str, Any]]:
    return AGENT_LOGS


@app.get("/maya-agent/panel", response_class=HTMLResponse)
@app.get("/maya-agent/dashboard", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
async def maya_agent_panel() -> HTMLResponse:
    html = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Maya Agent - Painel Live</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { font-size: 20px; margin-bottom: 12px; }
    .log { border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
    .meta { color: #555; font-size: 12px; margin-bottom: 6px; }
    pre { background: #f7f7f7; padding: 8px; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>📡 Maya Agent - Painel Live</h1>
  <div id="logs">Carregando...</div>
  <script>
    async function carregar() {
      const response = await fetch('/maya-agent/logs');
      const data = await response.json();
      const logsEl = document.getElementById('logs');
      if (!data.length) {
        logsEl.textContent = 'Sem execuções ainda.';
        return;
      }
      logsEl.innerHTML = '';
      data.slice().reverse().forEach((log) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'log';
        wrapper.innerHTML = `
          <div class="meta">⏱ ${log.time} • ${log.duration_ms} ms</div>
          <strong>Entrada</strong>
          <pre>${log.input}</pre>
          <strong>Saída</strong>
          <pre>${JSON.stringify(log.output, null, 2)}</pre>
        `;
        logsEl.appendChild(wrapper);
      });
    }
    carregar();
    setInterval(carregar, 2000);
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html)