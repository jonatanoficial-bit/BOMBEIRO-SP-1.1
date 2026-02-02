import { RJ_TABLES } from "./rj_tables.js";

export const PACK_INFO = {
  id: "rj_oficial",
  name: "Rio de Janeiro (RJ Oficial - MVP)",
  version: "1.0.0",
  updatedAt: "2026-02-02",
  note: "Pacote RJ (vigente): COSCIP 42/2018 (alter. 46.925/2020) + NTs CBMERJ (extintores, sinalização, iluminação). Offline-first."
};

export function computeAll(context){
  const out = [];
  const warns = [];

  if(RJ_TABLES.EXTINGUISHERS_RJ?.enabled){
    const r = RJ_TABLES.EXTINGUISHERS_RJ.compute(context);
    out.push(...r.results); warns.push(...(r.warnings||[]));
  }
  if(RJ_TABLES.SIGNAGE_RJ?.enabled){
    const r = RJ_TABLES.SIGNAGE_RJ.compute(context);
    out.push(...r.results); warns.push(...(r.warnings||[]));
  }
  if(RJ_TABLES.LIGHTING_RJ?.enabled){
    const r = RJ_TABLES.LIGHTING_RJ.compute(context);
    out.push(...r.results); warns.push(...(r.warnings||[]));
  }

  return {results: out, warnings: warns};
}
