-- CreateTable
CREATE TABLE "expense_payers" (
    "id" TEXT NOT NULL,
    "expense_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "expense_payers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_payers_expense_id_user_id_key" ON "expense_payers"("expense_id", "user_id");

-- AddForeignKey
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: cada gasto existente tenía un único pagador (paid_by) por el
-- total del gasto — se traduce a una fila de expense_payers por ese monto,
-- para no perder los gastos ya cargados.
INSERT INTO "expense_payers" ("id", "expense_id", "user_id", "amount")
SELECT gen_random_uuid()::text, "id", "paid_by", "amount" FROM "expenses";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_paid_by_fkey";

-- AlterTable
ALTER TABLE "expenses" DROP COLUMN "paid_by";
