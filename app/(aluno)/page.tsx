import type { Metadata } from "next";
import { LandingStart } from "./_components/LandingStart";

export const metadata: Metadata = { title: "Entrar na prova" };

export default function InicioPage() {
  return <LandingStart />;
}
