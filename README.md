# Servi-o

Aplicação inicial para automatizar serviços. Este projeto fornece uma API simples onde você registra tarefas (jobs) e pode disparar a execução manualmente.

## Requisitos

- Python 3.11+

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

- `GET /health`: status do serviço.
- `POST /jobs`: cria um job.
- `GET /jobs`: lista jobs.
- `POST /jobs/{job_id}/run`: executa um job e retorna o resultado.

## Próximos passos

- Conectar com seu serviço real dentro de `app/automation.py`.
- Persistir jobs em banco de dados.
- Adicionar autenticação.
