import type { HTMLAttributes } from "react";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import { cn } from "@/lib/cn";

// Mesma lista de CODE_LANGUAGES do backend (`html` é a gramática `xml` no highlight.js).
const LANGUAGES = { bash, c, cpp, csharp, css, java, javascript, json, php, python, sql, typescript, xml };
for (const [name, grammar] of Object.entries(LANGUAGES)) hljs.registerLanguage(name, grammar);

const ALIASES: Record<string, string> = { html: "xml" };

const LANGUAGE_NAMES: Record<string, string> = {
  php: "PHP",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  typescript: "TypeScript",
  json: "JSON",
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  bash: "Bash",
};

function escapeHtml(code: string) {
  return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** HTML com os tokens coloridos. O highlight.js escapa o código; sem linguagem conhecida, só escapamos. */
function highlight(code: string, language: string | null | undefined) {
  const grammar = language ? (ALIASES[language] ?? language) : null;
  if (!grammar || !hljs.getLanguage(grammar)) return escapeHtml(code);
  return hljs.highlight(code, { language: grammar, ignoreIllegals: true }).value;
}

interface CodeBlockProps extends HTMLAttributes<HTMLSpanElement> {
  code: string;
  language?: string | null;
  size?: "sm" | "md";
}

/**
 * Bloco de código com syntax highlight. Feito de <span>s (display: block) para poder
 * ficar dentro de <p> e de <label> (alternativas) sem quebrar o HTML.
 */
export function CodeBlock({ code, language, size = "md", className, ...props }: CodeBlockProps) {
  // Sem hooks: o componente também é usado em Server Components (página de correção).
  const html = highlight(code, language);
  const name = language ? LANGUAGE_NAMES[language] : undefined;

  return (
    <span
      className={cn(
        "relative block overflow-x-auto rounded-control bg-ink text-on-ink",
        size === "md" ? "px-5 py-4 text-base" : "px-4 py-3 text-sm",
        // espaço para o rótulo da linguagem não cobrir a primeira linha
        name && (size === "md" ? "pt-8" : "pt-7"),
        className,
      )}
      {...props}
    >
      {name ? (
        <span aria-hidden="true" className="absolute top-2 right-3 font-sans text-xs font-medium text-on-ink-muted select-none">
          {name}
        </span>
      ) : null}
      <code
        className="hljs block w-max min-w-full font-mono leading-relaxed whitespace-pre"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </span>
  );
}
