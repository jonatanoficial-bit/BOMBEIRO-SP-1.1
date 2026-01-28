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

document.getElementById('jsonInput').value = localStorage.getItem(KEY) || '';
