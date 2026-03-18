/* app.js - Bombeiro SP (Checklist + Relatório PDF via Print + Engine de Dimensionamento) */
import { dbPutVistoria, dbListVistorias, dbDeleteVistoria, dbGetVistoria } from "./db.js";
import { buildChecklist, PACK_INFO, computeSizing as packComputeSizing, computeNeedsEstimate } from "./rules_sp_base.js";
import { runSizing } from "./rules_engine.js";

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

const BUILD_META = { version: '3.1.0', phase: '13', build: '2026-03-13 11:35', progress: '100%' };

function showToast(msg){
  const el = $("#toast");
  $("#toastText").textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=> el.classList.remove("show"), 2600);
}

function setBusy(on, title="Processando...", sub="Aguarde"){
  const ov = $("#overlay");
  if (!ov) return;
  const t = $("#overlayTitle");
  const s = $("#overlaySub");
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
  ov.classList.toggle("show", !!on);
  ov.setAttribute("aria-hidden", on ? "false" : "true");
}


function setActiveView(id){
  $all(".view").forEach(v => {
    v.classList.remove("active");
    v.style.display = "none";
  });
  const el = $(id);
  if (el){
    el.classList.add("active");
    el.style.display = "block";
    el.removeAttribute("hidden");
    window.scrollTo?.({ top: 0, behavior: "instant" });
  }
}

function toRoute(hash){
  if (location.hash === hash){
    handleRoute();
    return;
  }
  location.hash = hash;
  setTimeout(() => {
    if (routeBase() === hash) handleRoute();
  }, 0);
}

function ensureNovaViewReady(){
  const base = routeBase();
  if (!base.startsWith("#/nova")) return;
  const nova = $("#viewNova");
  if (nova && !nova.classList.contains("active")){
    setActiveView("#viewNova");
    updateNovaIntelligence();
  }
}

