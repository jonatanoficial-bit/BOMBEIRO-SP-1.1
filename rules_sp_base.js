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
  version: "0.2.0",
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
  const warnings = [];
  const results = [];

  const area = context.area_m2 ?? null;
  const lot = context.lotacao ?? null;

  // Regras “inteligentes” SEM números normativos:
  // Aqui a gente só gera recomendações do tipo “verificar necessidade”, sem afirmar quantidades.
  results.push({
    id: "rec_doc",
    category: "Documentação",
    title: "Organizar evidências mínimas de manutenção e testes",
    summary: "Reunir registros e evidências de manutenção/testes dos sistemas existentes.",
    details: "Registre datas, responsáveis, fotos e ocorrências. Isso ajuda a orientar adequações do contratante.",
    refs: [{ code: "PACOTE SP (BASE)", note: "Sem citações normativas no pacote base." }],
    severity: "info"
  });

  // Brigada / Bombeiro civil (placeholder)
  results.push({
    id: "rec_brigada",
    category: "Brigada",
    title: "Avaliar necessidade de brigada/treinamento e dimensionamento",
    summary: "Dimensionamento depende da ocupação, lotação, riscos e exigências aplicáveis.",
    details: "No pacote oficial, o app calculará quantitativo mínimo e justificará com IT/NBR/leis. Por enquanto, registre lotação, riscos e turnos.",
    refs: [{ code: "PACOTE SP (BASE)", note: "Cálculo normativo será inserido no pacote oficial." }],
    severity: "warn"
  });

  // Extintores (placeholder)
  results.push({
    id: "rec_extintores",
    category: "Extintores",
    title: "Avaliar quantidade, distribuição e tipo dos extintores",
    summary: "Verificar compatibilidade com riscos (elétrico, cozinha/óleo, inflamáveis, etc.).",
    details: "No pacote oficial, o app calculará mínimos por área/risco e justificará com referências. No base, registre o que existe (tipo/capacidade/localização/validade) e pendências.",
    refs: [{ code: "PACOTE SP (BASE)", note: "Sem valores numéricos oficiais." }],
    severity: "warn"
  });

  // Evento: recomendações extras
  if (context.tipoLocal === "evento" || context.possuiPalcoEstrutura) {
    results.push({
      id: "rec_evento_layout",
      category: "Evento",
      title: "Validar layout, barreiras, saídas temporárias e controle de público",
      summary: "Garantir fluxo seguro, saídas sinalizadas e rotas desobstruídas.",
      details: "Registrar largura de rotas, pontos de estrangulamento, barreiras e posicionamento de equipamentos.",
      refs: [{ code: "PACOTE SP (BASE)", note: "Pacote oficial trará requisitos e cálculos." }],
      severity: "critical"
    });
  }

  // Alertas de dados insuficientes
  if (!area) warnings.push("Área (m²) não informada: dimensionamento ficará limitado.");
  if (lot === null || lot === undefined) warnings.push("Lotação não informada: recomendações de público/brigada ficarão limitadas.");

  return { results, warnings };
}
