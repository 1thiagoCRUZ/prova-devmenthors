import type { Metadata } from "next";
import { StatusScreen } from "../../../_components/StatusScreen";

export const metadata: Metadata = { title: "Prova enviada" };

/** Tela final: sem nota, sem gabarito, sem dados do aluno. */
export default function ObrigadoPage() {
  return (
    <StatusScreen stamp="Enviada" title="Prova enviada. Obrigado!">
      <p>Suas respostas foram recebidas e não podem mais ser alteradas.</p>
      <p>A correção é feita pelo professor. Você já pode fechar esta página.</p>
    </StatusScreen>
  );
}
