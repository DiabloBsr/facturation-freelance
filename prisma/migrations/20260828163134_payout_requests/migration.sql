-- CreateTable
CREATE TABLE "public"."PayoutRequest" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subject" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "reference" TEXT,
    "contactEmail" TEXT,
    "paymentMethod" TEXT,
    "paymentDetails" TEXT,
    "notes" TEXT,
    "payoutId" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PayoutRequestLine" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "unit" TEXT NOT NULL DEFAULT 'heure',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PayoutRequestLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayoutRequest_tokenHash_key" ON "public"."PayoutRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "PayoutRequest_beneficiaryId_idx" ON "public"."PayoutRequest"("beneficiaryId");

-- CreateIndex
CREATE INDEX "PayoutRequest_status_idx" ON "public"."PayoutRequest"("status");

-- CreateIndex
CREATE INDEX "PayoutRequestLine_requestId_idx" ON "public"."PayoutRequestLine"("requestId");

-- AddForeignKey
ALTER TABLE "public"."PayoutRequest" ADD CONSTRAINT "PayoutRequest_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "public"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayoutRequest" ADD CONSTRAINT "PayoutRequest_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "public"."Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayoutRequest" ADD CONSTRAINT "PayoutRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayoutRequestLine" ADD CONSTRAINT "PayoutRequestLine_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."PayoutRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
