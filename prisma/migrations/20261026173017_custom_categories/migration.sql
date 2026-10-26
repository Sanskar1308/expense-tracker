-- Convert category enums to text (preserve existing values)
DROP INDEX IF EXISTS "Budget_userId_category_month_key";

ALTER TABLE "Expense" ALTER COLUMN "category" TYPE TEXT USING ("category"::text);
ALTER TABLE "Budget" ALTER COLUMN "category" TYPE TEXT USING ("category"::text);

DROP TYPE "CategoryType";

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

CREATE UNIQUE INDEX "Budget_userId_category_month_key" ON "Budget"("userId", "category", "month");

ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
