/**
 * Datas do painel sempre num fuso fixo (servidor e browser renderizam igual,
 * sem erro de hidratação). Padrão: horário de Brasília.
 */
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "America/Sao_Paulo";

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return dateTimeFormat.format(new Date(iso));
}

/** Diferença (ms) entre o fuso e UTC naquele instante. */
function zoneOffset(timestamp: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(timestamp))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(timestamp / 1000) * 1000;
}

/** ISO → valor de <input type="datetime-local"> no fuso do app. */
export function isoToLocalInput(iso: string) {
  const ts = Date.parse(iso);
  return new Date(ts + zoneOffset(ts)).toISOString().slice(0, 16);
}

/** Valor de <input type="datetime-local"> (no fuso do app) → ISO UTC. */
export function localInputToIso(local: string): string | null {
  const naive = Date.parse(`${local}:00Z`);
  if (Number.isNaN(naive)) return null;
  let ts = naive - zoneOffset(naive);
  ts = naive - zoneOffset(ts); // reajusta perto de troca de horário de verão
  return new Date(ts).toISOString();
}
