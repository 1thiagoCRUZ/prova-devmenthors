import { seededShuffle } from "./shuffle";

export interface Person {
  id: string;
  name: string;
  /** Nota na prova; só usada no modo "misturar níveis". */
  score: number | null;
}

export type PairMode = "random" | "mixed";

/**
 * Monta as duplas. Com número ímpar sobra um aluno, que entra como terceiro numa dupla (trio).
 *
 * - random: sorteio puro.
 * - mixed: metade de cima da turma (pela nota) com metade de baixo, cada metade sorteada,
 *   então "sortear de novo" dá duplas diferentes sem juntar forte com forte.
 */
export function makePairs(people: readonly Person[], mode: PairMode, seed: string): Person[][] {
  if (people.length === 0) return [];
  if (people.length === 1) return [[people[0]]];

  return mode === "mixed" ? mixedPairs(people, seed) : chunkPairs(seededShuffle(people, seed));
}

function chunkPairs(shuffled: Person[]): Person[][] {
  const groups: Person[][] = [];
  for (let i = 0; i + 1 < shuffled.length; i += 2) groups.push([shuffled[i], shuffled[i + 1]]);
  if (shuffled.length % 2 === 1) groups[groups.length - 1].push(shuffled[shuffled.length - 1]);
  return groups;
}

function mixedPairs(people: readonly Person[], seed: string): Person[][] {
  // Empates na nota ficam em ordem sorteada (o sort do JS é estável).
  const ranked = seededShuffle(people, `${seed}:empate`).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const half = Math.floor(ranked.length / 2);
  const top = seededShuffle(ranked.slice(0, half), `${seed}:cima`);
  const bottom = seededShuffle(ranked.slice(ranked.length - half), `${seed}:baixo`);

  const groups = top.map((person, i) => [person, bottom[i]]);
  if (ranked.length % 2 === 1) {
    // O aluno do meio da fila entra como terceiro numa dupla sorteada.
    const middle = ranked[half];
    const [target] = seededShuffle(groups.map((_, i) => i), `${seed}:trio`);
    groups[target].push(middle);
  }
  return groups;
}

/** "Michelli Valentina Alves Moreira" vira "Michelli Moreira"; se repetir na turma, usa o nome inteiro. */
export function shortNames(people: readonly Person[]): Map<string, string> {
  const short = new Map<string, string>();
  const count = new Map<string, number>();
  for (const p of people) {
    const parts = p.name.trim().split(/\s+/);
    const label = parts.length > 1 ? `${capitalize(parts[0])} ${capitalize(parts[parts.length - 1])}` : capitalize(parts[0] ?? "");
    short.set(p.id, label);
    count.set(label, (count.get(label) ?? 0) + 1);
  }
  for (const p of people) {
    if ((count.get(short.get(p.id) ?? "") ?? 0) > 1) short.set(p.id, p.name.trim());
  }
  return short;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
