import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/session-user";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.moneyAccount.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: { name?: string; openingBalance?: number; isActive?: boolean } =
    {};
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.openingBalance != null) {
    const openingBalance = Number(body.openingBalance);
    if (!Number.isFinite(openingBalance)) {
      return NextResponse.json({ error: "Invalid balance" }, { status: 400 });
    }
    data.openingBalance = openingBalance;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  try {
    const account = await prisma.moneyAccount.update({
      where: { id },
      data,
    });
    return NextResponse.json(account);
  } catch {
    return NextResponse.json(
      { error: "An account with that name already exists" },
      { status: 400 }
    );
  }
}
