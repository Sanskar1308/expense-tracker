import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cards = await prisma.creditCard.findMany({
    where: { userId: user.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(cards);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const last4 =
    body.last4 != null && String(body.last4).trim()
      ? String(body.last4).trim().slice(-4)
      : null;

  const card = await prisma.creditCard.create({
    data: {
      name,
      last4,
      userId: user.id,
    },
  });

  return NextResponse.json(card);
}
