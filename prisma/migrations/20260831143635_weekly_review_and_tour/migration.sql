-- AlterTable
ALTER TABLE "MotivationSetting" ADD COLUMN     "lastWeeklyKey" TEXT,
ADD COLUMN     "weeklyReview" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "tourDoneAt" TIMESTAMP(3);
