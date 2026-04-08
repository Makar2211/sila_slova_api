-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMINISTRATOR', 'REVISIONER', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('EN', 'RU', 'UA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "baseRole" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferredLang" "Lang" NOT NULL DEFAULT 'EN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "deactivatedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseRole" "Role" NOT NULL,
    "activeRoleMode" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "app_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edit_candidates" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "sceneId" TEXT,
    "stepId" TEXT,
    "locationKey" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "candidateType" TEXT NOT NULL,
    "originalValue" TEXT NOT NULL,
    "proposedValue" TEXT NOT NULL,
    "languageCode" TEXT,
    "sourceLanguage" TEXT,
    "translatedValues" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "authorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "withdrawnAt" TIMESTAMP(3),
    "publishVersionId" TEXT,

    CONSTRAINT "edit_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_versions" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "publishedBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "defaultLang" TEXT NOT NULL DEFAULT 'ru',
    "supportedLangs" TEXT[],

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "sceneKey" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "firstStepIndex" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "steps" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "textAudience" TEXT NOT NULL,
    "prompt" JSONB NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB,
    "explanation" JSONB,
    "imagePath" TEXT,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "app_sessions_userId_idx" ON "app_sessions"("userId");

-- CreateIndex
CREATE INDEX "edit_candidates_lessonId_status_idx" ON "edit_candidates"("lessonId", "status");

-- CreateIndex
CREATE INDEX "edit_candidates_authorUserId_idx" ON "edit_candidates"("authorUserId");

-- CreateIndex
CREATE INDEX "publish_versions_lessonId_isActive_idx" ON "publish_versions"("lessonId", "isActive");

-- CreateIndex
CREATE INDEX "audit_events_actorUserId_idx" ON "audit_events"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_events_targetType_targetId_idx" ON "audit_events"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "scenes_lessonId_idx" ON "scenes"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "scenes_lessonId_sceneKey_key" ON "scenes"("lessonId", "sceneKey");

-- CreateIndex
CREATE INDEX "steps_lessonId_idx" ON "steps"("lessonId");

-- CreateIndex
CREATE INDEX "steps_sceneId_idx" ON "steps"("sceneId");

-- CreateIndex
CREATE UNIQUE INDEX "steps_lessonId_stepKey_key" ON "steps"("lessonId", "stepKey");

-- AddForeignKey
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_candidates" ADD CONSTRAINT "edit_candidates_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_candidates" ADD CONSTRAINT "edit_candidates_publishVersionId_fkey" FOREIGN KEY ("publishVersionId") REFERENCES "publish_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "steps" ADD CONSTRAINT "steps_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "steps" ADD CONSTRAINT "steps_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
