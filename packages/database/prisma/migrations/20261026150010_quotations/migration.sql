-- CreateEnum
CREATE TYPE "QuotationKind" AS ENUM ('ESTIMATE', 'BILL');

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "kind" "QuotationKind" NOT NULL,
    "customerId" TEXT NOT NULL,
    "clientName" TEXT,
    "documentDate" DATE,
    "total" DECIMAL(14,2) NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quotation_createdAt_idx" ON "Quotation"("createdAt");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
