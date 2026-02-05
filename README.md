# Servi-o

Aplicação para automatizar serviços. O projeto tem:

- API FastAPI para cadastro/execução de jobs.
- Endpoint de IA (`/maya-agent`) para converter relato em ocorrências estruturadas.
- Extensão Chrome `maya-auto-pro` para preencher ocorrências no Maya de forma autônoma.

## Requisitos

- Python 3.11+
- `OPENAI_API_KEY` configurada para usar o endpoint `/maya-agent`
- Google Chrome (para usar a extensão)

## Instalação da API

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Executar API

```bash
uvicorn app.main:app --reload
```

## Endpoints da API

- `GET /health`: status do serviço + contagem de jobs/logs em memória.
- `POST /jobs`: cria um job.
- `GET /jobs`: lista jobs.
- `POST /jobs/{job_id}/run`: executa um job e retorna o resultado.
- `POST /maya-agent`: transforma texto em ocorrências estruturadas usando IA.
- `GET /maya-agent/logs`: consulta o histórico de chamadas da IA.
- `GET /dashboard`: painel HTML simples com atualização automática dos logs.

## Extensão Maya Auto PRO (autônoma)

1. Abra `chrome://extensions` e ative **Modo do desenvolvedor**.
2. Clique em **Carregar sem compactação** e selecione `maya-auto-pro/`.
3. Com a API rodando em `http://127.0.0.1:8000`, abra a extensão.
4. Clique em **Abrir Maya**, selecione Operador/Máquina, cole o relatório e use:
   - **Estruturar com GPT** para gerar JSON de ocorrências.
   - **Executar Automático** para envio autônomo com progresso em tempo real.

A automação mantém estado entre recarregamentos de página e continua o lote até finalizar ou encontrar erro.
