/**
 * Avisa as outras abas da mesma prova (mesmo navegador) quando alguém
 * inicia ou envia. O cookie da submissão é um só por prova no navegador:
 * se outra aba entra com outro e-mail, o cookie passa a ser o dela, e esta
 * aba precisa parar de salvar para não escrever na submissão errada.
 */

export type ExamChannelMessage = { type: "started" | "submitted"; tabId: string };

export const TAB_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function channelName(examId: string) {
  return `prova:${examId}`;
}

export function broadcastExamEvent(examId: string, type: ExamChannelMessage["type"]) {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(channelName(examId));
  channel.postMessage({ type, tabId: TAB_ID } satisfies ExamChannelMessage);
  channel.close();
}

export function subscribeExamEvents(examId: string, onMessage: (msg: ExamChannelMessage) => void) {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(channelName(examId));
  channel.onmessage = (event: MessageEvent<ExamChannelMessage>) => {
    if (event.data?.tabId !== TAB_ID) onMessage(event.data);
  };
  return () => channel.close();
}
