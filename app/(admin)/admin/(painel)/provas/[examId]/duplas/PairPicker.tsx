"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { makePairs, shortNames, type PairMode, type Person } from "@/lib/pairs";

const modes: { value: PairMode; label: string; hint: string }[] = [
  { value: "random", label: "Sorteio livre", hint: "Qualquer aluno com qualquer aluno." },
  { value: "mixed", label: "Misturar níveis", hint: "Cada aluno da metade de cima da turma (pela nota) com um da metade de baixo." },
];

/** Cartão igual ao Panel do painel; não o importo porque ui.tsx puxa código só de servidor. */
function Panel({ title, description, children, className }: { title?: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-paper-raised p-5 sm:p-7", className)}>
      {title ? <h2 className="text-xl font-bold">{title}</h2> : null}
      {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
      <div className={cn(title || description ? "mt-4" : undefined)}>{children}</div>
    </section>
  );
}

/** Sorteio de duplas feito no navegador: nada é salvo nem enviado. */
export function PairPicker({ people }: { people: Person[] }) {
  const [extras, setExtras] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(people.map((p) => p.id)));
  const [mode, setMode] = useState<PairMode>("random");
  const [seed, setSeed] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false);

  const everyone = useMemo(() => [...people, ...extras], [people, extras]);
  const present = useMemo(() => everyone.filter((p) => selected.has(p.id)), [everyone, selected]);
  const hasScores = present.some((p) => p.score !== null);
  const groups = useMemo(() => (seed === null ? [] : makePairs(present, mode, seed)), [present, mode, seed]);
  const labels = useMemo(() => shortNames(present), [present]);

  // Mudar a lista ou o modo apaga o resultado: nada de duplas antigas com gente que saiu.
  function change(update: () => void) {
    update();
    setSeed(null);
    setCopied(false);
  }

  function toggle(id: string) {
    change(() =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    );
  }

  function addName() {
    const name = newName.trim();
    if (!name) return;
    const person: Person = { id: `extra-${crypto.randomUUID()}`, name, score: null };
    change(() => {
      setExtras((prev) => [...prev, person]);
      setSelected((prev) => new Set(prev).add(person.id));
      setNewName("");
    });
  }

  function draw() {
    setSeed(crypto.getRandomValues(new Uint32Array(1))[0].toString(36));
    setCopied(false);
  }

  const asText = groups
    .map((g, i) => `${g.length > 2 ? "Trio" : "Dupla"} ${i + 1}: ${g.map((p) => labels.get(p.id)).join(" e ")}`)
    .join("\n");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Panel
          title="Quem está na aula"
          description={`${present.length} de ${everyone.length} marcados. Desmarque quem faltou.`}
        >
          <div className="mb-3 flex gap-2 text-sm">
            <Button variant="ghost" className="min-h-9 px-3 text-sm" onClick={() => change(() => setSelected(new Set(everyone.map((p) => p.id))))}>
              Marcar todos
            </Button>
            <Button variant="ghost" className="min-h-9 px-3 text-sm" onClick={() => change(() => setSelected(new Set()))}>
              Desmarcar todos
            </Button>
          </div>
          {everyone.length === 0 ? (
            <p className="text-sm text-ink-soft">Ninguém fez esta prova ainda. Adicione os nomes abaixo.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {everyone.map((p) => (
                <li key={p.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="size-5 accent-pen"
                    />
                    <span className={cn("text-sm", !selected.has(p.id) && "text-ink-muted line-through")}>{p.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addName();
            }}
          >
            <label htmlFor="novo-nome" className="sr-only">
              Adicionar um nome
            </label>
            <input
              id="novo-nome"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Adicionar um nome"
              maxLength={80}
              className="min-h-11 min-w-0 flex-1 rounded-control border border-line-strong bg-paper px-3 text-sm"
            />
            <Button type="submit" variant="secondary" className="min-h-11 px-4 text-sm" disabled={!newName.trim()}>
              Adicionar
            </Button>
          </form>
        </Panel>

        <Panel title="Como sortear">
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Modo do sorteio</legend>
            {modes.map((m) => {
              const disabled = m.value === "mixed" && !hasScores;
              return (
                <label
                  key={m.value}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-control border p-3",
                    mode === m.value ? "border-pen bg-pen-soft" : "border-line",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input
                    type="radio"
                    name="modo"
                    value={m.value}
                    checked={mode === m.value}
                    disabled={disabled}
                    onChange={() => change(() => setMode(m.value))}
                    className="mt-1 size-4 accent-pen"
                  />
                  <span>
                    <span className="block text-sm font-medium">{m.label}</span>
                    <span className="block text-xs text-ink-soft">{disabled ? "Precisa de notas lançadas." : m.hint}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <p className="mt-3 text-xs text-ink-muted">As notas só servem para montar as duplas e não aparecem no resultado.</p>
        </Panel>
      </div>

      <Panel className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Duplas</h2>
          <div className="flex gap-2">
            {groups.length > 0 ? (
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(asText);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                <span aria-live="polite">{copied ? "Copiado" : "Copiar"}</span>
              </Button>
            ) : null}
            <Button onClick={draw} disabled={present.length < 2}>
              {groups.length > 0 ? "Sortear de novo" : "Sortear"}
            </Button>
          </div>
        </div>

        {present.length < 2 ? (
          <p className="mt-4 text-sm text-ink-soft">Marque pelo menos 2 alunos para sortear.</p>
        ) : groups.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">
            {present.length} alunos marcados. Aperte <b>Sortear</b>.
            {present.length % 2 === 1 ? " Como o número é ímpar, um grupo vai ser trio." : ""}
          </p>
        ) : (
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
            {groups.map((g, i) => (
              <li key={g.map((p) => p.id).join("|")} className="animate-fade-in rounded-card border border-line bg-paper-sunken p-4">
                <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                  {g.length > 2 ? "Trio" : "Dupla"} {i + 1}
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {g.map((p) => (
                    <li key={p.id} className="text-lg leading-snug font-bold break-words">
                      {labels.get(p.id)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
