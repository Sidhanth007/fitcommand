-- CreateEnum
CREATE TYPE "SkipReason" AS ENUM ('TIRED', 'BUSY', 'SICK', 'TRAVEL', 'NO_MOTIVATION', 'INJURY', 'OTHER');

-- CreateTable
CREATE TABLE "WorkoutSkip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "planWorkoutId" TEXT,
    "reason" "SkipReason" NOT NULL DEFAULT 'OTHER',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutSkip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutSkip_userId_date_idx" ON "WorkoutSkip"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSkip_userId_date_key" ON "WorkoutSkip"("userId", "date");

-- AddForeignKey
ALTER TABLE "WorkoutSkip" ADD CONSTRAINT "WorkoutSkip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
