from __future__ import annotations

from dataclasses import asdict
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.automation import process_with_gpt, run_job

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
    resultado = process_with_gpt(req.texto)
    return {"status": "ok", "ocorrencias": resultado}