function parseNumberSafe(v){
  if (v === null || v === undefined) return null;
  const s = String(v).replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function markInvalid(el){
  if (!el) return;
  el.classList.add("invalid");
  el.focus?.();
  const clear = () => el.classList.remove("invalid");
  el.addEventListener("input", clear, { once:true });
}

function formatDateTime(ts){
  const d = new Date(ts);
  const pad = (x)=> String(x).padStart(2,"0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function genId(){ return "v_" + Date.now() + "_" + Math.random().toString(16).slice(2); }

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function escapeHtmlBr(s){
  return escapeHtml(s).replaceAll("\n","<br>");
}

function hashString(str){
  let h = 2166136261;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function buildVerificationPayload(v){
  const local = v?.local || {};
  const commercial = v?.commercial || {};
  const base = JSON.stringify({
    id: v?.id || '',
    nome: local.nomeLocal || '',
    endereco: local.endereco || '',
    area: local.area_m2 || '',
    tipo: local.tipoLocal || '',
    cliente: commercial.clienteEmpresa || '',
    updatedAt: v?.updatedAt || ''
  });
  const digest = hashString(base + '::vale-fire');
  return {
    code: `VALFIRE-${digest.toUpperCase()}`,
    payload: `VALFIRE|${digest}|${v?.id || ''}|${local.nomeLocal || ''}|${local.endereco || ''}`
  };
}

function buildPseudoQrDataUri(text){
  const size = 29;
  const cell = 6;
  const quiet = 4;
  const full = (size + quiet * 2) * cell;
  const bytes = Array.from(text).map(ch => ch.charCodeAt(0));
  const rects = [];
  function drawFinder(cx, cy){
    const s = 7;
    rects.push(`<rect x="${cx*cell}" y="${cy*cell}" width="${s*cell}" height="${s*cell}" fill="#000"/>`);
    rects.push(`<rect x="${(cx+1)*cell}" y="${(cy+1)*cell}" width="${5*cell}" height="${5*cell}" fill="#fff"/>`);
    rects.push(`<rect x="${(cx+2)*cell}" y="${(cy+2)*cell}" width="${3*cell}" height="${3*cell}" fill="#000"/>`);
  }
  drawFinder(quiet, quiet);
  drawFinder(quiet + size - 7, quiet);
  drawFinder(quiet, quiet + size - 7);
  let bitIndex = 0;
  for (let y = 0; y < size; y++){
    for (let x = 0; x < size; x++){
      const ax = x + quiet, ay = y + quiet;
      const inFinder = ((x < 7 && y < 7) || (x >= size-7 && y < 7) || (x < 7 && y >= size-7));
      if (inFinder) continue;
      const byte = bytes[bitIndex % bytes.length] || 0;
      const on = ((byte >> (bitIndex % 8)) & 1) ^ ((x + y) % 2);
      if (on) rects.push(`<rect x="${ax*cell}" y="${ay*cell}" width="${cell}" height="${cell}" fill="#000"/>`);
      bitIndex++;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${full}" height="${full}" viewBox="0 0 ${full} ${full}"><rect width="100%" height="100%" fill="#fff"/>${rects.join('')}</svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function updateMapPreview(lat, lng, label='Local da vistoria'){
  const wrap = $("#mapPreview");
  if (!wrap) return;
  if (!lat || !lng){
    wrap.innerHTML = '<div class="map-empty">Capture a geolocalização para habilitar o painel de mapa da vistoria.</div>';
    return;
  }
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.002}%2C${lat-0.002}%2C${lng+0.002}%2C${lat+0.002}&layer=mapnik&marker=${lat}%2C${lng}`;
  wrap.innerHTML = `
    <iframe class="map-frame" title="Mapa da vistoria" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${src}"></iframe>
    <div class="map-coords">${escapeHtml(label)} · Lat ${Number(lat).toFixed(6)} · Lng ${Number(lng).toFixed(6)}</div>
  `;
}


function getRecommendationPlan(context){
  try {
    return computeNeedsEstimate(context || {}) || null;
  } catch (e) {
    return null;
  }
}

function renderRequirementsPreview(plan){
  const wrap = $("#requirementsPreview");
  if (!wrap) return;
  if (!plan || !plan.recommendations || !plan.recommendations.length){
    wrap.innerHTML = "";
    return;
  }
  wrap.innerHTML = `
    <div class="requirements-title">O que este local provavelmente precisa</div>
    <div class="requirements-grid">
      ${plan.recommendations.map(rec => `
        <div class="req-card ${rec.needed ? "is-needed" : ""}">
          <div class="req-head">
            <strong>${escapeHtml(rec.title)}</strong>
            <span>${rec.needed ? "Provável" : "Avaliar"}</span>
          </div>
          <div class="req-estimate">${escapeHtml(rec.estimate || "-")}</div>
          <div class="req-detail">${escapeHtml(rec.details || "")}</div>
        </div>
      `).join("")}
    </div>
    <div class="requirements-confidence">Confiança da estimativa: ${escapeHtml(String(plan.confidence || "-"))}%</div>
  `;
}

function renderAutoPlanBlock(plan){
  if (!plan || !plan.recommendations || !plan.recommendations.length) return "";
  return `
    <div class="autoplan-card">
      <div class="autoplan-title">Necessidades estimadas do local</div>
      <div class="autoplan-grid">
        ${plan.recommendations.map(rec => `
          <article class="autoplan-item ${rec.needed ? "is-needed" : ""}">
            <h4>${escapeHtml(rec.title)}</h4>
            <div class="autoplan-estimate">${escapeHtml(rec.estimate || "-")}</div>
            <p>${escapeHtml(rec.details || "")}</p>
          </article>
        `).join("")}
      </div>
      <div class="autoplan-note">Estimativa automática inicial para orientar a pré-vistoria. Confirmar em análise técnica final.</div>
    </div>
  `;
}

function collectNovaContext(){
  const tipoLocal = $("#tipoLocal")?.value?.trim() || '';
  const area_m2 = parseNumberSafe($("#area")?.value);
  const pavimentos = parseNumberSafe($("#pavimentos")?.value) || 1;
  const altura_m = parseNumberSafe($("#altura")?.value) || 0;
  const lotacao = parseNumberSafe($("#lotacao")?.value);
  const riscos = $all('.risco').filter(x => x.checked).map(x => x.value);
  return {
    tipoLocal, area_m2, pavimentos, altura_m, lotacao, riscos,
    ocupacao: tipoLocal === 'evento' ? 'evento' : 'comercio',
    horarioFuncionamento: 'variável',
    publicoPredominante: tipoLocal === 'evento' ? 'misto' : 'adulto',
    possuiCozinhaIndustrial: riscos.includes('cozinha'),
    possuiGLP: riscos.includes('glp'),
    possuiPalcoEstrutura: riscos.includes('palco')
  };
}

function updateNovaIntelligence(){
  const metrics = $("#novaMetrics");
  const info = $("#initialAnalysisText");
  const preview = $("#initialChecklistPreview");
  if (!metrics || !info || !preview) return;
  const ctx = collectNovaContext();
  if (!ctx.tipoLocal || !ctx.area_m2){
    info.textContent = 'Preencha tipo de local e área para gerar cálculo automático inicial.';
    preview.innerHTML = '';
    renderRequirementsPreview(null);
    return;
  }
  const sizing = runSizing({ context: ctx, pack: { PACK_INFO, computeSizing: packComputeSizing } });
  const plan = getRecommendationPlan(ctx);
  const risk = (sizing.results || []).find(r => r.id === 'metric_risk_score')?.value ?? '-';
  const team = plan?.brigadistas ?? ((sizing.results || []).find(r => r.id === 'metric_team')?.value ?? '-');
  const compliance = (sizing.results || []).find(r => r.id === 'metric_compliance_forecast')?.value ?? '-';
  const readiness = (sizing.results || []).find(r => r.id === 'metric_readiness')?.value ?? '-';
  metrics.innerHTML = `
    <div class="quick-metric"><span>Brigadistas</span><strong>${team}</strong></div>
    <div class="quick-metric"><span>Risco</span><strong>${risk}/100</strong></div>
    <div class="quick-metric"><span>Conformidade</span><strong>${compliance}/100</strong></div>
    <div class="quick-metric"><span>Prontidão</span><strong>${readiness}/100</strong></div>
  `;
  info.textContent = plan
    ? `Estimativa automática pronta: ${plan.extintores.quantidade} extintor(es), ${plan.hidrante ? 'provável hidrante' : 'hidrante sem indicativo forte'}, ${plan.iluminacao ? 'iluminação' : 'iluminação a validar'}, ${plan.sinalizacao ? 'sinalização' : 'sinalização a validar'} e equipe mínima de ${plan.brigadistas}.`
    : 'Análise inicial automática pronta.';
  const sections = buildChecklist({ tipoLocal: ctx.tipoLocal, riscos: ctx.riscos || [] });
  const list = [];
  (plan?.checklistHints || []).forEach(t => list.push({ section: 'Sugestão automática', title: t }));
  sections.slice(0,2).forEach(sec => sec.items.slice(0,2).forEach(it => list.push({ section: sec.title, title: it.title })));
  preview.innerHTML = `
    <div class="checklist-preview-title">Checklist inicial sugerido</div>
    ${list.slice(0,8).map(it => `<div class="checklist-preview-item"><b>${escapeHtml(it.section)}:</b> ${escapeHtml(it.title)}</div>`).join('')}
  `;
  renderRequirementsPreview(plan);
}

function getHashParams(){
  const h = location.hash || "";
  const qIdx = h.indexOf("?");
  if (qIdx < 0) return {};
  const q = h.slice(qIdx + 1);
  const params = {};
  for (const part of q.split("&")) {
    const [k,v] = part.split("=");
    if (!k) continue;
    params[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return params;
}

function routeBase(){
  const h = location.hash || "#/home";
  const qIdx = h.indexOf("?");
  return qIdx < 0 ? h : h.slice(0, qIdx);
}

function dismissIntro(){
  const splash = document.querySelector('#introSplash');
  if (!splash) return;
  splash.classList.add('is-hidden');
  document.body.classList.remove('app-booting');
  setTimeout(() => splash.remove(), 500);
}

function initIntroExperience(){
  const splash = document.querySelector('#introSplash');
  const video = document.querySelector('#introVideo');
  const skip = document.querySelector('#btnSkipIntro');
  if (!splash || !video) {
    document.body.classList.remove('app-booting');
    return;
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    dismissIntro();
  };
  skip?.addEventListener('click', finish);
  video.addEventListener('ended', finish, { once:true });
  video.addEventListener('error', finish, { once:true });
  setTimeout(finish, 9000);
  const playPromise = video.play?.();
  if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
}

/* ===== PWA ===== */
(async function registerSW(){
  if (!("serviceWorker" in navigator)) return;
  try{ await navigator.serviceWorker.register("./sw.js", { scope: "./" }); }catch(e){}
})();

let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $("#btnInstall").style.display = "inline-flex";
});
window.addEventListener("appinstalled", () => {
  showToast("[OK] Bombeiro SP instalado!");
  $("#btnInstall").style.display = "none";
});
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t?.id === "btnInstall"){
    if (!deferredPrompt){ showToast("ℹ️ Instalação indisponível agora."); return; }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    showToast(choice?.outcome === "accepted" ? "📲 Instalando..." : "Instalação cancelada.");
    deferredPrompt = null;
  }
});

/* ===== Navegação ===== */
$("#btnNova")?.addEventListener("click", () => toRoute("#/nova"));
$("#btnSalvas")?.addEventListener("click", () => toRoute("#/salvas"));
$("#btnVoltarHome")?.addEventListener("click", () => toRoute("#/home"));
$("#btnRecarregarLista")?.addEventListener("click", async () => { await renderLista(); showToast("🔄 Lista atualizada."); });
$("#btnPacote").addEventListener("click", () => showToast(`📦 Pacote ativo: ${PACK_INFO.name} v${PACK_INFO.version}`));

/* ===== Estado ===== */
let currentVistoriaId = null;
let lastSavedId = null;
let currentSections = [];
let currentAnswers = {};
let currentSizing = null;

let __autoSaveTimer = null;
let __lastSavedAt = null;

function setSaveHint(state, text){
  const el = $("#saveHint");
  if (!el) return;
  el.classList.remove("saving","saved","error");
  if (state) el.classList.add(state);
  el.textContent = text;
}

function scheduleAutosave(reason="Alterações"){
  if (!currentVistoriaId) return;
  setSaveHint("saving", `Salvando automaticamente... (${reason})`);
  clearTimeout(__autoSaveTimer);
  __autoSaveTimer = setTimeout(async () => {
    await saveAllNow(true);
  }, 1200);
}

/* ===== Nova Vistoria ===== */
$("#btnCancelarNova").addEventListener("click", () => {
  lastSavedId = null;
  $("#btnIrChecklist").disabled = true;
  $("#formNova").reset();
  if ($("#geoStatus")) $("#geoStatus").value = 'Localização ainda não capturada';
  updateMapPreview(null, null);
  updateNovaIntelligence();
  toRoute("#/home");
});

$("#btnIrChecklist").addEventListener("click", () => {
  if (!lastSavedId) return;
  toRoute(`#/checklist?id=${encodeURIComponent(lastSavedId)}`);
});


$("#btnCapturarGeo")?.addEventListener("click", () => {
  if (!("geolocation" in navigator)){ showToast("[!] Geolocalização indisponível neste aparelho."); return; }
  const statusEl = $("#geoStatus");
  if (statusEl) statusEl.value = 'Capturando localização...';
  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = Number(pos.coords.latitude);
    const lng = Number(pos.coords.longitude);
    const acc = Math.round(Number(pos.coords.accuracy || 0));
    if ($("#geoLat")) $("#geoLat").value = lat.toFixed(6);
    if ($("#geoLng")) $("#geoLng").value = lng.toFixed(6);
    if ($("#geoAccuracy")) $("#geoAccuracy").value = `${acc} m`;
    if ($("#geoStatus")) $("#geoStatus").value = 'Localização capturada com sucesso';
    updateMapPreview(lat, lng, $("#nomeLocal")?.value || 'Local da vistoria');
  }, (err) => {
    if ($("#geoStatus")) $("#geoStatus").value = 'Falha ao capturar localização';
    showToast("[!] Não foi possível capturar a localização.");
  }, { enableHighAccuracy:true, timeout:10000, maximumAge:60000 });
});

$("#btnLimparGeo")?.addEventListener("click", () => {
  if ($("#geoLat")) $("#geoLat").value = '';
  if ($("#geoLng")) $("#geoLng").value = '';
  if ($("#geoAccuracy")) $("#geoAccuracy").value = '';
  if ($("#geoStatus")) $("#geoStatus").value = 'Localização removida';
  updateMapPreview(null, null);
});

["#tipoLocal", "#area", "#pavimentos", "#altura", "#lotacao", "#nomeLocal"].forEach(sel => {
  $(sel)?.addEventListener('input', () => { if (sel === '#nomeLocal') updateMapPreview(parseFloat($("#geoLat")?.value), parseFloat($("#geoLng")?.value), $("#nomeLocal")?.value || 'Local da vistoria'); updateNovaIntelligence(); });
  $(sel)?.addEventListener('change', updateNovaIntelligence);
});
$all('.risco').forEach(el => el.addEventListener('change', updateNovaIntelligence));

$("#formNova").addEventListener("submit", async (e) => {
  e.preventDefault();

  const tipoLocal = $("#tipoLocal").value.trim();
  const nomeLocal = $("#nomeLocal").value.trim();
  const endereco = $("#endereco").value.trim();
  const clienteEmpresa = $("#clienteEmpresa")?.value.trim() || "";
  const projetoNome = $("#projetoNome")?.value.trim() || "";
  const responsavelTecnico = $("#responsavelTecnico")?.value.trim() || "";
  const contatoWhatsapp = $("#contatoWhatsapp")?.value.trim() || "";
  const area = parseNumberSafe($("#area").value);
  const pavimentos = parseNumberSafe($("#pavimentos").value);
  const altura = parseNumberSafe($("#altura").value);
  const lotacao = parseNumberSafe($("#lotacao").value);
  const riscos = $all(".risco").filter(x => x.checked).map(x => x.value);
  const obs = $("#obs").value.trim();
  const geoLat = parseNumberSafe($("#geoLat")?.value);
  const geoLng = parseNumberSafe($("#geoLng")?.value);
  const geoAccuracy = $("#geoAccuracy")?.value?.trim() || "";
  const initialContext = { tipoLocal, area_m2: area, pavimentos, altura_m: altura || 0, lotacao, riscos, ocupacao: tipoLocal === 'evento' ? 'evento' : 'comercio', horarioFuncionamento: 'variável', publicoPredominante: tipoLocal === 'evento' ? 'misto' : 'adulto', possuiCozinhaIndustrial: riscos.includes('cozinha'), possuiGLP: riscos.includes('glp'), possuiPalcoEstrutura: riscos.includes('palco') };
  const initialSizing = runSizing({ context: initialContext, pack: { PACK_INFO, computeSizing: packComputeSizing } });
  const initialPlan = getRecommendationPlan(initialContext);

  if (!tipoLocal){ showToast("[!] Informe o tipo do local."); markInvalid($("#tipoLocal")); return; }
  if (!nomeLocal){ showToast("[!] Informe o nome do local."); markInvalid($("#nomeLocal")); return; }
  if (!endereco){ showToast("[!] Informe o endereço."); markInvalid($("#endereco")); return; }
  if (area === null || area <= 0){ showToast("[!] Informe a área (m²) corretamente."); markInvalid($("#area")); return; }
  if (pavimentos === null || pavimentos < 1){ showToast("[!] Informe a quantidade de pavimentos (mínimo 1)."); markInvalid($("#pavimentos")); return; }

  const now = Date.now();
  const id = genId();

  const vistoria = {
    id,
    createdAt: now,
    updatedAt: now,
    status: "rascunho",
    local: { tipoLocal, nomeLocal, endereco, area_m2: area, pavimentos, altura_m: altura, lotacao, riscos, obs, geo: { lat: geoLat, lng: geoLng, accuracy: geoAccuracy, capturedAt: now } },
    commercial: { clienteEmpresa, projetoNome, responsavelTecnico, contatoWhatsapp },
    checklist: { pack: PACK_INFO, answers: {}, lastSavedAt: now },
    sizing: { ...initialSizing, pack: PACK_INFO, computedAt: now, inputs: { origem: 'formulario-inicial', videoIntroResolution: '560x560' } },
    autoPlan: initialPlan,
    relatorio: null
  };

  try{
    await dbPutVistoria(vistoria);
    lastSavedId = id;
    $("#btnIrChecklist").disabled = false;
    showToast("[OK] Vistoria salva offline.");
    toRoute(`#/checklist?id=${encodeURIComponent(id)}`);
  }catch(err){
    showToast("[X] Erro ao salvar. Tente novamente.");
  }
});

/* ===== Lista ===== */
async function renderLista(){
  setBusy(true, "Carregando vistorias", "Aguarde\u2026");
  try{
  const wrap = $("#listaVistorias");
  wrap.innerHTML = "";

  const items = await dbListVistorias(80);
  if (!items.length){
    wrap.innerHTML = `
      <div class="card">
        <h3>Nenhuma vistoria ainda</h3>
        <p>Crie uma nova vistoria na Home.</p>
        <button class="btn" id="btnNova2">Criar agora</button>
      </div>
    `;
    $("#btnNova2").addEventListener("click", ()=> toRoute("#/nova"));
    return;
  }

  items.forEach(v => {
    const nome = v?.local?.nomeLocal || "Sem nome";
    const tipo = v?.local?.tipoLocal === "evento" ? "Evento" : "Comércio";
    const area = v?.local?.area_m2 ?? "-";
    const pav = v?.local?.pavimentos ?? "-";
    const when = formatDateTime(v.updatedAt);
    const cliente = v?.commercial?.clienteEmpresa || 'Cliente não informado';
    const projeto = v?.commercial?.projetoNome || 'Projeto sem nome';

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item-top">
        <div>
          <h4>${escapeHtml(nome)}</h4>
          <small>${escapeHtml(tipo)} • ${escapeHtml(area)} m² • ${escapeHtml(pav)} pav. • Atualizado: ${escapeHtml(when)}</small>
          <small class="item-sub">${escapeHtml(cliente)} • ${escapeHtml(projeto)}</small>
        </div>
        <div class="item-actions">
          <button class="mini mini-amber" data-open="${escapeHtml(v.id)}">Checklist</button>
          <button class="mini mini-danger" data-del="${escapeHtml(v.id)}">Excluir</button>
        </div>
      </div>
    `;
    wrap.appendChild(el);
  });

  wrap.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-open");
      toRoute(`#/checklist?id=${encodeURIComponent(id)}`);
    });
  });

  wrap.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      const ok = confirm("Excluir esta vistoria do aparelho?");
      if (!ok) return;
      await dbDeleteVistoria(id);
      showToast("🗑️ Excluída.");
      await renderLista();
    });
  });

  } finally {
    setBusy(false);
  }
}

