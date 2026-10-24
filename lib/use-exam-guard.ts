"use client";

import { useEffect, useState } from "react";

// Copiar, recortar, colar, arrastar texto e menu de contexto ficam bloqueados na prova.
const BLOCKED_EVENTS = ["copy", "cut", "paste", "drop", "dragstart", "contextmenu"] as const;
const BLOCKED_INPUTS = new Set(["insertFromPaste", "insertFromPasteAsQuotation", "insertFromDrop", "insertFromYank"]);

/**
 * Proteções da tela de prova. Navegador nenhum impede captura de tela de verdade
 * (o sistema operacional tira o print antes da página saber), então isto dificulta:
 * a prova some enquanto a janela não está em foco ou a tecla Windows/Cmd está
 * pressionada (Win+Shift+S, Ferramenta de Captura, PrtScn no Windows 11) e a
 * área de transferência é limpa depois do PrtScn. Só olha para Meta e PrintScreen:
 * letras digitadas (inclusive o S) nunca são interceptadas.
 *
 * Devolve `true` enquanto a prova deve ficar oculta.
 */
export function useExamGuard() {
  const [shielded, setShielded] = useState(false);

  useEffect(() => {
    let metaHeld = false;
    const update = () => setShielded(metaHeld || document.visibilityState === "hidden" || !document.hasFocus());

    const block = (e: Event) => e.preventDefault();
    const blockInput = (e: InputEvent) => {
      if (BLOCKED_INPUTS.has(e.inputType)) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Meta" || e.key === "OS") {
        metaHeld = true;
        update();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault(); // imprimir / salvar como PDF
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Meta" || e.key === "OS") {
        metaHeld = false;
        update();
      } else if (e.key === "PrintScreen") {
        navigator.clipboard?.writeText("").catch(() => {});
      }
    };
    const onFocus = () => {
      // Voltando de Win+Shift+S o keyup da tecla Windows nunca chega.
      metaHeld = false;
      update();
    };

    for (const type of BLOCKED_EVENTS) document.addEventListener(type, block, true);
    document.addEventListener("beforeinput", blockInput, true);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", update);
    window.addEventListener("focus", onFocus);
    return () => {
      for (const type of BLOCKED_EVENTS) document.removeEventListener(type, block, true);
      document.removeEventListener("beforeinput", blockInput, true);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", update);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return shielded;
}
