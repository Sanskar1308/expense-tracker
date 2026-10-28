import { NextResponse } from "next/server";
import { InvestmentKind } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/session-user";

const KINDS = new Set<string>(Object.values(InvestmentKind));

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.investment.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    name?: string;
    kind?: InvestmentKind;
    currentValue?: number;
    grams?: number | null;
  } = {};
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.kind != null) {
    const kind = String(body.kind);
    if (!KINDS.has(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    data.kind = kind as InvestmentKind;
  }
  if (body.currentValue != null) {
    const currentValue = Number(body.currentValue);
    if (!Number.isFinite(currentValue) || currentValue < 0) {
      return NextResponse.json({ error: "Invalid current value" }, { status: 400 });
    }
    data.currentValue = currentValue;
  }
  if (body.grams !== undefined) {
    if (body.grams === null || body.grams === "") {
      data.grams = null;
    } else {
      const grams = Number(body.grams);
      if (!Number.isFinite(grams) || grams < 0) {
        return NextResponse.json({ error: "Invalid grams" }, { status: 400 });
      }
      data.grams = grams;
    }
  }

  const row = await prisma.investment.update({ where: { id }, data });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.investment.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.recurringRule.deleteMany({
      where: { investmentId: id, userId: user.id },
    });
    await tx.investment.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