/* ===== Checklist ===== */
$("#btnVoltarSalvas").addEventListener("click", () => toRoute("#/salvas"));

$("#btnEditarDados").addEventListener("click", async () => {
  if (!currentVistoriaId) return;
  const v = await dbGetVistoria(currentVistoriaId);
  if (!v) { showToast("[!] Vistoria não encontrada."); return; }
  fillForm(v);
  lastSavedId = currentVistoriaId;
  $("#btnIrChecklist").disabled = false;
  toRoute("#/nova");
});

$("#btnSalvarChecklist").addEventListener("click", async () => { await saveAllNow(); });

$("#btnGerarRelatorio").addEventListener("click", async () => {
  if (!currentVistoriaId) { showToast("[!] Abra uma vistoria."); return; }
  await saveAllNow();
  toRoute(`#/relatorio?id=${encodeURIComponent(currentVistoriaId)}`);
});

/* ===== Relatório ===== */
$("#btnVoltarChecklist").addEventListener("click", () => {
  if (!currentVistoriaId) return toRoute("#/salvas");
  toRoute(`#/checklist?id=${encodeURIComponent(currentVistoriaId)}`);
});
$("#btnPrint").addEventListener("click", () => window.print());

async function loadChecklistView(id){
  setBusy(true, "Abrindo vistoria", "Carregando checklist\u2026");
  try{
  const v = await dbGetVistoria(id);
  if (!v){ showToast("[!] Vistoria não encontrada."); toRoute("#/salvas"); return; }

  currentVistoriaId = id;
  lastSavedId = id;

  const local = v.local || {};
  $("#chkLocalTitle").textContent = local.nomeLocal ? local.nomeLocal : "Local";
  const tipo = local.tipoLocal === "evento" ? "Evento" : "Comércio";
  $("#chkLocalSub").textContent = `${tipo} • ${local.area_m2 ?? "-"} m² • ${local.pavimentos ?? "-"} pav. • ${local.endereco ?? ""}`;
  $("#packInfo").textContent = `${PACK_INFO.name} v${PACK_INFO.version}`;

  currentSections = buildChecklist({ tipoLocal: local.tipoLocal, riscos: local.riscos || [] });
  currentAnswers = (v.checklist && v.checklist.answers) ? structuredClone(v.checklist.answers) : {};

  sanitizeAnswers();

  for (const sec of currentSections) {
    for (const it of sec.items) {
      if (!currentAnswers[it.id]) currentAnswers[it.id] = { status: "pendente", note: "", photos: [] };
      currentAnswers[it.id].status = currentAnswers[it.id].status || "pendente";
      currentAnswers[it.id].note = currentAnswers[it.id].note || "";
      currentAnswers[it.id].photos = currentAnswers[it.id].photos || [];
    }
  }

  // Sizing (inputs persistidos)
  const savedSizing = v.sizing || { inputs: {} };
  currentSizing = savedSizing;

  renderChecklistUI(local, savedSizing.inputs || {});
  if (savedSizing?.results?.length) renderSizingResult(savedSizing, v.autoPlan || getRecommendationPlan({ ...local, ...(savedSizing.inputs || {}), riscos: local.riscos || [] }));
  updateKpis();
  __lastSavedAt = v?.checklist?.lastSavedAt || null;
  setSaveHint(__lastSavedAt ? "saved" : null, __lastSavedAt ? `Salvo em ${formatDateTime(__lastSavedAt)}` : "Não salvo");

  } finally {
    setBusy(false);
  }
}

