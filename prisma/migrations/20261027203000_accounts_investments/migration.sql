-- CreateEnum
CREATE TYPE "InvestmentKind" AS ENUM ('MF', 'STOCK', 'FD', 'RD', 'PPF', 'GOLD', 'OTHER');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "accountId" TEXT;

-- AlterTable
ALTER TABLE "RecurringRule" ADD COLUMN "accountId" TEXT,
ADD COLUMN "investmentId" TEXT;

-- AlterTable
ALTER TABLE "PendingPayment" ADD COLUMN "accountId" TEXT,
ADD COLUMN "investmentId" TEXT;

-- AlterTable
ALTER TABLE "SavingsGoal" ADD COLUMN "savedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropIndex
DROP INDEX "SavingsGoal_userId_key";

-- CreateTable
CREATE TABLE "MoneyAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MoneyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "InvestmentKind" NOT NULL,
    "investedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerMove" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT,
    "cardId" TEXT,
    "investmentId" TEXT,
    "pendingId" TEXT,

    CONSTRAINT "LedgerMove_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MoneyAccount_userId_name_key" ON "MoneyAccount"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerMove_pendingId_key" ON "LedgerMove"("pendingId");

-- CreateIndex
CREATE INDEX "LedgerMove_userId_idx" ON "LedgerMove"("userId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyAccount" ADD CONSTRAINT "MoneyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerMove" ADD CONSTRAINT "LedgerMove_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerMove" ADD CONSTRAINT "LedgerMove_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "MoneyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerMove" ADD CONSTRAINT "LedgerMove_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "MoneyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerMove" ADD CONSTRAINT "LedgerMove_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CreditCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerMove" ADD CONSTRAINT "LedgerMove_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerMove" ADD CONSTRAINT "LedgerMove_pendingId_fkey" FOREIGN KEY ("pendingId") REFERENCES "PendingPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
