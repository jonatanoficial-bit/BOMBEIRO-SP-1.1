const KEY = 'ADMIN_NORMAS_JSON';

function save(){
  const txt = document.getElementById('jsonInput').value;
  try{
    JSON.parse(txt);
    localStorage.setItem(KEY, txt);
    alert('Normas salvas com sucesso');
  }catch(e){
    alert('JSON inválido');
  }
}

function load(){
  const f = document.getElementById('fileInput').files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=> document.getElementById('jsonInput').value = r.result;
  r.readAsText(f);
}

function exportJson(){
  const txt = document.getElementById('jsonInput').value;
  const blob = new Blob([txt], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'normas.json';
  a.click();
}

function loadPresetSP2025(){
  const preset = {
  "meta": {
    "name": "SP (Modelo 2025) - Parâmetros Automação",
    "updatedAt": "2026-02-02",
    "refs": [
      "Decreto SP nº 69.118/2024",
      "IT-21/2025 (Extintores)",
      "IT-20/2025 (Sinalização)",
      "IT-18/2025 (Iluminação) + ABNT NBR 10898",
      "IT-17/2025 (Brigada) + ABNT NBR 14276"
    ],
    "warning": "Modelo inicial para automação. Ajuste parâmetros conforme enquadramento, ocupação e análise técnica."
  },
  "extintores": {
    "per_m2": 200,
    "single_if_area_lt_m2": 50,
    "min_per_pavimento": 2,
    "max_walk_m": {
      "baixo": 25,
      "medio": 20,
      "alto": 15
    },
    "type": "Pó ABC",
    "note": "IT-21/2025: mínimo por pavimento e distâncias máximas (Tabela 1). Riscos específicos podem exigir tipos adicionais."
  },
  "brigada": {
    "mode": "ratio",
    "ratio": {
      "baixo": 50,
      "medio": 30,
      "alto": 20
    },
    "min_total": 1,
    "note": "Preencha/ajuste para refletir exatamente a IT-17/2025 (Anexo A.1) considerando ocupação, risco e população fixa por turno."
  }
};
  document.getElementById('jsonInput').value = JSON.stringify(preset, null, 2);
  alert('Modelo SP (2025) carregado. Ajuste se necessário e clique em Salvar Localmente.');
}



function loadPresetRJ2023(){
  const preset = {
  "meta": {
    "name": "RJ (Modelo vigente) - Parâmetros Automação",
    "updatedAt": "2026-02-02",
    "refs": [
      "COSCIP (Decreto RJ 42/2018; alterado 46.925/2020)",
      "NT 2-01 (2ª ed. 2020) - Extintores",
      "NT 2-05 (3ª ed. 2023) - Sinalização",
      "NT 2-06 (1ª ed. 2019) - Iluminação"
    ],
    "warning": "Modelo inicial para automação RJ. Ajuste parâmetros conforme enquadramento e NT aplicável."
  },
  "extintores_rj": {
    "per_m2": 200,
    "min_total": 1,
    "type": "Pó ABC",
    "note": "Ajuste conforme NT 2-01 (2020) e enquadramento do local. Este modelo usa densidade por área como aproximação."
  }
};
  document.getElementById('jsonInput').value = JSON.stringify(preset, null, 2);
  alert('Modelo RJ (vigente) carregado. Ajuste se necessário e clique em Salvar Localmente.');
}

document.getElementById('jsonInput').value = localStorage.getItem(KEY) || '';
