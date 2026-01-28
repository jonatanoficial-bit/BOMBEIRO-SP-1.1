/* sp_tables.js - Bombeiro SP (SP Oficial - Tabelas)
   Objetivo:
   - Centralizar tabelas e parâmetros para dimensionamento (extintores, brigada, etc.)
   - Manter estrutura plugável (fácil de atualizar sem quebrar código)
   Importante:
   - Por padrão, as tabelas ficam DESATIVADAS (enabled=false) até você inserir valores oficiais.
   - Não inclui textos integrais de normas; apenas IDs e metadados.

   Como evoluir:
   1) Preencher arrays/tabelas com valores oficiais (IT/NBR/Decreto aplicáveis)
   2) Definir fórmulas de cálculo dentro dos "calculators"
   3) Ativar enabled=true no pacote oficial
*/

export const SP_TABLES_VERSION = "0.1.0";

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

/** Estrutura de classificação (placeholder) */
export const OCCUPANCY = {
  enabled: false,
  note:
    "Classificação por ocupação/grupo/divisão será adicionada com base oficial (SP/CBPMESP).",
  // Exemplos de formato (NÃO OFICIAL):
  // options: [
  //   { id: "comercio_varejo", label: "Comércio varejista", tags:["comercio"] },
  //   { id: "restaurante", label: "Restaurante", tags:["comercio","cozinha"] },
  //   { id: "evento_show", label: "Evento / show", tags:["evento","palco"] }
  // ]
  options: []
};

/** Tabela de extintores (placeholder) */
export const EXTINGUISHERS = {
  enabled: false,
  note:
    "Tabela de dimensionamento de extintores será preenchida com base em IT-21/NBR 12693 e requisitos SP.",
  refs: [
    mkRef("IT-21", "Sistema de proteção por extintores (SP)."),
    mkRef("ABNT NBR 12693", "Extintores: projeto/seleção/instalação.")
  ],

  // Estruturas possíveis:
  // - limites por área, por classe de risco, por distâncias máximas, capacidade extintora mínima etc.
  // Exemplo de esquema (NÃO OFICIAL):
  schema: {
    // classesRisco: ["A","B","C","K"],
    // maxDistance_m: { A: 15, B: 15, C: 15, K: 10 },
    // minRating: { A:"2-A", B:"20-B", C:"C", K:"K" },
  },

  /** Calculadores (você liga quando tiver valores oficiais) */
  calculators: {
    /**
     * computeMinimum(context) -> { results[], warnings[] }
     * context contém: area_m2, ocupacao, riscos, pavimentos, etc.
     */
    computeMinimum(context) {
      const warnings = [];
      const results = [];

      // Placeholder inteligente (sem números):
      results.push(
        mkResult({
          id: "ext_placeholder_min",
          category: "Extintores",
          title: "Dimensionar mínimo de extintores (tabela oficial pendente)",
          summary:
            "A definição do mínimo depende de ocupação, área, riscos e critérios aplicáveis.",
          details:
            "Esta função está pronta para calcular automaticamente quando a tabela oficial for preenchida (enabled=true) com valores de IT/NBR/Decreto aplicáveis.",
          refs: EXTINGUISHERS.refs,
          severity: "warn"
        })
      );

      // Exemplo de alerta por dados faltantes:
      if (!context?.area_m2) warnings.push("Área não informada: cálculo de extintores limitado.");
      if (!context?.ocupacao) warnings.push("Ocupação não informada: classificação e critérios podem mudar.");

      return { results, warnings };
    }
  }
};

