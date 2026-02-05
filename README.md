# Servi-o

Aplicação inicial para automatizar serviços. Este projeto fornece uma API simples onde você registra tarefas (jobs), executa manualmente e também processa ocorrências do Maya via IA.

## Requisitos

- Python 3.11+
- `OPENAI_API_KEY` configurada para usar o endpoint `/maya-agent`

## Instalação

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Executar

```bash
uvicorn app.main:app --reload
```

## Endpoints

- `GET /health`: status do serviço + contagem de jobs/logs em memória.
- `POST /jobs`: cria um job.
- `GET /jobs`: lista jobs.
- `POST /jobs/{job_id}/run`: executa um job e retorna o resultado.
- `POST /maya-agent`: transforma texto em ocorrências estruturadas usando IA.
- `GET /maya-agent/logs`: consulta o histórico de chamadas da IA.
- `GET /dashboard`: painel HTML simples com atualização automática dos logs.

## Próximos passos

- Conectar com seu serviço real dentro de `app/automation.py`.
- Persistir jobs em banco de dados.
- Adicionar autenticação.
