const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function isExamId(value: string): boolean {
  return new RegExp(`^${UUID_RE.source}$`, "i").test(value);
}