/** Tabela de brigada (placeholder) */
export const BRIGADE = {
  enabled: false,
  note:
    "Tabela de dimensionamento de brigada/brigadistas será preenchida com base IT-17/NBR 14276 e critérios SP.",
  refs: [
    mkRef("IT-17", "Brigada de incêndio (SP)."),
    mkRef("ABNT NBR 14276", "Brigada de incêndio (diretrizes).")
  ],

  schema: {
    // Exemplo (NÃO OFICIAL):
    // byOccupancy: { restaurante: { ... }, comercio: { ... }, evento: { ... } }
  },

  calculators: {
    computeMinimum(context) {
      const warnings = [];
      const results = [];

      results.push(
        mkResult({
          id: "brig_placeholder_min",
          category: "Brigada",
          title: "Dimensionar brigada/brigadistas (tabela oficial pendente)",
          summary:
            "O mínimo depende de ocupação, lotação, riscos, turnos e exigências aplicáveis.",
          details:
            "Esta função está pronta para calcular automaticamente quando a tabela oficial for preenchida (enabled=true).",
          refs: BRIGADE.refs,
          severity: "warn"
        })
      );

      if (context?.lotacao == null) warnings.push("Lotação não informada: dimensionamento de brigada limitado.");
      if (!context?.ocupacao) warnings.push("Ocupação não informada: critérios de brigada podem mudar por atividade.");

      return { results, warnings };
    }
  }
};

/** Bombeiro civil (placeholder) */
export const CIVIL_FIREBRIGADE = {
  enabled: false,
  note:
    "Critérios para bombeiro civil (nível/quantidade) podem variar por contrato, risco e exigências locais. Estrutura pronta para regras futuras.",
  refs: [mkRef("Contrato/Plano de emergência", "Definir conforme risco, público e estratégia do local.")],

  calculators: {
    computeNeed(context) {
      const warnings = [];
      const results = [];

      results.push(
        mkResult({
          id: "bc_placeholder_need",
          category: "Bombeiro Civil",
          title: "Avaliar necessidade de bombeiro civil (regras pendentes)",
          summary:
            "A necessidade pode depender de eventos, público, risco, layout e exigências do contratante/órgãos.",
          details:
            "Esta seção será automatizada quando definirmos a matriz oficial/contratual (enabled=true).",
          refs: CIVIL_FIREBRIGADE.refs,
          severity: "info"
        })
      );

      if (context?.tipoLocal === "evento") {
        results.push(
          mkResult({
            id: "bc_event_attention",
            category: "Bombeiro Civil",
            title: "Evento: reforçar equipe e controle operacional",
            summary:
              "Eventos geralmente exigem planejamento operacional (fluxo, barreiras, saídas, comunicação).",
            details:
              "Registre layout, pontos críticos e forma de controle de público para definir equipe mínima.",
            refs: [mkRef("Planejamento de evento", "Recomendações operacionais." )],
            severity: "warn"
          })
        );
      }

      return { results, warnings };
    }
  }
};

/** Sinalização/Iluminação (placeholder) */
export const SIGNAGE_LIGHTING = {
  enabled: false,
  note:
    "Regras e critérios de sinalização e iluminação de emergência serão parametrizados por SP/ABNT aplicáveis.",
  refs: [mkRef("Sinalização/Iluminação", "Referências serão adicionadas no pacote oficial.")],

  calculators: {
    compute(context) {
      const warnings = [];
      const results = [];

      results.push(
        mkResult({
          id: "sig_placeholder",
          category: "Sinalização/Iluminação",
          title: "Verificar sinalização e iluminação de emergência (regras pendentes)",
          summary:
            "Avaliar rotas, saídas, pontos críticos e presença/funcionamento dos sistemas.",
          details:
            "A automatização com quantidades/posicionamento será habilitada após inserir regras oficiais (enabled=true).",
          refs: SIGNAGE_LIGHTING.refs,
          severity: "info"
        })
      );

      return { results, warnings };
    }
  }
};

/** Export agregado (facilita consumo no pacote oficial) */
export const SP_TABLES = {
  version: SP_TABLES_VERSION,
  OCCUPANCY,
  EXTINGUISHERS,
  BRIGADE,
  CIVIL_FIREBRIGADE,
  SIGNAGE_LIGHTING
};
