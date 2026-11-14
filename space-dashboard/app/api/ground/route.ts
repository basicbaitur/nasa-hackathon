import { NextResponse, connection } from "next/server";
import { groundSnapshot } from "../../../lib/store";


export async function GET(req: Request) {
  await connection();
  const crewId = new URL(req.url).searchParams.get("crewId") ?? undefined;
  return NextResponse.json(groundSnapshot(crewId));
}
