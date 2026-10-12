-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "wonValue" DECIMAL(14,2),
ADD COLUMN     "wonValueSetAt" TIMESTAMP(3),
ADD COLUMN     "wonValueSetById" TEXT;
