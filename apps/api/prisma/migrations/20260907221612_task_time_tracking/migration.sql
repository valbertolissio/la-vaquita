-- AlterTable
ALTER TABLE "task_completions" ADD COLUMN     "duration_seconds" INTEGER;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "start_date" TIMESTAMP(3),
ADD COLUMN     "time_tracked" BOOLEAN NOT NULL DEFAULT false;
