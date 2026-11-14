import { connection } from "next/server";
import { crewSnapshot } from "../../../lib/store";


export async function GET(req: Request) {
  await connection();
  const enc = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(ctrl) {
      const send = () => {
        try {
          ctrl.enqueue(enc.encode(`data: ${JSON.stringify(crewSnapshot())}\n\n`));
        } catch {
          clearInterval(timer);
        }
      };
      send();
      timer = setInterval(send, 1000);
      req.signal.addEventListener("abort", () => {
        clearInterval(timer);
        try { ctrl.close(); } catch {}
      });
    },
    cancel() {
      clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
