import { NextResponse } from "next/server";
import { RH_USERS } from "@/lib/rh-users";

export async function GET() {
  return NextResponse.json(RH_USERS);
}
