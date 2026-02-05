async function analisarComGPT(texto) {
  const response = await fetch("http://127.0.0.1:8000/maya-agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ texto }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.detail || "Erro ao chamar Maya Agent");
  }

  if (!Array.isArray(data.ocorrencias)) {
    throw new Error("Resposta inválida do serviço Maya Agent");
  }

  return data.ocorrencias;
}
