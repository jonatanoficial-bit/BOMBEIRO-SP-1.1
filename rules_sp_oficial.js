/* rules_sp_oficial.js - São Paulo (Oficial / Estruturado + Tabelas)
   - Checklist macro
   - Engine de dimensionamento com base legal + tabelas plugáveis
   - Tabelas ficam DESATIVADAS até inserir valores oficiais.

   Arquivos dependentes:
   - sp_tables.js
*/

import { SP_TABLES, mkRef, mkResult } from "./sp_tables.js";

export const PACK_INFO = {
  id: "sp-oficial",
  name: "São Paulo (Oficial)",
  version: "0.2.0",
  updatedAt: "2025-12-29",
  note:
    "Estrutura oficial (refs + validações + tabelas plugáveis). Tabelas numéricas ainda não ativadas."
};

/* ===== Base de Referências (metadados) ===== */
export const RULES_DB = {
  jurisdiction: "BR-SP",
  legal: [
    {
      id: "sp_decreto_69118_2024",
      title: "Decreto SP nº 69.118/2024 - Regulamento de Segurança Contra Incêndios",
      type: "DECRETO",
      authority: "Governo do Estado de São Paulo",
      issued: "2024-12-09",
      summary:
        "Base do regulamento estadual para SCI em SP, orientando o processo de regularização (AVCB/CLCB/LAVCB/TAACB)."
    }
  ],
  viafacil: [
    {
      id: "viafacil_pts",
      title: "Via Fácil Bombeiros - PTS/PT (processos)",
      type: "PROCEDIMENTO",
      summary:
        "Orientações de processo no sistema. O enquadramento pode exigir PTS ou PT conforme risco/complexidade."
    }
  ],
  its: [
    { id: "it_01", code: "IT-01", title: "Procedimentos Administrativos", year: null },
    { id: "it_21", code: "IT-21", title: "Sistema de proteção por extintores de incêndio", year: null },
    { id: "it_17", code: "IT-17", title: "Brigada de incêndio", year: null },
    { id: "it_42", code: "IT-42", title: "Projeto Técnico Simplificado (PTS)", year: null }
  ],
  nbrs: [
    { id: "nbr_12693", code: "ABNT NBR 12693", title: "Sistemas de proteção por extintores de incêndio", year: 2021 },
    { id: "nbr_14276", code: "ABNT NBR 14276", title: "Brigada de incêndio", year: null }
  ],
  tables: {
    version: SP_TABLES.version,
    extinguisher: { enabled: !!SP_TABLES.EXTINGUISHERS.enabled, note: SP_TABLES.EXTINGUISHERS.note },
    brigade: { enabled: !!SP_TABLES.BRIGADE.enabled, note: SP_TABLES.BRIGADE.note },
    civil_firebrigade: { enabled: !!SP_TABLES.CIVIL_FIREBRIGADE.enabled, note: SP_TABLES.CIVIL_FIREBRIGADE.note },
    signage_lighting: { enabled: !!SP_TABLES.SIGNAGE_LIGHTING.enabled, note: SP_TABLES.SIGNAGE_LIGHTING.note }
  }
};

/* ===== Checklist ===== */
function item(id, title, help, tags = []) {
  return { id, title, help, tags };
}

