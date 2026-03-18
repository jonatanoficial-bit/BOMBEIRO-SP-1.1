/* rules_sp_base.js - Pacote base (stub) SP
   ⚠️ Este pacote NÃO contém números normativos oficiais.
   Ele entrega:
   - checklist macro
   - estrutura de dimensionamento (computeSizing) pronta
   Depois você troca este pacote por "sp-oficial" com IT/NBR/leis e valores reais.
*/

export const PACK_INFO = {
  id: "sp-base",
  name: "São Paulo (Base)",
  version: "0.3.0",
  updatedAt: "2025-01-01",
  note: "Checklist macro + framework de dimensionamento. Sem valores normativos oficiais."
};

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
        item("ident_man", "Registros de manutenção (extintores/iluminação/alarme)", "Se existir sistema, verificar evidências mínimas de manutenção e teste.")
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
        item("ext_tipo", "Tipos compatíveis com riscos", "Ex.: risco elétrico, cozinha/óleo, inflamáveis — registrar o que existe e o que falta.", ["cozinha", "inflamaveis"]),
        item("ext_sinal", "Sinalização do extintor", "Sinalização visível e correta do ponto do equipamento."),
        item("ext_acesso", "Acesso livre ao extintor", "Sem móveis, caixas ou obstáculos na frente."),
        item("ext_valid", "Validade/lacre/manômetro/condição", "Verificar indicadores básicos: lacre, pressão (quando houver), condições visuais.")
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
        item("al_central", "Central/indicadores operacionais (se existe)", "Registrar se há central e condição aparente."),
        item("al_acion", "Acionadores/sirenes (se existe)", "Verificar presença, acesso e condição."),
        item("al_teste", "Registros de teste/manutenção", "Se existir sistema, verificar evidências mínimas.")
      ]
    },
    {
      id: "brigada",
      title: "Brigada / Plano de emergência",
      items: [
        item("br_plano", "Plano de emergência/orientações internas", "Procedimentos básicos, rota, encontro, responsável."),
        item("br_treino", "Treinamento/brigadistas definidos", "Registrar se há brigada e se há evidência de treinamento."),
        item("br_dimension", "Dimensionamento (quando aplicável)", "Será calculado pelo pacote oficial (no futuro).")
      ]
    },
    {
      id: "riscos",
      title: "Riscos Especiais",
      items: [
        item("r_glp", "GLP: armazenamento e sinalização", "Condição do botijão/central, ventilação e sinalização.", ["glp"]),
        item("r_cozinha", "Cozinha/óleo: controle de risco", "Presença de risco K/limpeza/ordem; registrar.", ["cozinha"]),
        item("r_inflam", "Inflamáveis: armazenamento e controle", "Local adequado, sinalização e controle.", ["inflamaveis"]),
        item("r_subsolo", "Subsolo: rotas e ventilação", "Checar acessos, rotas e condições.", ["subsolo"]),
        item("r_evento", "Evento: layout/saídas temporárias/controle público", "Se evento, registrar layout, saídas e barreiras.", ["palco","som_luz"])
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

/**
 * computeSizing(context)
 * Retorna recomendações calculáveis (placeholder).
 * No pacote oficial você colocará:
 * - regras + fórmulas + limites
 * - referências (IT/NBR/Lei) em refs[]
 */
export function computeSizing(context) {
  const results = [];
  const warnings = [];

  const area = Number(context.area_m2 || 0);
  const lot = context.lotacao ?? null;
  const pav = Number(context.pavimentos || 1);
  const altura = Number(context.altura_m || 0);

  const riskFactors = [];
  if (context.possuiCozinhaIndustrial || (context.riscos || []).includes("cozinha")) riskFactors.push({ label: "Cozinha industrial", weight: 12 });
  if (context.possuiGLP || (context.riscos || []).includes("glp")) riskFactors.push({ label: "GLP", weight: 16 });
  if ((context.riscos || []).includes("inflamaveis")) riskFactors.push({ label: "Inflamaveis", weight: 18 });
  if (context.possuiPalcoEstrutura || (context.riscos || []).includes("palco")) riskFactors.push({ label: "Palco/Estrutura", weight: 14 });
  if ((context.riscos || []).includes("som_luz")) riskFactors.push({ label: "Som/Luz", weight: 8 });
  if ((context.riscos || []).includes("subsolo")) riskFactors.push({ label: "Subsolo", weight: 14 });
  if (area >= 750) riskFactors.push({ label: "Area ampliada", weight: 10 });
  if (pav >= 3) riskFactors.push({ label: "Multiplos pavimentos", weight: 8 });
  if (altura >= 12) riskFactors.push({ label: "Altura relevante", weight: 8 });
  if ((lot || 0) >= 300) riskFactors.push({ label: "Alta lotacao", weight: 14 });

  const riskScore = Math.min(100, riskFactors.reduce((s, f) => s + f.weight, 12));
  const readinessBase = 100
    - (area ? 0 : 10)
    - (lot === null || lot === undefined ? 12 : 0)
    - (pav ? 0 : 6)
    - (!context.ocupacao ? 8 : 0)
    - (!context.horarioFuncionamento ? 4 : 0)
    - (riskFactors.length ? 0 : 8);
  const readiness = Math.max(35, Math.min(96, readinessBase));

  let priority = "Moderada";
  let prioritySeverity = "warn";
  if (riskScore >= 70 || readiness <= 55) { priority = "Critica"; prioritySeverity = "critical"; }
  else if (riskScore <= 35 && readiness >= 80) { priority = "Controlada"; prioritySeverity = "info"; }

  const minimumTeam = estimateMinimumTeam({ tipoLocal: context.tipoLocal, lot, area, pav, riskScore, palco: context.possuiPalcoEstrutura });

  results.push({
    id: "metric_risk_score",
    category: "Painel Tecnico",
    title: "Score de risco operacional",
    summary: `Indice estimado: ${riskScore}/100`,
    details: riskFactors.length ? `Fatores considerados: ${riskFactors.map(x => x.label).join(", ")}.` : "Sem fatores adicionais marcados; revise os riscos do local.",
    refs: [{ code: "PACOTE SP (BASE)", note: "Score orientativo interno para triagem e priorizacao." }],
    severity: riskScore >= 70 ? "critical" : (riskScore >= 40 ? "warn" : "info"),
    value: riskScore,
    unit: "/100"
  });

  results.push({
    id: "metric_readiness",
    category: "Painel Tecnico",
    title: "Indice de prontidao da vistoria",
    summary: `Prontidao atual: ${readiness}/100`,
    details: "Indice baseado na completude dos dados-base para orientar a confianca da pre-analise.",
    refs: [{ code: "PACOTE SP (BASE)", note: "Nao substitui validacao normativa oficial." }],
    severity: readiness < 60 ? "critical" : (readiness < 80 ? "warn" : "info"),
    value: readiness,
    unit: "/100"
  });

  results.push({
    id: "metric_team",
    category: "Equipe Minima",
    title: "Estimativa operacional minima",
    summary: `${minimumTeam} profissional(is) recomendado(s) para operacao inicial.`,
    details: context.tipoLocal === "evento"
      ? "Estimativa considera publico, area e complexidade operacional do evento; ajustar por turnos e setores."
      : "Estimativa considera area, lotacao e complexidade geral do local; validar necessidade de cobertura por turno.",
    refs: [{ code: "PACOTE SP (BASE)", note: "Estimativa comercial/operacional inicial, sem valor normativo oficial." }],
    severity: minimumTeam >= 6 ? "critical" : (minimumTeam >= 3 ? "warn" : "info"),
    value: minimumTeam,
    unit: "profissionais"
  });

  results.push({
    id: "metric_priority",
    category: "Plano de Acao",
    title: "Prioridade global da pre-vistoria",
    summary: `Prioridade ${priority}.`,
    details: priority === "Critica"
      ? "Atue primeiro em rotas de fuga, extintores, sinalizacao e organizacao operacional antes da apresentacao ao cliente."
      : priority === "Moderada"
      ? "Ha base para prosseguir, mas com pendencias relevantes a tratar antes da entrega final."
      : "Base inicial consistente para refinamento visual, documental e evidencias de campo.",
    refs: [{ code: "PACOTE SP (BASE)", note: "Classificacao interna para priorizacao de reparos." }],
    severity: prioritySeverity
  });

  if (!context.ocupacao) {
    results.push({
      id: "rec_ocupacao",
      category: "Dados",
      title: "Definir ocupacao principal do local",
      summary: "A ocupacao orienta o roteiro tecnico e a narrativa do relatorio.",
      details: "Padronize nomes como loja, restaurante, deposito, show, feira ou evento corporativo para melhorar consistencia das proximas fases.",
      refs: [{ code: "PACOTE SP (BASE)", note: "Padronizacao interna do produto." }],
      severity: "warn"
    });
  }

  if (context.tipoLocal === "evento" || context.possuiPalcoEstrutura) {
    results.push({
      id: "rec_event_staffing",
      category: "Evento",
      title: "Planejar equipe por setor e turno",
      summary: "Eventos exigem cobertura operacional distribuida, nao apenas total bruto.",
      details: `Considere no minimo ${minimumTeam} profissional(is) e separe entrada, area de publico, backstage e rotas de evacuacao quando aplicavel.`,
      refs: [{ code: "PACOTE SP (BASE)", note: "Dimensionamento operacional preliminar para eventos." }],
      severity: minimumTeam >= 5 ? "critical" : "warn"
    });
  }

  results.push({
    id: "rec_brigada",
    category: "Brigada / Operacao",
    title: "Avaliar necessidade de brigada, treinamento e evidencias",
    summary: "Registre responsaveis, orientacoes e disponibilidade operacional minima.",
    details: "Na fase comercial, este bloco servira para justificar equipe minima, cobertura por turno e necessidade de treinamento/documentacao.",
    refs: [{ code: "PACOTE SP (BASE)", note: "Sem quantitativos normativos oficiais nesta versao." }],
    severity: riskScore >= 60 ? "critical" : "warn"
  });

  results.push({
    id: "rec_extintores",
    category: "Extintores",
    title: "Avaliar quantidade, distribuicao e tipo dos extintores",
    summary: "Verificar compatibilidade com riscos (eletrico, cozinha/oleo, inflamaveis etc.).",
    details: "No pacote oficial, o app calculara minimos por area/risco e justificara com referencias. No base, registre tipo, capacidade, localizacao, acesso e validade.",
    refs: [{ code: "PACOTE SP (BASE)", note: "Sem valores numericos oficiais." }],
    severity: riskScore >= 60 ? "critical" : "warn"
  });

  if (!area) warnings.push("Area (m²) nao informada: dimensionamento ficara limitado.");
  if (lot === null || lot === undefined) warnings.push("Lotacao nao informada: estimativa de equipe e controle de publico ficam limitados.");
  if (!context.horarioFuncionamento) warnings.push("Horario de funcionamento nao informado: cobertura por turno pode ficar subdimensionada.");

const complexity = Math.min(100, Math.round((riskScore * 0.55) + ((pav || 1) * 6) + ((area >= 1000) ? 12 : area >= 500 ? 6 : 0) + ((context.tipoLocal === "evento") ? 12 : 4)));
const complianceForecast = Math.max(18, Math.min(98, Math.round((readiness * 0.58) + (100 - riskScore) * 0.42)));
const responseLevel = riskScore >= 78 ? 4 : riskScore >= 58 ? 3 : riskScore >= 34 ? 2 : 1;
const commercialMaturity = Math.max(30, Math.min(96, Math.round((readiness * 0.5) + (complianceForecast * 0.3) + ((100 - complexity) * 0.2))));

results.push({
  id: "metric_complexity",
  category: "Painel Tecnico",
  title: "Complexidade operacional",
  summary: `Complexidade estimada: ${complexity}/100`,
  details: "Combina risco, tipologia, area e distribuicao operacional para orientar equipe, narrativa de relatorio e venda tecnica.",
  refs: [{ code: "PACOTE SP (BASE)", note: "Indice interno orientativo para operacao e escopo." }],
  severity: complexity >= 70 ? "critical" : (complexity >= 40 ? "warn" : "info"),
  value: complexity,
  unit: "/100"
});

results.push({
  id: "metric_compliance_forecast",
  category: "Painel Tecnico",
  title: "Previsao de conformidade",
  summary: `Chance orientativa de conformidade inicial: ${complianceForecast}/100`,
  details: "Leitura comercial para pre-vistoria, combinando dados preenchidos e nivel de risco. Nao substitui validacao oficial.",
  refs: [{ code: "PACOTE SP (BASE)", note: "Indice interno de previsao comercial." }],
  severity: complianceForecast < 55 ? "critical" : (complianceForecast < 75 ? "warn" : "info"),
  value: complianceForecast,
  unit: "/100"
});

results.push({
  id: "metric_response_level",
  category: "Operacao",
  title: "Nivel de resposta sugerido",
  summary: responseLevel === 4 ? "Resposta maxima sugerida." : responseLevel === 3 ? "Resposta alta sugerida." : responseLevel === 2 ? "Resposta moderada sugerida." : "Resposta base sugerida.",
  details: "Classificacao interna para apoiar cobertura operacional, distribuicao de equipe e argumentacao tecnica com cliente.",
  refs: [{ code: "PACOTE SP (BASE)", note: "Classificacao interna por faixa de risco." }],
  severity: responseLevel >= 3 ? "critical" : (responseLevel === 2 ? "warn" : "info"),
  value: responseLevel,
  unit: "nivel"
});

results.push({
  id: "metric_commercial_maturity",
  category: "Produto",
  title: "Maturidade comercial da vistoria",
  summary: `Maturidade estimada: ${commercialMaturity}/100`,
  details: "Ajuda a entender se a vistoria ja possui narrativa, dados e consistencia suficientes para uma entrega comercial mais forte.",
  refs: [{ code: "PACOTE SP (BASE)", note: "Indice interno de produto e entrega." }],
  severity: commercialMaturity < 55 ? "warn" : "info",
  value: commercialMaturity,
  unit: "/100"
});

  return { results, warnings };
}

function estimateMinimumTeam({ tipoLocal, lot, area, pav, riskScore, palco }) {
  let team = 1;
  if (area >= 200) team += 1;
  if (area >= 600) team += 1;
  if (area >= 1200) team += 1;
  if ((lot || 0) >= 100) team += 1;
  if ((lot || 0) >= 300) team += 1;
  if ((lot || 0) >= 800) team += 2;
  if (pav >= 3) team += 1;
  if (riskScore >= 60) team += 1;
  if (tipoLocal === "evento") team += 1;
  if (palco) team += 1;
  return Math.max(1, team);
}


export function computeNeedsEstimate(context) {
  const area = Number(context.area_m2 || 0);
  const lot = Number(context.lotacao || 0);
  const pav = Number(context.pavimentos || 1);
  const altura = Number(context.altura_m || 0);
  const riscos = new Set(context.riscos || []);
  const tipoLocal = context.tipoLocal || "comercio";
  const isEvento = tipoLocal === "evento";

  let extBase = Math.max(1, Math.ceil(area / (isEvento ? 250 : 200)));
  if (lot >= 100) extBase += 1;
  if (lot >= 300) extBase += 1;
  if (pav >= 3) extBase += 1;
  if (riscos.has("inflamaveis")) extBase += 1;
  if (riscos.has("subsolo")) extBase += 1;

  const extClasses = [];
  extClasses.push("A");
  extClasses.push(riscos.has("inflamaveis") || riscos.has("glp") || riscos.has("som_luz") ? "BC" : "ABC");
  if (riscos.has("cozinha")) extClasses.push("K");
  const extClassesUniq = Array.from(new Set(extClasses));

  const hidranteNeeded = area >= 750 || pav >= 3 || altura >= 12 || lot >= 500 || riscos.has("subsolo");
  const iluminacaoNeeded = isEvento || area >= 100 || pav > 1 || lot >= 50;
  const sinalizacaoNeeded = isEvento || area >= 50 || pav > 1 || lot >= 30;
  const alarmeNeeded = isEvento || lot >= 200 || area >= 400 || pav >= 3;
  const brigadistas = estimateMinimumTeam({ tipoLocal, lot, area, pav, riskScore: (area >= 750 ? 60 : 35) + (riscos.has("glp") ? 12 : 0) + (riscos.has("cozinha") ? 10 : 0), palco: riscos.has("palco") });

  const confidence = Math.max(45, Math.min(92,
    45
    + (area ? 12 : 0)
    + (lot ? 10 : 0)
    + (pav ? 8 : 0)
    + (context.ocupacao ? 8 : 0)
    + ((context.riscos || []).length ? 9 : 0)
  ));

  const recommendations = [
    {
      key: "extintores",
      title: "Extintores",
      needed: true,
      estimate: `${extBase} unidade(s) estimada(s)`,
      details: `Classes sugeridas: ${extClassesUniq.join(", ")}. Distribuir em pontos de acesso e rotas.`,
      confidence
    },
    {
      key: "hidrantes",
      title: "Hidrante",
      needed: hidranteNeeded,
      estimate: hidranteNeeded ? "Provável necessidade de sistema" : "Sem indicativo forte na estimativa inicial",
      details: hidranteNeeded ? "Validar exigência pelo porte, altura, pavimentos e ocupação." : "Confirmar em análise técnica final.",
      confidence: Math.max(40, confidence - 8)
    },
    {
      key: "iluminacao",
      title: "Iluminação de emergência",
      needed: iluminacaoNeeded,
      estimate: iluminacaoNeeded ? "Necessária na estimativa inicial" : "Avaliar conforme layout e rotas",
      details: "Priorizar rotas de fuga, saídas e pontos críticos.",
      confidence
    },
    {
      key: "sinalizacao",
      title: "Sinalização de saída",
      needed: sinalizacaoNeeded,
      estimate: sinalizacaoNeeded ? "Necessária na estimativa inicial" : "Avaliar conforme ocupação",
      details: "Incluir saídas, rotas e equipamentos de emergência.",
      confidence
    },
    {
      key: "alarme",
      title: "Alarme / acionamento",
      needed: alarmeNeeded,
      estimate: alarmeNeeded ? "Recomendado para este cenário" : "Sem indicativo forte na triagem inicial",
      details: "Checar necessidade por lotação, área e operação do local.",
      confidence: Math.max(38, confidence - 10)
    },
    {
      key: "brigada",
      title: "Brigadistas / equipe mínima",
      needed: brigadistas > 0,
      estimate: `${brigadistas} profissional(is) estimado(s)`,
      details: isEvento ? "Separar por entrada, público e apoio operacional." : "Avaliar cobertura por turno e responsável local.",
      confidence
    }
  ];

  const checklistHints = [];
  if (hidranteNeeded) checklistHints.push("Incluir validação de hidrante ou sistema equivalente.");
  if (iluminacaoNeeded) checklistHints.push("Validar iluminação de emergência em rotas e saídas.");
  if (sinalizacaoNeeded) checklistHints.push("Validar sinalização de saída e de equipamentos.");
  checklistHints.push(`Conferir ${extBase} extintor(es) estimado(s) e classes ${extClassesUniq.join(", ")}.`);
  if (brigadistas) checklistHints.push(`Registrar equipe mínima estimada de ${brigadistas} profissional(is).`);

  return {
    recommendations,
    extintores: { quantidade: extBase, classes: extClassesUniq },
    hidrante: hidranteNeeded,
    iluminacao: iluminacaoNeeded,
    sinalizacao: sinalizacaoNeeded,
    alarme: alarmeNeeded,
    brigadistas,
    confidence,
    checklistHints
  };
}
