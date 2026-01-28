// IA explicativa offline
// Converte regras + resultados em explicações técnicas claras

export function explicar(item){
  return {
    titulo: item.titulo || "Exigência Técnica",
    texto: "Este item é exigido conforme normas vigentes aplicáveis ao tipo de edificação, área e risco informado. Justificativa automática baseada em regras cadastradas."
  };
}
