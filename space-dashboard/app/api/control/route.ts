import { NextResponse, connection } from "next/server";
import { setControls, crewSnapshot } from "../../../lib/store";


export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const controls = setControls(body ?? {});
  return NextResponse.json({ controls, snapshot: crewSnapshot() });
}

export async function GET() {
  await connection();
  return NextResponse.json(crewSnapshot());
}
