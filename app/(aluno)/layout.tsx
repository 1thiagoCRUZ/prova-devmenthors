import { Providers } from "./providers";

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