function renderChecklistUI(local, sizingInputs){
  const wrap = $("#chkContent");
  wrap.innerHTML = "";

  // ===== Card Dimensionamento =====
  const dim = document.createElement("div");
  dim.className = "card";
  dim.innerHTML = `
    <h3>🧮 Dimensionamento (Pacote)</h3>
    <p>Preencha dados para o pacote gerar recomendações automáticas. (No pacote base não há valores normativos.)</p>

    <div class="form" style="margin-top:10px;">
      <div class="field">
        <div class="label"><span>Ocupação / atividade</span><span class="hint">Ex.: loja, restaurante, feira, show</span></div>
        <input class="input" id="dimOcupacao" placeholder="Digite a ocupação" value="${escapeHtml(sizingInputs.ocupacao || "")}">
      </div>

      <div class="split">
        <div class="field">
          <div class="label"><span>Horário de funcionamento</span><span class="hint">Ex.: 08–18</span></div>
          <input class="input" id="dimHorario" placeholder="Ex.: 08–18" value="${escapeHtml(sizingInputs.horarioFuncionamento || "")}">
        </div>
        <div class="field">
          <div class="label"><span>Público predominante</span><span class="hint">adulto/misto/criança</span></div>
          <input class="input" id="dimPublico" placeholder="Ex.: misto" value="${escapeHtml(sizingInputs.publicoPredominante || "")}">
        </div>
      </div>

      <div class="field">
        <div class="label"><span>Características</span><span class="hint">marque se aplicável</span></div>
        <div class="chips">
          <label class="chip"><input type="checkbox" id="dimCozinha" ${sizingInputs.possuiCozinhaIndustrial ? "checked" : ""}> Cozinha industrial</label>
          <label class="chip"><input type="checkbox" id="dimGLP" ${sizingInputs.possuiGLP ? "checked" : ""}> GLP</label>
          <label class="chip"><input type="checkbox" id="dimPalco" ${sizingInputs.possuiPalcoEstrutura ? "checked" : ""}> Palco/Estrutura</label>
        </div>
      </div>

      <div class="field">
        <div class="label"><span>Observações (dimensionamento)</span><span class="hint">opcional</span></div>
        <textarea class="textarea" id="dimObs" placeholder="Ex.: corredores estreitos, saída única, etc.">${escapeHtml(sizingInputs.observacoesDim || "")}</textarea>
      </div>

      <div class="row">
        <button class="btn btn-secondary" id="btnDimSalvar">Salvar dados</button>
        <button class="btn btn-amber" id="btnDimCalcular">Calcular recomendações</button>
      </div>

      <div class="field" id="dimResultadoBox" style="display:none;">
        <div class="label"><span>Resultado do pacote</span><span class="hint" id="dimHint"></span></div>
        <div class="tech-summary" id="techSummary"></div>
        <div id="dimResultados"></div>
      </div>
    </div>
  `;
  wrap.appendChild(dim);

  // Eventos do dimensionamento
  $("#btnDimSalvar").addEventListener("click", async (e) => {
    e.preventDefault();
    await saveSizingInputs();
    showToast("[OK] Dados de dimensionamento salvos.");
  });

  $("#btnDimCalcular").addEventListener("click", async (e) => {
    e.preventDefault();
    await saveSizingInputs();
    await computeSizingNow(local);
  });

  // ===== Checklist por seção =====
  for (const sec of currentSections) {
    const secEl = document.createElement("div");
    secEl.className = "section";
    secEl.innerHTML = `
      <div class="section-title">
        <span>${escapeHtml(sec.title)}</span>
        <span class="count">${sec.items.length} itens</span>
      </div>
    `;

    for (const it of sec.items) {
      const ans = currentAnswers[it.id];

      const itemEl = document.createElement("div");
      itemEl.className = "chk";
      itemEl.dataset.itemId = it.id;

      itemEl.innerHTML = `
        <h5>${escapeHtml(it.title)}</h5>
        <div class="help">${escapeHtml(it.help)}</div>

        <div class="segment">
          <button type="button" class="segbtn ${ans.status==="ok" ? "active ok" : ""}" data-set="ok">OK</button>
          <button type="button" class="segbtn ${ans.status==="pendente" ? "active warn" : ""}" data-set="pendente">PENDENTE</button>
          <button type="button" class="segbtn ${ans.status==="nao_conforme" ? "active bad" : ""}" data-set="nao_conforme">NÃO CONFORME</button>
          <button type="button" class="segbtn ${ans.status==="na" ? "active na" : ""}" data-set="na">N/A</button>
        </div>

        <textarea placeholder="Observação (o que foi visto / o que falta / recomendação)">${escapeHtml(ans.note)}</textarea>

        <div class="tools">
          <button type="button" class="mini mini-amber" data-photo="1">📷 Foto</button>
          <button type="button" class="mini" data-clear="1">Limpar</button>
        </div>

        <input type="file" accept="image/*" capture="environment" style="display:none;" />
        <div class="photos"></div>
      `;

      // Status
      itemEl.querySelectorAll(".segbtn").forEach(b => {
        b.addEventListener("click", () => {
          const status = b.getAttribute("data-set");
          setItemStatus(it.id, status, itemEl);
        });
      });

      // Note
      const ta = itemEl.querySelector("textarea");
      ta.addEventListener("input", () => { currentAnswers[it.id].note = ta.value; updateKpis(); scheduleAutosave("anotações"); });

      // Photos
      const photosWrap = itemEl.querySelector(".photos");
      renderPhotos(it.id, photosWrap);

      const fileInput = itemEl.querySelector('input[type="file"]');
      itemEl.querySelector("[data-photo]").addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", async () => {
        if (!fileInput.files?.[0]) return;
        try{
          const dataUrl = await fileToDataURLCompressed(fileInput.files[0], 1280, 0.82);
          currentAnswers[it.id].photos.push({ id: "p_" + Date.now(), dataUrl });
          renderPhotos(it.id, photosWrap);
          updateKpis();
          scheduleAutosave("fotos");
          showToast("📷 Foto adicionada.");
        }catch(e){
          showToast("[X] Falha ao adicionar foto.");
        }finally{
          fileInput.value = "";
        }
      });

      itemEl.querySelector("[data-clear]").addEventListener("click", () => {
        const ok = confirm("Limpar status, observação e fotos deste item?");
        if (!ok) return;
        currentAnswers[it.id] = { status: "pendente", note: "", photos: [] };
        scheduleAutosave("limpeza");
        renderChecklistUI(local, readSizingInputsFromUI());
        updateKpis();
      });

      secEl.appendChild(itemEl);
    }

    wrap.appendChild(secEl);
  }
}