export function buildChecklist({ tipoLocal, riscos = [] }) {
  const r = new Set(riscos);

  const sections = [
    {
      id: "ident",
      title: "Identificação e Documentos",
      items: [
        item("ident_placa", "Placas de lotação/regras (quando aplicável)", "Verificar se há controle/limites e orientações visíveis quando aplicável."),
        item("ident_planta", "Planta/croqui disponível para orientação", "Se não houver, registrar e sugerir croqui para orientar rotas e equipamentos."),
        item("ident_man", "Registros de manutenção (extintores/iluminação/alarme)", "Verificar evidências mínimas de manutenção e teste quando houver sistemas.")
      ]
    },
    {
      id: "rotas",
      title: "Rotas de fuga e Saídas",
      items: [
        item("rotas_desob", "Rotas de fuga desobstruídas", "Corredores, portas e saídas sem obstáculos, materiais ou travamentos indevidos."),
        item("rotas_portas", "Portas de saída funcionais", "Sem cadeados durante operação; registrar travas e bloqueios."),
        item("rotas_larg", "Larguras compatíveis com fluxo", "Registrar gargalos, estreitamentos e barreiras."),
        item("rotas_escadas", "Escadas/níveis com proteção e segurança", "Corrimão/guarda-corpo quando aplicável; registrar riscos."),
        item("rotas_dist", "Percurso até saídas e alternativa", "Registrar se percurso parece excessivo/sem alternativas.")
      ]
    },
    {
      id: "ext",
      title: "Extintores",
      items: [
        item("ext_qtd", "Quantidade/distribuição adequada", "Verificar se há extintores suficientes e bem distribuídos."),
        item("ext_tipo", "Tipos compatíveis com riscos", "Compatibilidade com risco elétrico, cozinha/óleo, inflamáveis etc.", ["cozinha", "inflamaveis"]),
        item("ext_sinal", "Sinalização do extintor", "Sinalização visível e correta do ponto do equipamento."),
        item("ext_acesso", "Acesso livre ao extintor", "Sem obstáculos no acesso."),
        item("ext_valid", "Validade/lacre/manômetro/condição", "Verificar indicadores: lacre, pressão (quando houver), integridade.")
      ]
    },
    {
      id: "sinal",
      title: "Sinalização de emergência",
      items: [
        item("sinal_rotas", "Sinalização de rotas e saídas", "Placas indicando saída/rota conforme necessidade do ambiente."),
        item("sinal_equip", "Sinalização de equipamentos", "Extintores, hidrantes, alarme, etc."),
        item("sinal_alerta", "Sinalização de alerta/risco", "Riscos específicos (energia, inflamáveis, GLP, etc.).", ["glp", "inflamaveis"])
      ]
    },
    {
      id: "ilu",
      title: "Iluminação de emergência",
      items: [
        item("ilu_pres", "Iluminação de emergência presente", "Verificar existência em rotas, saídas e pontos críticos."),
        item("ilu_teste", "Teste funcional básico", "Se possível, registrar teste simples/indicadores."),
        item("ilu_aut", "Autonomia/condição aparente", "Estado das luminárias e bateria; registrar falhas.")
      ]
    },
    {
      id: "alarme",
      title: "Alarme e Detecção (quando houver)",
      items: [
        item("al_central", "Central/indicadores operacionais (se existe)", "Registrar existência e condição aparente."),
        item("al_acion", "Acionadores/sirenes (se existe)", "Verificar presença, acesso e condição."),
        item("al_teste", "Registros de teste/manutenção", "Se existir sistema, verificar evidências mínimas.")
      ]
    },
    {
      id: "brigada",
      title: "Brigada / Plano de emergência",
      items: [
        item("br_plano", "Plano de emergência/orientações internas", "Procedimentos básicos, rota, encontro, responsável."),
        item("br_treino", "Treinamento/brigadistas definidos", "Registrar evidência de treinamento e designação."),
        item("br_dimension", "Dimensionamento (quando aplicável)", "Será calculado por tabela oficial no pacote SP quando ativado.")
      ]
    },
    {
      id: "riscos",
      title: "Riscos Especiais",
      items: [
        item("r_glp", "GLP: armazenamento e sinalização", "Condição do botijão/central, ventilação e sinalização.", ["glp"]),
        item("r_cozinha", "Cozinha/óleo: controle de risco", "Limpeza/ordem, risco de gordura, registro.", ["cozinha"]),
        item("r_inflam", "Inflamáveis: armazenamento e controle", "Local adequado, sinalização e controle.", ["inflamaveis"]),
        item("r_subsolo", "Subsolo: rotas e ventilação", "Checar acessos, rotas e condições.", ["subsolo"]),
        item("r_evento", "Evento: layout/saídas temporárias/controle público", "Registrar layout, saídas, barreiras e fluxo.", ["palco","som_luz"])
      ]
    }
  ];

  for (const sec of sections) {
    sec.items = sec.items.filter(it => {
      if (!it.tags || it.tags.length === 0) return true;
      if (tipoLocal === "evento" && (it.tags.includes("palco") || it.tags.includes("som_luz"))) return true;
      return it.tags.some(t => r.has(t));
    });
  }

  return sections;
}

