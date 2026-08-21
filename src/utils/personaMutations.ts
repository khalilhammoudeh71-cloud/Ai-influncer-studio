import type { Persona } from '../types';

export interface PersonaMutationDiff {
  added: Persona[];
  removed: Persona[];
  updated: Persona[];
}

export function diffPersonaMutations(previous: Persona[], next: Persona[]): PersonaMutationDiff {
  const previousById = new Map(previous.map((persona) => [persona.id, persona]));
  const nextById = new Map(next.map((persona) => [persona.id, persona]));

  return {
    added: next.filter((persona) => !previousById.has(persona.id)),
    removed: previous.filter((persona) => !nextById.has(persona.id)),
    updated: next.filter((persona) => {
      const prior = previousById.get(persona.id);
      return Boolean(prior) && JSON.stringify(prior) !== JSON.stringify(persona);
    }),
  };
}
