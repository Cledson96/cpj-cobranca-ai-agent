-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "flowType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputPayload" JSONB NOT NULL,
    "outputPayload" JSONB,
    "errorMessage" TEXT,
    "durationMs" INTEGER NOT NULL,
    "requestHash" TEXT NOT NULL,
    "promptTemplateId" TEXT,
    "promptTemplateVersion" INTEGER,
    "modelRequested" TEXT NOT NULL,
    "modelUsed" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'openrouter',
    "generationId" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "reasoningTokens" INTEGER,
    "cachedTokens" INTEGER,
    "costUsd" DECIMAL,
    CONSTRAINT "Execution_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "PromptTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "systemTemplate" TEXT NOT NULL,
    "userTemplate" TEXT NOT NULL,
    "responseSchemaName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FlowModelSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowType" TEXT NOT NULL,
    "primaryModel" TEXT NOT NULL,
    "fallbackModels" JSONB NOT NULL,
    "temperature" DECIMAL NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "responseFormatMode" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OpenRouterModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contextLength" INTEGER,
    "promptPrice" DECIMAL,
    "completionPrice" DECIMAL,
    "requestPrice" DECIMAL,
    "supportedParameters" JSONB NOT NULL,
    "rawMetadata" JSONB NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UsageDailyAggregate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "day" DATETIME NOT NULL,
    "flowType" TEXT,
    "modelUsed" TEXT,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Execution_createdAt_idx" ON "Execution"("createdAt");

-- CreateIndex
CREATE INDEX "Execution_flowType_status_idx" ON "Execution"("flowType", "status");

-- CreateIndex
CREATE INDEX "Execution_requestHash_idx" ON "Execution"("requestHash");

-- CreateIndex
CREATE INDEX "PromptTemplate_flowType_isActive_idx" ON "PromptTemplate"("flowType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_flowType_version_key" ON "PromptTemplate"("flowType", "version");

-- CreateIndex
CREATE UNIQUE INDEX "FlowModelSetting_flowType_key" ON "FlowModelSetting"("flowType");

-- CreateIndex
CREATE UNIQUE INDEX "UsageDailyAggregate_day_flowType_modelUsed_key" ON "UsageDailyAggregate"("day", "flowType", "modelUsed");
