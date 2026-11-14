import { NextResponse } from "next/server";
import { addReply } from "../../../../lib/store";


export async function POST(req: Request) {
  const { crewId, text } = await req.json().catch(() => ({}));
  if (!crewId || !text || typeof text !== "string") return NextResponse.json({ error: "crewId and text required" }, { status: 400 });
  return NextResponse.json(addReply(String(crewId), text));
}