function setItemStatus(itemId, status, itemEl){
  currentAnswers[itemId].status = status;
  const btns = Array.from(itemEl.querySelectorAll(".segbtn"));
  btns.forEach(b => {
    b.classList.remove("active","ok","warn","bad","na");
    if (b.getAttribute("data-set") === status) {
      b.classList.add("active");
      if (status === "ok") b.classList.add("ok");
      if (status === "pendente") b.classList.add("warn");
      if (status === "nao_conforme") b.classList.add("bad");
      if (status === "na") b.classList.add("na");
    }
  });
  updateKpis();
  scheduleAutosave("status");
}

function renderPhotos(itemId, wrap){
  const photos = currentAnswers[itemId]?.photos || [];
  wrap.innerHTML = "";
  photos.slice(0, 6).forEach(p => {
    const d = document.createElement("div");
    d.className = "photo";
    d.innerHTML = `<img alt="Foto" src="${p.dataUrl}">`;
    d.addEventListener("click", () => {
      const ok = confirm("Excluir esta foto?");
      if (!ok) return;
      currentAnswers[itemId].photos = currentAnswers[itemId].photos.filter(x => x.id !== p.id);
      renderPhotos(itemId, wrap);
      updateKpis();
      scheduleAutosave("fotos");
    });
    wrap.appendChild(d);
  });
}

function computeStats(){
  let total = 0, ok = 0, pend = 0, bad = 0, na = 0;
  const validIds = new Set();
  for (const sec of currentSections) for (const it of sec.items) validIds.add(it.id);

  for (const id of validIds) {
    total++;
    const st = currentAnswers[id]?.status || "pendente";
    if (st === "ok") ok++;
    else if (st === "pendente") pend++;
    else if (st === "nao_conforme") bad++;
    else if (st === "na") na++;
  }
  const done = ok + na;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, ok, pend, bad, na, progress };
}

function sanitizeAnswers(){
  const validIds = new Set();
  for (const sec of currentSections) for (const it of sec.items) validIds.add(it.id);
  for (const id of Object.keys(currentAnswers)){
    if (!validIds.has(id)) delete currentAnswers[id];
  }
}

function updateKpis(){
  const s = computeStats();
  $("#kpiProgress").textContent = `${s.progress}%`;
  $("#kpiPend").textContent = String(s.pend);
  $("#kpiBad").textContent = String(s.bad);
  $("#progressFill").style.width = `${s.progress}%`;
}

/* ===== Dimensionamento ===== */
function readSizingInputsFromUI(){
  return {
    ocupacao: $("#dimOcupacao")?.value || "",
    horarioFuncionamento: $("#dimHorario")?.value || "",
    publicoPredominante: $("#dimPublico")?.value || "",
    possuiCozinhaIndustrial: !!$("#dimCozinha")?.checked,
    possuiGLP: !!$("#dimGLP")?.checked,
    possuiPalcoEstrutura: !!$("#dimPalco")?.checked,
    observacoesDim: $("#dimObs")?.value || "",
    videoIntroResolution: '560x560'
  };
}

async function saveSizingInputs(){
  if (!currentVistoriaId) return;
  const v = await dbGetVistoria(currentVistoriaId);
  if (!v) return;

  v.sizing = v.sizing || { pack: PACK_INFO, inputs: {}, results: [], warnings: [], computedAt: Date.now() };
  v.sizing.pack = PACK_INFO;
  v.sizing.inputs = readSizingInputsFromUI();
  v.updatedAt = Date.now();

  setSaveHint("saving","Salvando automaticamente... (dimensionamento)");
  await dbPutVistoria(v);
  __lastSavedAt = v.updatedAt;
  setSaveHint("saved", `Salvo em ${formatDateTime(__lastSavedAt)}`);
  currentSizing = v.sizing;
}

async function computeSizingNow(local){
  setBusy(true, "Calculando recomenda\u00e7\u00f5es", "Aguarde\u2026");
  try{
  if (!currentVistoriaId) return;

  const inputs = readSizingInputsFromUI();

  const context = {
    ...local,
    ...inputs,
    // redundâncias úteis
    riscos: local.riscos || [],
    possuiCozinhaIndustrial: inputs.possuiCozinhaIndustrial || (local.riscos || []).includes("cozinha"),
    possuiGLP: inputs.possuiGLP || (local.riscos || []).includes("glp"),
    possuiPalcoEstrutura: inputs.possuiPalcoEstrutura || (local.riscos || []).includes("palco")
  };

  // Pack adapter (este pacote base exporta computeSizing, mas no futuro cada pacote terá o seu)
  const pack = { PACK_INFO, computeSizing: packComputeSizing };

  const sizing = runSizing({ context, pack });
  const autoPlan = getRecommendationPlan(context);

  const v = await dbGetVistoria(currentVistoriaId);
  if (!v) return;

  v.sizing = sizing;
  v.autoPlan = autoPlan;
  v.updatedAt = Date.now();
  await dbPutVistoria(v);
  currentSizing = sizing;

  renderSizingResult(sizing, autoPlan);
  showToast("🧮 Recomendações atualizadas.");

  } finally {
    setBusy(false);
  }
}

