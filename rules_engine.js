/* rules_engine.js - Bombeiro SP
   Engine plugável para cálculos/recomendações.
   IMPORTANTE: Este engine NÃO assume valores normativos por conta própria.
   Quem fornece fórmulas/limiares/citações é o PACOTE (ex.: SP completo no futuro).
*/

function safeNum(v) {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function clampStr(s, max = 2000) {
  const t = String(s ?? "");
  return t.length > max ? t.slice(0, max) + "…" : t;
}

/**
 * context: dados do local + riscos + inputs adicionais
 * pack: pacote regulatório (funções)
 */
export function runSizing({ context, pack }) {
  const out = {
    pack: pack?.PACK_INFO || { id: "unknown", name: "Sem pacote", version: "0.0.0" },
    computedAt: Date.now(),
    inputs: context,
    results: [],
    warnings: []
  };

  if (!pack || typeof pack.computeSizing !== "function") {
    out.warnings.push("Pacote não possui computeSizing(). Dimensionamento indisponível.");
    return out;
  }

  try {
    const res = pack.computeSizing(normalizeContext(context));
    if (res && Array.isArray(res.results)) out.results = res.results.map(normalizeResult);
    if (res && Array.isArray(res.warnings)) out.warnings = res.warnings.map(x => clampStr(x, 400));
    return out;
  } catch (e) {
    out.warnings.push("Falha ao calcular dimensionamento (erro interno do pacote).");
    return out;
  }
}

function normalizeContext(ctx) {
  const riscos = Array.isArray(ctx?.riscos) ? ctx.riscos : [];
  return {
    // Base
    tipoLocal: ctx?.tipoLocal || "comercio",
    nomeLocal: ctx?.nomeLocal || "",
    endereco: ctx?.endereco || "",
    area_m2: safeNum(ctx?.area_m2),
    pavimentos: safeNum(ctx?.pavimentos),
    altura_m: safeNum(ctx?.altura_m),
    lotacao: safeNum(ctx?.lotacao),
    riscos,

    // Inputs adicionais (dimensionamento)
    ocupacao: clampStr(ctx?.ocupacao || "", 120),     // ex.: "Comércio varejista", "Evento temporário", etc.
    horarioFuncionamento: clampStr(ctx?.horarioFuncionamento || "", 120),
    publicoPredominante: clampStr(ctx?.publicoPredominante || "", 120), // ex.: "adulto", "misto", "criança"
    possuiCozinhaIndustrial: !!ctx?.possuiCozinhaIndustrial,
    possuiGLP: !!ctx?.possuiGLP,
    possuiPalcoEstrutura: !!ctx?.possuiPalcoEstrutura,

    observacoesDim: clampStr(ctx?.observacoesDim || "", 2000)
  };
}

function normalizeResult(r) {
  // Modelo “universal” de recomendação calculada
  return {
    id: String(r?.id || "rec_" + Math.random().toString(16).slice(2)),
    category: String(r?.category || "Geral"),
    title: String(r?.title || "Recomendação"),
    summary: String(r?.summary || ""),
    details: String(r?.details || ""),
    // refs: lista de referências que o pacote vai preencher no futuro
    refs: Array.isArray(r?.refs) ? r.refs.map(x => ({
      code: String(x?.code || ""),     // ex.: "IT-XX", "NBR-XXXX", "Lei ...", etc.
      note: String(x?.note || "")
    })) : [],
    severity: String(r?.severity || "info"), // info | warn | critical
    value: r?.value ?? null,                 // número ou texto calculado
    unit: String(r?.unit || "")
  };
}
