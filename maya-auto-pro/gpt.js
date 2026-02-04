async function analisarComGPT(texto) {
  const response = await fetch("http://127.0.0.1:8000/maya-agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ texto })
  });

  const data = await response.json();

  return data.ocorrencias;
}