function getSizingMetricValue(sizing, id){
  const item = (sizing?.results || []).find(r => r.id === id);
  return item?.value ?? null;
}

function renderSizingResult(sizing, autoPlan = null){
  const box = $("#dimResultadoBox");
  const hint = $("#dimHint");
  const wrap = $("#dimResultados");
  const summary = $("#techSummary");
  if (!box || !wrap || !hint) return;

  box.style.display = "block";
  hint.textContent = `${sizing.pack?.name || "Pacote"} v${sizing.pack?.version || "?"}`;

  const risk = getSizingMetricValue(sizing, "metric_risk_score");
  const readiness = getSizingMetricValue(sizing, "metric_readiness");
  const team = getSizingMetricValue(sizing, "metric_team");
  const compliance = getSizingMetricValue(sizing, "metric_compliance_forecast");
  const complexity = getSizingMetricValue(sizing, "metric_complexity");
  const response = getSizingMetricValue(sizing, "metric_response_level");
  const priorityItem = (sizing.results || []).find(r => r.id === "metric_priority");
  if (summary) {
    summary.classList.add('is-pro');
    summary.innerHTML = `
      <div style="grid-column:1/-1" class="tech-summary-title">Dashboard técnico avançado</div>
      <div class="tech-metric ${risk >= 70 ? "is-critical" : (risk >= 40 ? "is-warn" : "")}">
        <span>Score de risco</span>
        <strong>${risk ?? "-"}<small>/100</small></strong>
      </div>
      <div class="tech-metric ${readiness < 60 ? "is-critical" : (readiness < 80 ? "is-warn" : "")}">
        <span>Prontidão</span>
        <strong>${readiness ?? "-"}<small>/100</small></strong>
      </div>
      <div class="tech-metric ${team >= 6 ? "is-critical" : (team >= 3 ? "is-warn" : "")}">
        <span>Equipe mínima</span>
        <strong>${team ?? "-"}<small> prof.</small></strong>
      </div>
      <div class="tech-metric ${compliance < 55 ? "is-critical" : (compliance < 75 ? "is-warn" : "")}">
        <span>Previsão de conformidade</span>
        <strong>${compliance ?? "-"}<small>/100</small></strong>
      </div>
      <div class="tech-metric ${complexity >= 70 ? "is-critical" : (complexity >= 40 ? "is-warn" : "")}">
        <span>Complexidade operacional</span>
        <strong>${complexity ?? "-"}<small>/100</small></strong>
      </div>
      <div class="tech-metric ${response >= 3 ? "is-critical" : (response >= 2 ? "is-warn" : "")}">
        <span>Nível de resposta</span>
        <strong>${response === 4 ? "Máximo" : response === 3 ? "Alto" : response === 2 ? "Moderado" : "Base"}</strong>
      </div>
      <div class="tech-metric ${priorityItem?.severity === "critical" ? "is-critical" : (priorityItem?.severity === "warn" ? "is-warn" : "")}" style="grid-column:1/-1">
        <span>Prioridade global</span>
        <strong>${escapeHtml(priorityItem?.summary?.replace("Prioridade ", "").replace(".", "") || "-")}</strong>
      </div>
    `;
  }

  const autoPlanHtml = autoPlan ? renderAutoPlanBlock(autoPlan) : "";
  const warnings = (sizing.warnings || []).map(w => `<div class="rep-item"><div class="rep-note">[!] ${escapeHtmlBr(w)}</div></div>`).join("");

  const results = (sizing.results || []).map(r => {
    const sev = r.severity || "info";
    const badgeClass = sev === "critical" ? "bad" : (sev === "warn" ? "warn" : "na");
    const refs = (r.refs || []).filter(x => x.code).map(x => `• ${x.code}${x.note ? " — " + x.note : ""}`).join("\n");
    const value = (r.value !== null && r.value !== undefined && r.value !== "") ? `<div class="metric-inline">${escapeHtml(String(r.value))}${r.unit ? `<small>${escapeHtml(r.unit)}</small>` : ""}</div>` : "";

    return `
      <div class="rep-item">
        <h4>${escapeHtml(r.category)} — ${escapeHtml(r.title)}</h4>
        <div class="rep-badge ${badgeClass}">${sev.toUpperCase()}</div>
        ${value}
        ${r.summary ? `<div class="rep-note">${escapeHtml(r.summary)}</div>` : ""}
        ${r.details ? `<div class="rep-note">${escapeHtml(r.details)}</div>` : ""}
        ${refs ? `<div class="rep-note">${escapeHtmlBr(refs)}</div>` : ""}
      </div>
    `;
  }).join("");

  wrap.innerHTML = (autoPlanHtml + warnings + results) || `<div class="rep-item"><div class="rep-note">Sem resultados.</div></div>`;
}

/* ===== Persistência geral ===== */
async function saveAllNow(silent=false){
  setBusy(true, "Salvando vistoria", "Gravando dados\u2026");
  try{
  if (!currentVistoriaId) return;

  const v = await dbGetVistoria(currentVistoriaId);
  if (!v){ showToast("[!] Vistoria não encontrada."); return; }

  const now = Date.now();
  v.updatedAt = now;
  v.status = "em_andamento";
  v.checklist = v.checklist || {};
  v.checklist.pack = PACK_INFO;
  v.checklist.answers = currentAnswers;
  v.checklist.lastSavedAt = now;

  // Se já tem sizing em memória, persiste também
  if (currentSizing && currentSizing.inputs) {
    v.sizing = currentSizing;
    v.sizing.pack = PACK_INFO;
  }

  try{
    await dbPutVistoria(v);
    __lastSavedAt = now;
    setSaveHint("saved", `Salvo em ${formatDateTime(now)}`);
    if (!silent) showToast("[OK] Salvo offline.");
  }catch(e){
    setSaveHint("error", "Falha ao salvar (offline)");
    if (!silent) showToast("[X] Falha ao salvar.");
  }

  } finally {
    setBusy(false);
  }
}

/* ===== Relatório ===== */
function statusLabel(st){
  if (st === "ok") return { t: "OK", c: "ok" };
  if (st === "pendente") return { t: "PENDENTE", c: "warn" };
  if (st === "nao_conforme") return { t: "NÃO CONFORME", c: "bad" };
  return { t: "N/A", c: "na" };
}

function flattenItems(){
  const out = [];
  for (const sec of currentSections) for (const it of sec.items) out.push({ section: sec.title, ...it });
  return out;
}

