async function cadastrarOcorrencia(oc, operador, maquina) {

  document.querySelector("#operator_id").value = operador;
  document.querySelector("#equipment_id").value = maquina;

  document.querySelector("#description").value = oc.descricao;

  document.querySelector("#start-time").value = oc.start;
  document.querySelector("#end-time").value = oc.end;

  console.log("✅ Cadastrando:", oc.descricao);

  document.querySelector("button[type='submit']").click();
}

async function cadastrarLista(lista, operador, maquina) {

  for (let i = 0; i < lista.length; i++) {

    await cadastrarOcorrencia(lista[i], operador, maquina);

    alert(`✅ Salvando ${i+1}/${lista.length}`);

    await new Promise(r => setTimeout(r, 4000));

    window.location.href =
      "https://mayasistemas.com.br/sistema/index.php?menu=occurrence_create";

    await new Promise(r => setTimeout(r, 4000));
  }

  alert("✅ Todas ocorrências cadastradas!");
}

window.addEventListener("message", (event) => {

  if (event.data.type === "MAYA_AUTO_PRO") {
    cadastrarLista(
      event.data.lista,
      event.data.operador,
      event.data.maquina
    );
  }

});
