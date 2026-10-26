import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import {
  DEFAULT_CATEGORIES,
  mergeCategories,
  normalizeCategoryName,
} from "../../../lib/categories";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const custom = await prisma.category.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    categories: mergeCategories(custom),
    defaults: DEFAULT_CATEGORIES,
    custom,
  });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = normalizeCategoryName(String(body.name ?? ""));
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  if (name.length > 40) {
    return NextResponse.json({ error: "Name too long" }, { status: 400 });
  }

  const reserved = DEFAULT_CATEGORIES.some(
    (c) => c.value.toLowerCase() === name.toLowerCase() || c.label.toLowerCase() === name.toLowerCase()
  );
  if (reserved) {
    return NextResponse.json(
      { error: "That category already exists" },
      { status: 400 }
    );
  }

  const existing = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existing) {
    if (!existing.isActive) {
      const reactivated = await prisma.category.update({
        where: { id: existing.id },
        data: { isActive: true, name },
      });
      return NextResponse.json(reactivated);
    }
    return NextResponse.json(
      { error: "That category already exists" },
      { status: 400 }
    );
  }

  const created = await prisma.category.create({
    data: { name, userId: user.id },
  });

  return NextResponse.json(created);
}