/* ===== Motor de Dimensionamento ===== */
export function computeSizing(context) {
  const warnings = [];
  const results = [];

  const area = num(context.area_m2);
  const pav = int(context.pavimentos);
  const lot = int(context.lotacao);
  const tipoLocal = context.tipoLocal || "comercio";
  const riscos = Array.isArray(context.riscos) ? context.riscos : [];

  // Validações de entrada
  if (!area) warnings.push("Área (m²) não informada: cálculos ficam limitados.");
  if (pav === null) warnings.push("Pavimentos não informados: análise de rotas/saídas pode ficar limitada.");
  if (lot === null) warnings.push("Lotação não informada: recomendações de controle de público/brigada ficam limitadas.");
  if (!context.ocupacao) warnings.push("Ocupação/atividade não informada: critérios podem variar por enquadramento.");

  // Refs "macro"
  const refDecreto = mkRef("DECRETO SP 69.118/2024", "Base do regulamento estadual para SCI em SP.");
  const refViaFacil = mkRef("Via Fácil Bombeiros", "Processo PTS/PT e orientações do sistema.");
  const refIT21 = mkRef("IT-21", "Extintores (SP).");
  const refNBR12693 = mkRef("ABNT NBR 12693", "Extintores: requisitos de projeto/seleção/instalação.");
  const refIT17 = mkRef("IT-17", "Brigada (SP).");
  const refNBR14276 = mkRef("ABNT NBR 14276", "Brigada: diretrizes.");

  // Sempre: base do processo e objetivo do documento
  results.push(
    mkResult({
      id: "sp_base_legal",
      category: "Base legal e processo",
      title: "Conferir enquadramento e processo de licenciamento",
      summary: "Confirmar se o caso é PTS, PT ou outra via e reunir documentos e evidências.",
      details:
        "O app gera relatório de adequações para o contratante. Vistoria/licenciamento oficial segue procedimento do CBPMESP.",
      refs: [refDecreto, refViaFacil],
      severity: "info"
    })
  );

  // Evento: reforço operacional
  if (tipoLocal === "evento" || riscos.includes("palco") || context.possuiPalcoEstrutura) {
    results.push(
      mkResult({
        id: "evt_fluxo",
        category: "Evento",
        title: "Validar layout, saídas temporárias e controle de público",
        summary: "Garantir fluxo seguro, rotas desobstruídas e sinalização adequada para evacuação.",
        details:
          "Registrar mapa do layout, barreiras, gargalos, pontos de maior densidade, posição de extintores e equipe.",
        refs: [refDecreto, refViaFacil],
        severity: "critical"
      })
    );
  }

  // ===== Extintores =====
  if (SP_TABLES.EXTINGUISHERS.enabled) {
    const { results: r2, warnings: w2 } = SP_TABLES.EXTINGUISHERS.calculators.computeMinimum(context);
    results.push(...(r2 || []));
    warnings.push(...(w2 || []));
  } else {
    results.push(
      mkResult({
        id: "ext_disabled",
        category: "Extintores",
        title: "Dimensionamento automático de extintores (aguardando tabela oficial)",
        summary:
          "O motor está pronto, mas a tabela oficial ainda não foi ativada.",
        details:
          "Quando habilitar, o app calculará mínimo, distribuição e justificativa (refs IT/NBR). Por enquanto, registre: quantidade, tipos, localização, validade e pendências.",
        refs: [refIT21, refNBR12693],
        severity: "warn"
      })
    );
  }

  // ===== Brigada =====
  if (SP_TABLES.BRIGADE.enabled) {
    const { results: r3, warnings: w3 } = SP_TABLES.BRIGADE.calculators.computeMinimum(context);
    results.push(...(r3 || []));
    warnings.push(...(w3 || []));
  } else {
    results.push(
      mkResult({
        id: "brig_disabled",
        category: "Brigada",
        title: "Dimensionamento automático de brigada (aguardando tabela oficial)",
        summary:
          "O motor está pronto, mas a tabela oficial ainda não foi ativada.",
        details:
          "Quando habilitar, o app calculará mínimo de brigadistas e justificará no relatório. Por enquanto, registre lotação, turnos, riscos e responsável interno.",
        refs: [refIT17, refNBR14276, refDecreto],
        severity: "warn"
      })
    );
  }

  // ===== Bombeiro Civil (opcional / futuro) =====
  if (SP_TABLES.CIVIL_FIREBRIGADE.enabled) {
    const { results: r4, warnings: w4 } = SP_TABLES.CIVIL_FIREBRIGADE.calculators.computeNeed(context);
    results.push(...(r4 || []));
    warnings.push(...(w4 || []));
  } else {
    results.push(
      mkResult({
        id: "bc_disabled",
        category: "Bombeiro Civil",
        title: "Avaliar necessidade de bombeiro civil (regras futuras)",
        summary:
          "Estrutura pronta para automatizar conforme critérios que você definir para operação/contratos/eventos.",
        details:
          "Por enquanto, registre: público, layout, pontos críticos, turnos e plano operacional.",
        refs: [mkRef("Operação/Contrato", "Definir conforme risco e estratégia do local.")],
        severity: "info"
      })
    );
  }

  // ===== Sinalização/Iluminação =====
  if (SP_TABLES.SIGNAGE_LIGHTING.enabled) {
    const { results: r5, warnings: w5 } = SP_TABLES.SIGNAGE_LIGHTING.calculators.compute(context);
    results.push(...(r5 || []));
    warnings.push(...(w5 || []));
  } else {
    results.push(
      mkResult({
        id: "sig_disabled",
        category: "Sinalização/Iluminação",
        title: "Regras automáticas de sinalização/iluminação (aguardando parâmetros)",
        summary:
          "Estrutura pronta para automatizar após inserir regras oficiais aplicáveis.",
        details:
          "Por enquanto, registre: placas de saída/rota, equipamentos, iluminação de emergência, testes e falhas.",
        refs: [mkRef("Pacote SP (Oficial)", "Parâmetros serão adicionados.")],
        severity: "info"
      })
    );
  }

  // Consolidação final
  return { results, warnings };
}

/* ===== Helpers ===== */
function num(v) {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}
function int(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.trunc(Number(String(v).trim()));
  return Number.isFinite(n) ? n : null;
}
