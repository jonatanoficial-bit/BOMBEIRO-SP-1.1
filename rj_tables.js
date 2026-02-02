/* rj_tables.js - CBMERJ (RJ Oficial - MVP)
   Offline-first: dimensionamento por regras + parâmetros (Admin), sem custo.

   Referências (RJ) vigentes:
   - COSCIP: Decreto RJ nº 42, de 17/12/2018, alterado pelo Decreto nº 46.925, de 05/02/2020 (versão compilada CBMERJ)
   - NT 2-01 (2ª edição - 2020): Sistema de proteção por extintores de incêndio
   - NT 2-05 (3ª edição - 2023): Sinalização de segurança contra incêndio e pânico
   - NT 2-06 (1ª edição - 2019): Iluminação de emergência (adota ABNT NBR 10898:2013 no que não contrariar a NT)

   IMPORTANTE:
   - Este app NÃO substitui o responsável técnico nem o CBMERJ.
   - Os parâmetros do cálculo são configuráveis no /admin para refletir fielmente a base normativa e o enquadramento do caso concreto.
*/

export const RJ_TABLES_VERSION = "1.0.0";

function readAdminNormas() {
  try {
    const raw = localStorage.getItem("ADMIN_NORMAS_JSON");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function getCfg(key, fallback){
  const a = readAdminNormas();
  if (a && a[key]) return a[key];
  return fallback;
}

function mk(id, category, title, summary, details, refs=[], severity="warn", value=null, unit=""){
  return {id, category, title, summary, details, refs, severity, value, unit};
}

// ===== EXTINTORES (NT 2-01 / 2020) — parametrizado no Admin =====
const DEF_EXT_RJ = {
  // Modelo inicial: densidade simples por área (ajustável).
  // Use o /admin para adequar a lógica conforme a NT 2-01 (2020) e enquadramento.
  per_m2: 200,
  min_total: 1,
  type: "Pó ABC",
  note: "Modelo inicial RJ. Ajuste no /admin conforme NT 2-01 (2ª ed., 2020) e o enquadramento do local."
};

export const EXTINGUISHERS_RJ = {
  enabled: true,
  refs: [
    "COSCIP (Decreto RJ 42/2018, alterado pelo 46.925/2020)",
    "NT 2-01 (2ª edição - 2020) — Extintores",
    "ABNT NBR 12693"
  ],
  compute(ctx){
    const cfg = getCfg("extintores_rj", DEF_EXT_RJ);
    const area = Number(ctx?.area_m2||0);
    let total = Number(cfg.min_total || 1);

    if(area>0 && Number(cfg.per_m2||0)>0){
      total = Math.max(total, Math.ceil(area/Number(cfg.per_m2)));
    }

    const details = [
      cfg.note || DEF_EXT_RJ.note,
      "",
      "Referências:",
      "• COSCIP (Decreto RJ 42/2018; alterações 46.925/2020).",
      "• NT 2-01 (2ª edição - 2020) — Sistema de proteção por extintores.",
      "• ABNT NBR 12693.",
      "",
      "Observação: este cálculo é um guia automatizado (MVP). Confirme distâncias, distribuição e riscos específicos conforme a NT aplicável."
    ].join("\n");

    return {
      results:[mk(
        "rj_ext_auto",
        "Extintores",
        "Extintores — cálculo automático (RJ / NT 2-01)",
        `Estimado: ${total} extintor(es) (modelo parametrizado).`,
        details,
        EXTINGUISHERS_RJ.refs,
        "critical",
        total,
        "un"
      )],
      warnings:[]
    };
  }
};

// ===== SINALIZAÇÃO (NT 2-05 / 2023) — checklist inteligente =====
export const SIGNAGE_RJ = {
  enabled: true,
  refs: [
    "NT 2-05 (3ª edição - 2023) — Sinalização",
    "ABNT NBR 13434"
  ],
  compute(ctx){
    const details =
      "Checklist inteligente (RJ):\n" +
      "• Rotas e saídas sinalizadas e visíveis.\n" +
      "• Sinalização de equipamentos (extintores, hidrantes, alarme).\n" +
      "• Sinalização de alerta/proibição em áreas de risco.\n\n" +
      "Referência: NT 2-05 (3ª ed., 2023) + ABNT NBR 13434.";
    return {
      results:[mk(
        "rj_sig_core",
        "Sinalização/Iluminação",
        "Sinalização de emergência — verificação (RJ / NT 2-05)",
        "Verificar placas, rotas, equipamentos e alertas em pontos críticos.",
        details,
        SIGNAGE_RJ.refs,
        "warn"
      )],
      warnings:[]
    };
  }
};

// ===== ILUMINAÇÃO (NT 2-06 / 2019) — checklist inteligente =====
export const LIGHTING_RJ = {
  enabled: true,
  refs: [
    "NT 2-06 (1ª edição - 2019) — Iluminação de emergência",
    "ABNT NBR 10898:2013"
  ],
  compute(ctx){
    const pav = Math.max(1, Number(ctx?.pavimentos||1));
    const details =
      "Checklist inteligente (RJ):\n" +
      "• Iluminação de emergência em rotas de fuga, escadas e saídas.\n" +
      "• Condição, fixação e manutenção das luminárias/blocos autônomos.\n" +
      "• Teste funcional quando possível.\n\n" +
      "Referência: NT 2-06 (2019) — adota ABNT NBR 10898:2013 no que não contrariar a NT.";
    return {
      results:[mk(
        "rj_ilu_core",
        "Sinalização/Iluminação",
        "Iluminação de emergência — verificação (RJ / NT 2-06)",
        `Verificar iluminação em rotas, saídas e pontos críticos (${pav} pavimento(s)).`,
        details,
        LIGHTING_RJ.refs,
        "warn"
      )],
      warnings:[]
    };
  }
};

export const RJ_TABLES = {
  version: RJ_TABLES_VERSION,
  EXTINGUISHERS_RJ,
  SIGNAGE_RJ,
  LIGHTING_RJ
};
