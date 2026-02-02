/* sp_tables.js - Bombeiro SP (SP Oficial - Tabelas / Motor de Regras)
   Offline-first: o dimensionamento é calculado por regras + parâmetros (Admin), sem custo.

   Referências (SP):
   - Decreto SP nº 69.118/2024 (Regulamento SCI)
   - IT-21/2025 (Extintores) — inclui distâncias máximas (25m/20m/15m) e mínimos por pavimento
   - IT-20/2025 (Sinalização)
   - IT-18/2025 (Iluminação) + ABNT NBR 10898
   - IT-17/2025 (Brigada) — tabela A.1 (não incluída aqui por ser extensa; usamos parametrização no Admin)

   IMPORTANTE:
   - Este app NÃO substitui o responsável técnico nem o órgão fiscalizador.
   - Os parâmetros podem ser ajustados no /admin para refletir fielmente sua base normativa e o caso concreto.
*/

// ===== Helpers: normas parametrizáveis (Admin) =====
function readAdminNormas() {
  try {
    const raw = localStorage.getItem("ADMIN_NORMAS_JSON");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function getNormasSection(key, fallback) {
  const admin = readAdminNormas();
  if (admin && admin[key]) return admin[key];
  return fallback;
}

export const SP_TABLES_VERSION = "1.0.0";

/** Referências curtas (para aparecer no relatório) */
export function mkRef(code, note = "") {
  return { code: String(code || ""), note: String(note || "") };
}

/** Ajuda a manter consistência nos outputs */
export function mkResult({
  id,
  category,
  title,
  summary = "",
  details = "",
  refs = [],
  severity = "info",
  value = null,
  unit = ""
}) {
  return {
    id: String(id || "rec_" + Math.random().toString(16).slice(2)),
    category: String(category || "Geral"),
    title: String(title || "Recomendação"),
    summary: String(summary || ""),
    details: String(details || ""),
    refs: Array.isArray(refs) ? refs : [],
    severity: String(severity || "info"),
    value,
    unit: String(unit || "")
  };
}

/** Estrutura de classificação (mínimo viável) */
export const OCCUPANCY = {
  enabled: false,
  note:
    "Classificação completa por Grupo/Divisão (SP) será adicionada em um pacote avançado. No MVP, use o campo 'Ocupação/atividade' no formulário.",
  options: []
};

// ===== EXTINTORES (IT-21/2025) =====
const DEFAULT_EXT = {
  // Parâmetros complementares (Admin):
  // - per_m2: usado como aproximação de densidade quando a área é grande (não substitui análise por percurso)
  per_m2: 200,

  // IT-21/2025: mínimo por pavimento, exceto área < 50 m² (pode ser 1 unidade ABC)
  single_if_area_lt_m2: 50,
  min_per_pavimento: 2,

  // Distâncias máximas de caminhamento (IT-21/2025, Tabela 1)
  max_walk_m: { baixo: 25, medio: 20, alto: 15 },

  // Tipo sugerido (padrão)
  type: "Pó ABC",
  note:
    "Automação baseada em IT-21/2025 (CBPMESP) + parâmetros configuráveis (Admin). Confirme enquadramento e riscos específicos (cozinha, inflamáveis, GLP, etc.)."
};

export const EXTINGUISHERS = {
  enabled: true,
  note: "Dimensionamento mínimo automático (MVP) baseado em IT-21/2025 + parâmetros do Admin.",
  refs: [
    mkRef("IT-21/2025 (SP)", "Sistema de proteção por extintores de incêndio."),
    mkRef("ABNT NBR 12693", "Sistema de proteção por extintores (diretrizes).")
  ],

  calculators: {
    computeMinimum(context) {
      const warnings = [];
      const results = [];

      const cfg = getNormasSection("extintores", DEFAULT_EXT);

      const areaTotal = num(context?.area_m2) || 0;
      const pav = Math.max(1, int(context?.pavimentos) || 1);
      const risco = String(context?.grauRisco || context?.risco || "medio").toLowerCase();

      const areaPorPav = areaTotal > 0 ? areaTotal / pav : 0;

      // Regras IT-21/2025 (MVP)
      const limiteUnico = Number(cfg.single_if_area_lt_m2 || DEFAULT_EXT.single_if_area_lt_m2);
      const minPorPav = Number(cfg.min_per_pavimento || DEFAULT_EXT.min_per_pavimento);

      let minPorPavAplicado = minPorPav;
      let regraAreaPequena = false;

      if (areaPorPav > 0 && areaPorPav < limiteUnico) {
        // IT-21/2025: permitido 1 unidade ABC em pavimentos < 50 m²
        minPorPavAplicado = 1;
        regraAreaPequena = true;
      }

      const minTotal = minPorPavAplicado * pav;

      // Complemento por densidade (parâmetro do Admin)
      const per_m2 = Number(cfg.per_m2 || DEFAULT_EXT.per_m2);
      let porDensidade = 0;
      if (areaTotal > 0 && per_m2 > 0) porDensidade = Math.ceil(areaTotal / per_m2);

      const total = Math.max(minTotal, porDensidade || 0, minTotal);

      const distMap = cfg.max_walk_m || DEFAULT_EXT.max_walk_m;
      const maxWalk = Number(distMap?.[risco] ?? distMap?.medio ?? 20);

      const details = [
        cfg.note || DEFAULT_EXT.note,
        "",
        "Regras automáticas aplicadas (MVP):",
        `• Mínimo por pavimento: ${minPorPav} (IT-21/2025).`,
        `• Exceção: pavimento < ${limiteUnico} m² pode ter 1 unidade extintora (${cfg.type || "ABC"}).`,
        `• Distância máxima de caminhamento (Tabela 1, IT-21/2025): risco ${risco} → ${maxWalk} m.`,
        "",
        "Observações importantes:",
        "• Riscos específicos (cozinha profissional, inflamáveis, GLP etc.) exigem análise e podem demandar tipos específicos.",
        "• Se o pavimento tiver subdivisões sem passagem, cada subdivisão pode exigir o mínimo (ver IT-21/2025).",
        "• Este cálculo é um guia automatizado. Confirme o projeto conforme o caso concreto."
      ].join("\n");

      results.push(
        mkResult({
          id: "ext_auto_sp2025",
          category: "Extintores",
          title: "Extintores — cálculo automático (SP/IT-21/2025)",
          summary: regraAreaPequena
            ? `Mínimo estimado: ${total} extintor(es). Observação: área por pavimento < ${limiteUnico} m² → permitido 1 unidade por pavimento.`
            : `Mínimo estimado: ${total} extintor(es) (mínimo ${minPorPavAplicado} por pavimento).`,
          details,
          refs: EXTINGUISHERS.refs,
          severity: "critical",
          value: total,
          unit: "un"
        })
      );

      if (!areaTotal) warnings.push("Área (m²) não informada: o dimensionamento automático fica limitado.");
      if (!context?.pavimentos) warnings.push("Pavimentos não informados: aplicado valor padrão 1.");
      if (!context?.grauRisco && !context?.risco) warnings.push("Grau de risco não informado: usado 'médio' (20 m).");

      return { results, warnings };
    }
  }
};

// ===== BRIGADA (IT-17/2025) — parametrizada no Admin =====
const DEFAULT_BRIG = {
  // Tabela simplificada configurável:
  // Por padrão: 1 brigadista a cada N pessoas (ajuste no Admin conforme IT-17/2025 Anexo A.1)
  mode: "ratio",
  ratio: { baixo: 50, medio: 30, alto: 20 }, // pessoas por brigadista
  min_total: 1,
  note:
    "Modelo configurável. Ajuste no /admin conforme IT-17/2025 (Anexo A.1) levando em conta ocupação/grupo/divisão, risco e população fixa por turno."
};

export const BRIGADE = {
  enabled: true,
  note: "Dimensionamento configurável (Admin). Estrutura pronta para tabela completa da IT-17/2025.",
  refs: [
    mkRef("IT-17/2025 (SP)", "Brigada de incêndio."),
    mkRef("ABNT NBR 14276", "Brigada (diretrizes).")
  ],
  calculators: {
    computeMinimum(context) {
      const warnings = [];
      const results = [];

      const cfg = getNormasSection("brigada", DEFAULT_BRIG);
      const lot = int(context?.lotacao) || 0;
      const risco = String(context?.grauRisco || context?.risco || "medio").toLowerCase();

      if (!lot) warnings.push("Lotação não informada: dimensionamento de brigada fica limitado.");

      let min = Number(cfg.min_total || DEFAULT_BRIG.min_total);

      if (cfg.mode === "ratio") {
        const r = Number((cfg.ratio && (cfg.ratio[risco] ?? cfg.ratio.medio)) || DEFAULT_BRIG.ratio.medio);
        if (lot && r > 0) min = Math.max(min, Math.ceil(lot / r));
      }

      results.push(
        mkResult({
          id: "brig_auto_cfg",
          category: "Brigada",
          title: "Brigada — cálculo automático (configurável)",
          summary: lot
            ? `Mínimo estimado: ${min} brigadista(s) (risco ${risco}).`
            : `Informe a lotação para calcular automaticamente a brigada (risco ${risco}).`,
          details:
            (cfg.note || DEFAULT_BRIG.note) +
            `\n\nParâmetros atuais: modo=${cfg.mode}, ratio=${JSON.stringify(cfg.ratio || {})}, mínimo=${cfg.min_total}.`,
          refs: BRIGADE.refs,
          severity: "warn",
          value: lot ? min : null,
          unit: "pessoas"
        })
      );

      return { results, warnings };
    }
  }
};

// ===== SINALIZAÇÃO / ILUMINAÇÃO (IT-20/2025 + IT-18/2025) — checklist inteligente =====
export const SIGNAGE_LIGHTING = {
  enabled: true,
  note: "Checklist inteligente (sem quantificação detalhada). Parâmetros avançados podem ser adicionados depois.",
  refs: [
    mkRef("IT-20/2025 (SP)", "Sinalização de emergência."),
    mkRef("ABNT NBR 13434", "Sinalização de segurança contra incêndio e pânico."),
    mkRef("IT-18/2025 (SP)", "Iluminação de emergência."),
    mkRef("ABNT NBR 10898", "Sistema de iluminação de emergência.")
  ],
  calculators: {
    compute(context) {
      const warnings = [];
      const results = [];

      const pav = Math.max(1, int(context?.pavimentos) || 1);

      results.push(
        mkResult({
          id: "sig_core",
          category: "Sinalização/Iluminação",
          title: "Sinalização de emergência (SP) — verificação automática",
          summary: "Verificar placas de rota/saída, equipamentos e alertas em pontos críticos.",
          details:
            "Itens principais para vistoria (SP):\n" +
            "• Sinalização de rotas e saídas (placas visíveis e coerentes).\n" +
            "• Sinalização de equipamentos (extintores, hidrantes, alarme etc.).\n" +
            "• Sinalização de alerta/proibição (riscos específicos).\n\n" +
            "Dica prática: fotografe as rotas e pontos críticos; registre ausências e posicionamento incorreto.",
          refs: SIGNAGE_LIGHTING.refs,
          severity: "warn"
        })
      );

      results.push(
        mkResult({
          id: "ilu_core",
          category: "Sinalização/Iluminação",
          title: "Iluminação de emergência (SP) — verificação automática",
          summary: `Verificar iluminação em rotas, saídas e pontos críticos (${pav} pavimento(s)).`,
          details:
            "Itens principais para vistoria (SP):\n" +
            "• Presença em rotas de fuga, escadas, saídas e pontos críticos.\n" +
            "• Condição aparente e fixação das luminárias.\n" +
            "• Teste funcional (quando possível) e evidência de manutenção.\n\n" +
            "Observação: a IT-18 adota a NBR 10898 no que não contrariar a IT.",
          refs: SIGNAGE_LIGHTING.refs,
          severity: "warn"
        })
      );

      return { results, warnings };
    }
  }
};

// ===== Bombeiro Civil (futuro) =====
export const CIVIL_FIREBRIGADE = {
  enabled: true,
  note:
    "Estrutura pronta. Quantificação oficial/contratual será adicionada em um pacote avançado (DLC).",
  refs: [mkRef("Plano de emergência/Contrato", "Definir conforme risco, público e estratégia operacional.")],
  calculators: {
    computeNeed(context) {
      const warnings = [];
      const results = [];

      if ((context?.tipoLocal || "") === "evento") {
        results.push(
          mkResult({
            id: "bc_event_attention",
            category: "Bombeiro Civil",
            title: "Evento: avaliar equipe operacional (bombeiro civil)",
            summary:
              "Eventos exigem planejamento operacional (fluxo, saídas, comunicação e resposta inicial).",
            details:
              "Registre layout, público, pontos críticos e forma de controle de acesso para definir equipe mínima.",
            refs: CIVIL_FIREBRIGADE.refs,
            severity: "warn"
          })
        );
      } else {
        results.push(
          mkResult({
            id: "bc_info",
            category: "Bombeiro Civil",
            title: "Avaliar necessidade de bombeiro civil (caso a caso)",
            summary:
              "Pode depender de risco, operação, público e exigências do contratante/órgãos.",
            details:
              "Estrutura pronta para regras futuras (DLC).",
            refs: CIVIL_FIREBRIGADE.refs,
            severity: "info"
          })
        );
      }

      return { results, warnings };
    }
  }
};

// ===== Export agregado =====
export const SP_TABLES = {
  version: SP_TABLES_VERSION,
  OCCUPANCY,
  EXTINGUISHERS,
  BRIGADE,
  CIVIL_FIREBRIGADE,
  SIGNAGE_LIGHTING
};

// ===== Helpers numéricos =====
function num(v) {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}
function int(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.trunc(Number(String(v).trim()));
  return Number.isFinite(n) ? n : null;
}
