import { NextResponse } from "next/server";
import { forecastFor } from "../../../lib/store";


export async function POST(req: Request) {
  const { extraDoseMSv = 0, crewId } = await req.json().catch(() => ({}));
  return NextResponse.json({ extraDoseMSv: Number(extraDoseMSv) || 0, series: forecastFor(Number(extraDoseMSv) || 0, crewId) });
}
