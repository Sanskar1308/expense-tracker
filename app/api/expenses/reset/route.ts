import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient, CategoryType } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { startDate, endDate, category } = await req.json();

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const where: any = { userId: user.id };

  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  if (category) {
    where.category = category as CategoryType;
  }

  const deleted = await prisma.expense.deleteMany({ where });

  return NextResponse.json({
    message: "Expenses deleted successfully",
    deletedCount: deleted.count,
  });
}
