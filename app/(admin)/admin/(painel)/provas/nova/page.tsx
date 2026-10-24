import type { Metadata } from "next";
import { ExamForm } from "../../_components/ExamForm";
import { PageHeader, Panel } from "../../_components/ui";

export const metadata: Metadata = { title: "Nova prova" };

export default function NovaProvaPage() {
  return (
    <>
      <PageHeader back={{ href: "/admin", label: "Provas" }} title="Nova prova" />
      <div className="max-w-2xl">
        <Panel description="A prova nasce como rascunho. Depois você adiciona as questões e publica.">
          <ExamForm />
        </Panel>
      </div>
    </>
  );
}
