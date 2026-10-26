import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/session-user";
import { clampDayOfMonth } from "../../../../lib/dues";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.creditCard.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    name?: string;
    last4?: string | null;
    isActive?: boolean;
    statementDay?: number | null;
    dueDay?: number | null;
  } = {};

  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.last4 !== undefined) {
    data.last4 =
      body.last4 != null && String(body.last4).trim()
        ? String(body.last4).trim().slice(-4)
        : null;
  }
  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }
  if (body.statementDay !== undefined) {
    data.statementDay =
      body.statementDay === null || body.statementDay === ""
        ? null
        : clampDayOfMonth(Number(body.statementDay));
  }
  if (body.dueDay !== undefined) {
    data.dueDay =
      body.dueDay === null || body.dueDay === ""
        ? null
        : clampDayOfMonth(Number(body.dueDay));
  }

  const updated = await prisma.creditCard.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
