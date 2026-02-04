
async function analisarComGPT(texto) {
  const response = await fetch("http://127.0.0.1:8000/maya-agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ texto })

async function analisarComGPT(texto, apiKey) {
  const promptDoUsuario = `
Transforme esse texto em JSON no formato:

[
  {
    "start": "HH:MM",
    "end": "HH:MM",
    "motivo": "UM DOS MOTIVOS PERMITIDOS",
    "paralisado": "S" ou "N",
    "descricao": "curta e objetiva"
  }
]

Responda SOMENTE o JSON.

Motivos permitidos (EXATO):
- Almoço
- DDS
- Mobilização
- Desmobilização
- Organização
- Mal Tempo - Chuva/Trovoada
- Concreto - Aguardando Entrega
- Concreto - Aguardando Bomba
- Concreto - Entupimento
- Concreto - Problema na Bomba
- Falta de Acesso
- Falta de Marcação
- Troca de Trado
- Outro Motivo

Paralisado:
- "aguardando", "parado", "chuva" → "S"
- Almoço ou DDS → "N"
- outros → "N"

Ignore linhas sem intervalo HH:MM às HH:MM.

Texto:
${texto}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Você é um agente especialista em ocorrências do Maya."
        },
        {
          role: "user",
          content: promptDoUsuario
        }
      ],
      temperature: 0.2
    })

  });

  const data = await response.json();


  return data.ocorrencias;

  return JSON.parse(data.choices[0].message.content);
