import { Fragment } from "react";
import { cn } from "@/lib/cn";
import { CodeBlock } from "./CodeBlock";

/**
 * Enunciados e alternativas vêm da API em um Markdown mínimo:
 *   `código inline`,  blocos cercados  ```php … ```  e tabelas  | a | b |  (com linha | --- |)
 * Só isso é interpretado; todo o resto é texto puro (nada de HTML cru → sem XSS).
 * Tudo é <span>, para caber em <p> e <label>.
 */

type Block =
  | { kind: "text"; text: string }
  | { kind: "code"; language: string | null; code: string }
  | { kind: "table"; header: string[]; rows: string[][] };

const FENCE = /```([\w+#-]*)[ \t]*\r?\n([\s\S]*?)\r?\n?```/g;
const INLINE = /`([^`\n]+)`/g;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/;

function splitRow(line: string) {
  return line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
}

/** Separa tabelas (cabeçalho + linha de traços + linhas) do texto corrido. */
function splitTables(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const joined = buffer.join("\n").replace(/^\n+|\n+$/g, "");
    if (joined) blocks.push({ kind: "text", text: joined });
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    if (TABLE_ROW.test(lines[i]) && TABLE_SEPARATOR.test(lines[i + 1] ?? "")) {
      flush();
      const header = splitRow(lines[i]);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && TABLE_ROW.test(lines[i])) rows.push(splitRow(lines[i++]));
      i--;
      blocks.push({ kind: "table", header, rows });
    } else {
      buffer.push(lines[i]);
    }
  }
  flush();
  return blocks;
}

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let last = 0;
  for (const match of source.matchAll(FENCE)) {
    blocks.push(...splitTables(source.slice(last, match.index)));
    blocks.push({ kind: "code", language: match[1] || null, code: match[2] });
    last = match.index + match[0].length;
  }
  blocks.push(...splitTables(source.slice(last)));
  return blocks;
}

function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE);
  // split com grupo de captura: posições ímpares são o conteúdo entre crases.
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <code
        key={i}
        className="rounded-md border border-line bg-paper-sunken px-1.5 py-0.5 font-mono text-[0.88em] text-ink [overflow-wrap:anywhere]"
      >
        {part}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

const cell = "table-cell border border-line px-3 py-1.5 text-left align-top";

function Table({ header, rows }: { header: string[]; rows: string[][] }) {
  return (
    <span className="block overflow-x-auto">
      <span role="table" className="table min-w-max border-collapse text-base font-normal">
        <span role="rowgroup" className="table-header-group">
          <span role="row" className="table-row">
            {header.map((h, i) => (
              <span key={i} role="columnheader" className={cn(cell, "bg-paper-sunken font-medium")}>
                <Inline text={h} />
              </span>
            ))}
          </span>
        </span>
        <span role="rowgroup" className="table-row-group">
          {rows.map((row, r) => (
            <span key={r} role="row" className="table-row">
              {header.map((_, c) => (
                <span key={c} role="cell" className={cn(cell, "bg-paper-raised")}>
                  <Inline text={row[c] ?? ""} />
                </span>
              ))}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

interface RichTextProps {
  text: string;
  /** Tamanho dos blocos de código. */
  codeSize?: "sm" | "md";
  className?: string;
}

export function RichText({ text, codeSize = "md", className }: RichTextProps) {
  const blocks = parseBlocks(text);
  return (
    <span className={cn("flex min-w-0 flex-col gap-3", className)}>
      {blocks.map((block, i) =>
        block.kind === "code" ? (
          <CodeBlock key={i} code={block.code} language={block.language} size={codeSize} />
        ) : block.kind === "table" ? (
          <Table key={i} header={block.header} rows={block.rows} />
        ) : (
          <span key={i} className="block break-words whitespace-pre-wrap">
            <Inline text={block.text} />
          </span>
        ),
      )}
    </span>
  );
}
