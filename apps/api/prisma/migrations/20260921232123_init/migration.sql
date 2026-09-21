-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OFFICIAL', 'VERIFIED', 'SECONDARY', 'UNVERIFIED', 'OUTDATED');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'VALIDATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ObjectiveType" AS ENUM ('RESUME_SCOLARITE', 'REMISE_A_NIVEAU', 'PREPARER_EXAMEN', 'RENFORCER_MATIERE', 'ATTEINDRE_NIVEAU', 'APPRENDRE_DEPUIS_BASES');

-- CreateEnum
CREATE TYPE "CompetenceStatus" AS ENUM ('NOT_ASSESSED', 'WEAK', 'LEARNING', 'DEVELOPING', 'MASTERED', 'REQUIRES_REVIEW');

-- CreateEnum
CREATE TYPE "DiagnosticSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "IngestionJobStatus" AS ENUM ('DISCOVERED', 'DOWNLOADED', 'EXTRACTED', 'ANALYZED', 'STRUCTURED', 'PENDING_REVIEW', 'VALIDATED', 'REJECTED');

-- CreateTable
CREATE TABLE "country" (
    "id" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "languages" TEXT[],

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_system" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "education_system_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source" (
    "id" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "organisme" TEXT NOT NULL,
    "url" TEXT,
    "referenceDocument" TEXT,
    "recupereLe" TIMESTAMP(3),

    CONSTRAINT "source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_program" (
    "id" TEXT NOT NULL,
    "educationSystemId" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competence" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "objectives" TEXT[],

    CONSTRAINT "competence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prerequisite" (
    "id" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "requiresCompetenceId" TEXT NOT NULL,

    CONSTRAINT "prerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "userId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "langue" TEXT NOT NULL,
    "ageRange" TEXT,
    "niveauDeclareId" TEXT,
    "objectifLibre" TEXT,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "user_objective" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ObjectiveType" NOT NULL,
    "matiereId" TEXT,
    "niveauCibleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subject_level" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "niveauDeclareId" TEXT NOT NULL,
    "niveauEstimeId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_subject_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_competence_status" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "status" "CompetenceStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "scorePct" INTEGER,
    "lastEvaluatedAt" TIMESTAMP(3),
    "consecutiveReviews" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_competence_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "niveauId" TEXT NOT NULL,
    "status" "DiagnosticSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "diagnostic_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_question" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "ordrePresentation" INTEGER NOT NULL,
    "choix" JSONB,

    CONSTRAINT "diagnostic_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_answer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "reponseUtilisateur" JSONB NOT NULL,
    "estCorrecte" BOOLEAN NOT NULL,
    "tempsReponseMs" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_ingestion_job" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "IngestionJobStatus" NOT NULL DEFAULT 'DISCOVERED',
    "rawDocumentUrl" TEXT,
    "extractedPayload" JSONB,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_ingestion_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_isoCode_key" ON "country"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_program_educationSystemId_schoolYear_versionLabe_key" ON "curriculum_program"("educationSystemId", "schoolYear", "versionLabel");

-- CreateIndex
CREATE UNIQUE INDEX "level_programId_code_key" ON "level"("programId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "subject_levelId_code_key" ON "subject"("levelId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "competence_domainId_code_key" ON "competence"("domainId", "code");

-- CreateIndex
CREATE INDEX "prerequisite_requiresCompetenceId_idx" ON "prerequisite"("requiresCompetenceId");

-- CreateIndex
CREATE UNIQUE INDEX "prerequisite_competenceId_requiresCompetenceId_key" ON "prerequisite"("competenceId", "requiresCompetenceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_subject_level_userId_matiereId_key" ON "user_subject_level"("userId", "matiereId");

-- CreateIndex
CREATE INDEX "user_competence_status_userId_status_idx" ON "user_competence_status"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_competence_status_userId_competenceId_key" ON "user_competence_status"("userId", "competenceId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_answer_questionId_key" ON "diagnostic_answer"("questionId");

-- AddForeignKey
ALTER TABLE "education_system" ADD CONSTRAINT "education_system_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_program" ADD CONSTRAINT "curriculum_program_educationSystemId_fkey" FOREIGN KEY ("educationSystemId") REFERENCES "education_system"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_program" ADD CONSTRAINT "curriculum_program_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level" ADD CONSTRAINT "level_programId_fkey" FOREIGN KEY ("programId") REFERENCES "curriculum_program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain" ADD CONSTRAINT "domain_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competence" ADD CONSTRAINT "competence_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prerequisite" ADD CONSTRAINT "prerequisite_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prerequisite" ADD CONSTRAINT "prerequisite_requiresCompetenceId_fkey" FOREIGN KEY ("requiresCompetenceId") REFERENCES "competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_niveauDeclareId_fkey" FOREIGN KEY ("niveauDeclareId") REFERENCES "level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_objective" ADD CONSTRAINT "user_objective_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_objective" ADD CONSTRAINT "user_objective_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_objective" ADD CONSTRAINT "user_objective_niveauCibleId_fkey" FOREIGN KEY ("niveauCibleId") REFERENCES "level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subject_level" ADD CONSTRAINT "user_subject_level_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subject_level" ADD CONSTRAINT "user_subject_level_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subject_level" ADD CONSTRAINT "user_subject_level_niveauDeclareId_fkey" FOREIGN KEY ("niveauDeclareId") REFERENCES "level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subject_level" ADD CONSTRAINT "user_subject_level_niveauEstimeId_fkey" FOREIGN KEY ("niveauEstimeId") REFERENCES "level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_competence_status" ADD CONSTRAINT "user_competence_status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_competence_status" ADD CONSTRAINT "user_competence_status_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_session" ADD CONSTRAINT "diagnostic_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_session" ADD CONSTRAINT "diagnostic_session_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_session" ADD CONSTRAINT "diagnostic_session_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES "level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_question" ADD CONSTRAINT "diagnostic_question_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "diagnostic_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_question" ADD CONSTRAINT "diagnostic_question_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "competence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_answer" ADD CONSTRAINT "diagnostic_answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "diagnostic_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_ingestion_job" ADD CONSTRAINT "curriculum_ingestion_job_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
