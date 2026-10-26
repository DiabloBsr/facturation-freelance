-- CreateTable
CREATE TABLE "public"."Company" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "legalName" TEXT NOT NULL DEFAULT 'Mon entreprise',
    "tradeName" TEXT,
    "legalForm" TEXT,
    "activity" TEXT,
    "slogan" TEXT,
    "logoData" TEXT,
    "stampData" TEXT,
    "signatureData" TEXT,
    "signatureName" TEXT,
    "signatureRole" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Madagascar',
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "website" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'MGA',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'MGA',
    "vatRegime" TEXT NOT NULL DEFAULT 'EXEMPT',
    "defaultVatRate" INTEGER NOT NULL DEFAULT 0,
    "vatExemptionText" TEXT,
    "withholdingLabel" TEXT,
    "withholdingRate" INTEGER NOT NULL DEFAULT 0,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "latePenaltyRate" INTEGER NOT NULL DEFAULT 0,
    "recoveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountText" TEXT,
    "defaultTemplate" TEXT NOT NULL DEFAULT 'classique',
    "accentColor" TEXT NOT NULL DEFAULT '#1F4D7A',
    "defaultTerms" TEXT,
    "defaultFooter" TEXT,
    "showAmountInWords" BOOLEAN NOT NULL DEFAULT true,
    "showStampOnPdf" BOOLEAN NOT NULL DEFAULT true,
    "showSignatureOnPdf" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegalIdentifier" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "showOnPdf" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BankAccount" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'BANK',
    "label" TEXT NOT NULL,
    "holder" TEXT,
    "bankName" TEXT,
    "branchName" TEXT,
    "bankCode" TEXT,
    "branchCode" TEXT,
    "accountNumber" TEXT,
    "ribKey" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "provider" TEXT,
    "phoneNumber" TEXT,
    "accountRef" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "showOnPdf" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Currency" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "symbolAfter" BOOLEAN NOT NULL DEFAULT true,
    "rateToBase" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "public"."VatRate" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VatRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NumberSequence" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pattern" TEXT NOT NULL DEFAULT '{PREFIX}-{YYYY}-{SEQ}',
    "prefix" TEXT NOT NULL DEFAULT 'FAC',
    "padding" INTEGER NOT NULL DEFAULT 4,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "resetPolicy" TEXT NOT NULL DEFAULT 'YEARLY',
    "lastPeriod" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."Party" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CLIENT',
    "type" TEXT NOT NULL DEFAULT 'COMPANY',
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "legalForm" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Madagascar',
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "vatRate" INTEGER,
    "paymentTermsDays" INTEGER,
    "commissionRate" INTEGER NOT NULL DEFAULT 0,
    "withholdingRate" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PartyIdentifier" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "showOnPdf" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PartyIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mission" (
    "id" TEXT NOT NULL,
    "reference" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "clientId" TEXT NOT NULL,
    "agencyId" TEXT,
    "billTo" TEXT NOT NULL DEFAULT 'CLIENT',
    "rateType" TEXT NOT NULL DEFAULT 'DAILY',
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "vatRate" INTEGER,
    "budget" DOUBLE PRECISION,
    "purchaseOrder" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "color" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimeEntry" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "unit" TEXT NOT NULL DEFAULT 'DAY',
    "label" TEXT,
    "description" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "rate" DOUBLE PRECISION,
    "documentId" TEXT,
    "documentLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "billToId" TEXT NOT NULL,
    "endClientId" TEXT,
    "contactId" TEXT,
    "missionId" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "serviceDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "refusedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "vatMode" TEXT NOT NULL DEFAULT 'EXCLUSIVE',
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "discountType" TEXT NOT NULL DEFAULT 'NONE',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "withholdingLabel" TEXT,
    "withholdingRate" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithheld" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeposits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchaseOrder" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "footer" TEXT,
    "internalNotes" TEXT,
    "template" TEXT NOT NULL DEFAULT 'classique',
    "accentColor" TEXT,
    "showAmountInWords" BOOLEAN NOT NULL DEFAULT true,
    "bankAccountId" TEXT,
    "parentId" TEXT,
    "recurrenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentLine" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL DEFAULT 'SERVICE',
    "label" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "unit" TEXT NOT NULL DEFAULT 'unité',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountType" TEXT NOT NULL DEFAULT 'NONE',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatRate" INTEGER NOT NULL DEFAULT 0,
    "net" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gross" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "rateToBase" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "method" TEXT NOT NULL DEFAULT 'TRANSFER',
    "reference" TEXT,
    "notes" TEXT,
    "bankAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reminder" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "plannedFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "subject" TEXT,
    "body" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payout" (
    "id" TEXT NOT NULL,
    "number" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "beneficiaryId" TEXT NOT NULL,
    "documentId" TEXT,
    "sourceCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "targetCurrency" TEXT NOT NULL DEFAULT 'MGA',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "bankFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSource" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalConverted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAdjustments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PayoutLine" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "unit" TEXT NOT NULL DEFAULT 'heure',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PayoutLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PayoutAdjustment" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PayoutAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Recurrence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "interval" INTEGER NOT NULL DEFAULT 1,
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "occurrencesLimit" INTEGER,
    "occurrencesDone" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedAt" TIMESTAMP(3),
    "sourceDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NumberSequence_key_key" ON "public"."NumberSequence"("key");

-- CreateIndex
CREATE INDEX "Party_kind_isActive_idx" ON "public"."Party"("kind", "isActive");

-- CreateIndex
CREATE INDEX "PartyIdentifier_partyId_idx" ON "public"."PartyIdentifier"("partyId");

-- CreateIndex
CREATE INDEX "Contact_partyId_idx" ON "public"."Contact"("partyId");

-- CreateIndex
CREATE INDEX "Mission_clientId_idx" ON "public"."Mission"("clientId");

-- CreateIndex
CREATE INDEX "Mission_status_idx" ON "public"."Mission"("status");

-- CreateIndex
CREATE INDEX "TimeEntry_missionId_date_idx" ON "public"."TimeEntry"("missionId", "date");

-- CreateIndex
CREATE INDEX "TimeEntry_documentId_idx" ON "public"."TimeEntry"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_number_key" ON "public"."Document"("number");

-- CreateIndex
CREATE INDEX "Document_type_status_idx" ON "public"."Document"("type", "status");

-- CreateIndex
CREATE INDEX "Document_billToId_idx" ON "public"."Document"("billToId");

-- CreateIndex
CREATE INDEX "Document_issueDate_idx" ON "public"."Document"("issueDate");

-- CreateIndex
CREATE INDEX "DocumentLine_documentId_idx" ON "public"."DocumentLine"("documentId");

-- CreateIndex
CREATE INDEX "Payment_documentId_idx" ON "public"."Payment"("documentId");

-- CreateIndex
CREATE INDEX "Payment_date_idx" ON "public"."Payment"("date");

-- CreateIndex
CREATE INDEX "Reminder_documentId_idx" ON "public"."Reminder"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_number_key" ON "public"."Payout"("number");

-- CreateIndex
CREATE INDEX "Payout_beneficiaryId_idx" ON "public"."Payout"("beneficiaryId");

-- CreateIndex
CREATE INDEX "Payout_date_idx" ON "public"."Payout"("date");

-- CreateIndex
CREATE INDEX "PayoutLine_payoutId_idx" ON "public"."PayoutLine"("payoutId");

-- CreateIndex
CREATE INDEX "PayoutAdjustment_payoutId_idx" ON "public"."PayoutAdjustment"("payoutId");

-- CreateIndex
CREATE INDEX "Recurrence_active_nextRunDate_idx" ON "public"."Recurrence"("active", "nextRunDate");

-- AddForeignKey
ALTER TABLE "public"."PartyIdentifier" ADD CONSTRAINT "PartyIdentifier_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "public"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "public"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mission" ADD CONSTRAINT "Mission_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "public"."Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeEntry" ADD CONSTRAINT "TimeEntry_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeEntry" ADD CONSTRAINT "TimeEntry_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeEntry" ADD CONSTRAINT "TimeEntry_documentLineId_fkey" FOREIGN KEY ("documentLineId") REFERENCES "public"."DocumentLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_billToId_fkey" FOREIGN KEY ("billToId") REFERENCES "public"."Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_endClientId_fkey" FOREIGN KEY ("endClientId") REFERENCES "public"."Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "public"."Recurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentLine" ADD CONSTRAINT "DocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "public"."Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayoutLine" ADD CONSTRAINT "PayoutLine_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "public"."Payout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayoutAdjustment" ADD CONSTRAINT "PayoutAdjustment_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "public"."Payout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recurrence" ADD CONSTRAINT "Recurrence_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