async function loadRelatorioView(id){
  setBusy(true, "Gerando relat\u00f3rio", "Montando impress\u00e3o\u2026");
  try{
  const v = await dbGetVistoria(id);
  if (!v){ showToast("[!] Vistoria não encontrada."); toRoute("#/salvas"); return; }

  currentVistoriaId = id;

  const local = v.local || {};
  currentSections = buildChecklist({ tipoLocal: local.tipoLocal, riscos: local.riscos || [] });
  currentAnswers = (v.checklist && v.checklist.answers) ? structuredClone(v.checklist.answers) : {};
  for (const sec of currentSections) for (const it of sec.items) {
    if (!currentAnswers[it.id]) currentAnswers[it.id] = { status: "pendente", note: "", photos: [] };
    currentAnswers[it.id].photos = currentAnswers[it.id].photos || [];
  }

  const stats = computeStats();
  const tipo = local.tipoLocal === "evento" ? "Evento" : "Comércio";

  const all = flattenItems();
  const pend = [];
  const bad = [];
  for (const it of all) {
    const a = currentAnswers[it.id] || { status:"pendente" };
    if (a.status === "pendente") pend.push(it);
    if (a.status === "nao_conforme") bad.push(it);
  }

  const sizing = v.sizing || null;
  const autoPlan = v.autoPlan || getRecommendationPlan({ ...local, ...(sizing?.inputs || {}), riscos: local.riscos || [] });
  const verification = buildVerificationPayload(v);
  const qrUri = buildPseudoQrDataUri(verification.payload);
  const geo = v.local?.geo || {};

  const header = `
    <div class="rep-title">
      <img src="./icon.svg" alt="Bombeiro SP">
      <div>
        <h2>Relatório de Adequações para Regularização</h2>
        <div class="rep-sub">
          Bombeiro SP • ${escapeHtml(tipo)} • Gerado em ${escapeHtml(formatDateTime(Date.now()))}<br>
          Pacote: ${escapeHtml(PACK_INFO.name)} v${escapeHtml(PACK_INFO.version)}
        </div>
      </div>
    </div>
  `;

  const dados = `
    <div class="report-cover">
      <div>
        <div class="report-cover-kicker">RELATÓRIO PROFISSIONAL</div>
        <h3>Pré-vistoria técnica com documento para apresentação comercial</h3>
        <p>Documento gerado automaticamente para apoio à regularização, evidências de campo e tomada de decisão do cliente.</p>
      </div>
      <div class="qr-verify-card">
        <img src="${qrUri}" alt="QR de verificação" class="qr-image">
        <div class="qr-code-text">${escapeHtml(verification.code)}</div>
        <small>Validação interna da build e da vistoria</small>
      </div>
    </div>
    <div class="rep-block">
      <h3>Dados do Local</h3>
      <div class="rep-kpis">
        <div class="rep-kpi"><b>Nome</b><span>${escapeHtml(local.nomeLocal || "-")}</span></div>
        <div class="rep-kpi"><b>Tipo</b><span>${escapeHtml(tipo)}</span></div>
        <div class="rep-kpi"><b>Área</b><span>${escapeHtml(local.area_m2 ?? "-")} m²</span></div>
        <div class="rep-kpi"><b>Pavimentos</b><span>${escapeHtml(local.pavimentos ?? "-")}</span></div>
        <div class="rep-kpi"><b>Altura</b><span>${escapeHtml(local.altura_m ?? "-")} m</span></div>
        <div class="rep-kpi"><b>Lotação</b><span>${escapeHtml(local.lotacao ?? "-")}</span></div>
      </div>
      <div class="rep-item" style="margin-top:10px;">
        <h4>Endereço</h4>
        <div class="rep-note">${escapeHtml(local.endereco || "-")}</div>
      </div>
      <div class="rep-item">
        <h4>Riscos / Características</h4>
        <div class="rep-note">${escapeHtml((local.riscos || []).join(", ") || "Nenhum informado")}</div>
      </div>
      ${local.obs ? `<div class="rep-item"><h4>Observações iniciais</h4><div class="rep-note">${escapeHtml(local.obs)}</div></div>` : ""}
      <div class="rep-item">
        <h4>Geolocalização</h4>
        <div class="rep-note">${geo?.lat ? `Lat ${escapeHtml(Number(geo.lat).toFixed(6))} · Lng ${escapeHtml(Number(geo.lng).toFixed(6))} · Precisão ${escapeHtml(geo.accuracy || '-')}` : 'Não capturada nesta vistoria.'}</div>
      </div>
      ${geo?.lat ? `<div class="report-map-wrap"><iframe class="report-map-frame" title="Mapa da vistoria" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${geo.lng-0.002}%2C${geo.lat-0.002}%2C${geo.lng+0.002}%2C${geo.lat+0.002}&layer=mapnik&marker=${geo.lat}%2C${geo.lng}"></iframe></div>` : ''}
    </div>
  `;

  const resumo = `
    <div class="rep-block">
      <h3>Resumo</h3>
      <div class="rep-kpis">
        <div class="rep-kpi"><b>Progresso</b><span>${stats.progress}% (OK + N/A)</span></div>
        <div class="rep-kpi"><b>Total de itens</b><span>${stats.total}</span></div>
        <div class="rep-kpi"><b>Pendências</b><span>${stats.pend}</span></div>
        <div class="rep-kpi"><b>Não conforme</b><span>${stats.bad}</span></div>
      </div>
      <div class="rep-item" style="margin-top:10px;">
        <h4>Objetivo</h4>
        <div class="rep-note">Documento de apoio técnico para adequações do contratante visando regularização (AVCB/LAVCB), sem substituir procedimentos oficiais.</div>
      </div>
    </div>
  `;

  const criticos = bad.slice(0, 20).map(it => `• ${it.section} — ${it.title}`).join("\n");
  const pendTxt = pend.slice(0, 20).map(it => `• ${it.section} — ${it.title}`).join("\n");

  const pendencias = `
    <div class="rep-block">
      <h3>Pendências e Não Conformidades</h3>
      <div class="rep-item">
        <h4>Não conforme (prioridade)</h4>
        <div class="rep-note">${escapeHtmlBr(criticos || "Nenhum item marcado como NÃO CONFORME.")}</div>
      </div>
      <div class="rep-item">
        <h4>Pendente</h4>
        <div class="rep-note">${escapeHtmlBr(pendTxt || "Nenhum item marcado como PENDENTE.")}</div>
      </div>
    </div>
  `;

  // ===== Dimensionamento no relatório =====
  let dimBlock = `
    <div class="rep-block">
      <h3>Dimensionamento e Recomendações (Pacote)</h3>
      <div class="rep-item">
        <div class="rep-note">
          Pacote: ${escapeHtml(sizing?.pack?.name || PACK_INFO.name)} v${escapeHtml(sizing?.pack?.version || PACK_INFO.version)}<br>
          Observação: o pacote base não contém valores normativos oficiais; ele gera recomendações orientativas e estrutura para o pacote oficial.
        </div>
      </div>
  `;

  if (sizing?.warnings?.length) {
    dimBlock += `
      <div class="rep-item">
        <h4>Avisos</h4>
        <div class="rep-note">${escapeHtmlBr(sizing.warnings.map(w => "• " + w).join("\n"))}</div>
      </div>
    `;
  }

  if (autoPlan?.recommendations?.length) {
    dimBlock += `<div class="rep-item"><h4>O que este local provavelmente precisa</h4><div class="rep-note">${escapeHtmlBr(autoPlan.recommendations.map(rec => `• ${rec.title}: ${rec.estimate}. ${rec.details}`).join("\n"))}</div></div>`;
  }

  if (sizing?.results?.length) {
    for (const r of sizing.results) {
      const sev = r.severity || "info";
      const badgeClass = sev === "critical" ? "bad" : (sev === "warn" ? "warn" : "na");
      const refs = (r.refs || []).filter(x => x.code).map(x => `• ${x.code}${x.note ? " — " + x.note : ""}`).join("\n");

      dimBlock += `
        <div class="rep-item">
          <h4>${escapeHtml(r.category)} — ${escapeHtml(r.title)}</h4>
          <div class="rep-badge ${badgeClass}">${escapeHtml(sev.toUpperCase())}</div>
          ${r.summary ? `<div class="rep-note">${escapeHtml(r.summary)}</div>` : ""}
          ${r.details ? `<div class="rep-note">${escapeHtml(r.details)}</div>` : ""}
          ${refs ? `<div class="rep-note">${escapeHtmlBr(refs)}</div>` : ""}
        </div>
      `;
    }
  } else {
    dimBlock += `<div class="rep-item"><div class="rep-note">Sem recomendações calculadas. Use “Calcular recomendações” no checklist.</div></div>`;
  }

  dimBlock += `</div>`;

  // Checklist detalhado
  let detalhado = `<div class="rep-block"><h3>Checklist detalhado</h3>`;
  for (const sec of currentSections) {
    detalhado += `<div class="rep-item"><h4>${escapeHtml(sec.title)}</h4></div>`;
    for (const it of sec.items) {
      const a = currentAnswers[it.id] || { status:"pendente", note:"", photos:[] };
      const lab = statusLabel(a.status);
      const photos = (a.photos || []).slice(0, 6).map(p => `<img src="${p.dataUrl}" alt="Foto">`).join("");
      const note = (a.note || "").trim();

      detalhado += `
        <div class="rep-item">
          <h4>${escapeHtml(it.title)}</h4>
          <div class="rep-badge ${lab.c}">${lab.t}</div>
          ${note ? `<div class="rep-note">${escapeHtml(note)}</div>` : `<div class="rep-note">Sem observações.</div>`}
          ${photos ? `<div class="rep-photos">${photos}</div>` : ``}
        </div>
      `;
    }
  }
  detalhado += `</div>`;

  const footer = `
    <div class="rep-block">
      <h3>Créditos</h3>
      <div class="rep-item">
        <div class="rep-note">Criado por Jonatan Vale em parceria com Vale Produção</div>
      </div>
    </div>
  `;

  $("#reportBox").innerHTML = header + dados + resumo + pendencias + dimBlock + detalhado + footer;
  showToast("📄 Relatório pronto. Use Imprimir/Salvar PDF.");

  } finally {
    setBusy(false);
  }
}

/* ===== Helpers de imagem ===== */
function fileToDataURLCompressed(file, maxW = 1280, quality = 0.82){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        const ratio = img.width / img.height;
        let w = img.width, h = img.height;
        if (w > maxW) { w = maxW; h = Math.round(w / ratio); }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("IMG_LOAD_FAIL"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* ===== Preencher formulário ===== */
function fillForm(v){
  $("#tipoLocal").value = v.local.tipoLocal || "";
  $("#nomeLocal").value = v.local.nomeLocal || "";
  $("#endereco").value = v.local.endereco || "";
  $("#area").value = (v.local.area_m2 ?? "");
  $("#pavimentos").value = (v.local.pavimentos ?? "");
  $("#altura").value = (v.local.altura_m ?? "");
  $("#lotacao").value = (v.local.lotacao ?? "");
  $("#obs").value = (v.local.obs ?? "");
  if ($("#clienteEmpresa")) $("#clienteEmpresa").value = (v.commercial?.clienteEmpresa ?? "");
  if ($("#projetoNome")) $("#projetoNome").value = (v.commercial?.projetoNome ?? "");
  if ($("#responsavelTecnico")) $("#responsavelTecnico").value = (v.commercial?.responsavelTecnico ?? "");
  if ($("#contatoWhatsapp")) $("#contatoWhatsapp").value = (v.commercial?.contatoWhatsapp ?? "");
  const riscos = new Set(v.local.riscos || []);
  $all(".risco").forEach(ch => ch.checked = riscos.has(ch.value));
  if ($("#geoLat")) $("#geoLat").value = (v.local?.geo?.lat ?? '') === '' ? '' : Number(v.local.geo.lat).toFixed(6);
  if ($("#geoLng")) $("#geoLng").value = (v.local?.geo?.lng ?? '') === '' ? '' : Number(v.local.geo.lng).toFixed(6);
  if ($("#geoAccuracy")) $("#geoAccuracy").value = v.local?.geo?.accuracy || '';
  if ($("#geoStatus")) $("#geoStatus").value = v.local?.geo?.lat ? 'Localização restaurada da vistoria' : 'Localização ainda não capturada';
  updateMapPreview(v.local?.geo?.lat, v.local?.geo?.lng, v.local?.nomeLocal || 'Local da vistoria');
  updateNovaIntelligence();
}


async function renderCommercialHub(){
  const wrap = $("#recentClients");
  if (!wrap) return;
  const items = await dbListVistorias(120);
  const byClient = new Map();
  const inspectors = new Set();
  for (const v of items){
    const c = v?.commercial?.clienteEmpresa?.trim() || "Sem cliente";
    const p = v?.commercial?.projetoNome?.trim() || "Projeto avulso";
    const r = v?.commercial?.responsavelTecnico?.trim();
    if (r) inspectors.add(r);
    if (!byClient.has(c)) byClient.set(c, { count: 0, projects: new Set(), lastUpdate: 0, tipo: v?.local?.tipoLocal || 'comercio' });
    const row = byClient.get(c);
    row.count += 1;
    row.projects.add(p);
    row.lastUpdate = Math.max(row.lastUpdate, Number(v.updatedAt || 0));
  }
  const clientCountEl = $("#commercialClientsCount");
  const projectCountEl = $("#commercialProjectsCount");
  const inspectorsEl = $("#commercialInspectorsCount");
  if (clientCountEl) clientCountEl.textContent = `${byClient.size} clientes`;
  const totalProjects = Array.from(byClient.values()).reduce((n, row) => n + row.projects.size, 0);
  if (projectCountEl) projectCountEl.textContent = `${totalProjects} projetos`;
  if (inspectorsEl) inspectorsEl.textContent = `${inspectors.size} responsáveis`;

  if (!items.length){
    wrap.innerHTML = '<div class="client-empty">Cadastre clientes e projetos para visualizar a central comercial.</div>';
    return;
  }

  const ordered = Array.from(byClient.entries()).sort((a,b) => b[1].lastUpdate - a[1].lastUpdate).slice(0,4);
  wrap.innerHTML = ordered.map(([client, row]) => `
    <article class="client-hub-card">
      <div>
        <strong>${escapeHtml(client)}</strong>
        <small>${row.projects.size} projeto(s) • ${row.count} vistoria(s)</small>
      </div>
      <div class="client-meta">
        <span>${escapeHtml(formatDateTime(row.lastUpdate || Date.now()))}</span>
      </div>
    </article>
  `).join('');
}

/* ===== Router ===== */
async function handleRoute(){
  const base = routeBase();
  const params = getHashParams();

  if (base.startsWith("#/home")){ setActiveView("#viewHome"); await renderCommercialHub(); return; }
  if (base.startsWith("#/nova")){ setActiveView("#viewNova"); updateNovaIntelligence(); ensureNovaViewReady(); return; }
  if (base.startsWith("#/salvas")){ setActiveView("#viewSalvas"); await renderLista(); return; }

  if (base.startsWith("#/checklist")){
    const id = params.id || currentVistoriaId || lastSavedId;
    if (!id){ showToast("[!] Abra ou crie uma vistoria primeiro."); toRoute("#/salvas"); return; }
    setActiveView("#viewChecklist");
    await loadChecklistView(id);
    return;
  }

  if (base.startsWith("#/relatorio")){
    const id = params.id || currentVistoriaId || lastSavedId;
    if (!id){ showToast("[!] Abra ou crie uma vistoria primeiro."); toRoute("#/salvas"); return; }
    setActiveView("#viewRelatorio");
    await loadRelatorioView(id);
    return;
  }

  setActiveView("#viewHome");
}

window.addEventListener("hashchange", () => { handleRoute(); });
window.addEventListener("DOMContentLoaded", () => {
  if (!location.hash) location.hash = "#/home";
  initIntroExperience();
  updateNovaIntelligence();
  handleRoute();
  ensureNovaViewReady();
});
