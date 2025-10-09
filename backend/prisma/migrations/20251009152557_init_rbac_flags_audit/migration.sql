/*
  Warnings:

  - You are about to drop the column `error` on the `EmailLog` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `EmailLog` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `EmailLog` table. All the data in the column will be lost.
  - You are about to drop the column `to` on the `EmailLog` table. All the data in the column will be lost.
  - You are about to drop the column `topic` on the `ExamResult` table. All the data in the column will be lost.
  - You are about to drop the column `acceptedAt` on the `Invite` table. All the data in the column will be lost.
  - You are about to drop the column `declinedAt` on the `Invite` table. All the data in the column will be lost.
  - You are about to drop the column `resentAt` on the `Invite` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `Invite` table. All the data in the column will be lost.
  - You are about to drop the column `modelYear` on the `MebTopic` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `MebTopic` table. All the data in the column will be lost.
  - You are about to drop the column `officialSubjectName` on the `MebTopic` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `planType` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `targetExam` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `totalSessions` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `performanceMetrics` on the `StudentProfile` table. All the data in the column will be lost.
  - You are about to drop the column `selectedSubjects` on the `StudentProfile` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `StudySession` table. All the data in the column will be lost.
  - You are about to drop the column `dayOfWeek` on the `StudySession` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty` on the `StudySession` table. All the data in the column will be lost.
  - You are about to drop the column `objectives` on the `StudySession` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `StudySession` table. All the data in the column will be lost.
  - You are about to drop the column `resources` on the `StudySession` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `StudySession` table. All the data in the column will be lost.
  - You are about to drop the column `techniques` on the `StudySession` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `StudySession` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `dailyLimit` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `dailyUsage` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `grade` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastActiveAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyLimit` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyUsage` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `resetToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyLimit` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyUsage` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `yksSubjects` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `AICoachDaily` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AIExplanation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AiPromptTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AiRequestLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AiUsageAnalytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Analysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Assessment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CoachNote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CoachStudent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CoachingRecommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Curriculum` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmailTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationPreferenceTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationSnooze` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OutboxEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ParentWeeklyReport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PerformanceAnalysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProactiveRecommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PushDevice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuickChat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReferralCode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReferralUse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefreshToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SosQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentCompliance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentPerformanceHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentWeeklyMetrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudyStreak` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SummaryGenerator` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Topic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TopicPrerequisite` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TopicWeight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserActivity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserFeedback` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserUsageControl` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WeeklyProgressReport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `YksTopic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_alerts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_test_reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_test_suites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `analytics_queries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `badges` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `behavior_insight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `behavior_pattern` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `behavior_prediction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `behavior_recommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `content_template` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `context_aware_recommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dashboards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emotional_insight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emotional_state` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `entity_schemas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `interactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `log_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `motivational_content` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `parents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `personalized_recommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `social_interaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_journal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `students` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `text_analysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wellness_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `widgets` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[grade,subject,topic]` on the table `MebTopic` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'PARENT', 'TEACHER', 'ADMIN');

-- DropForeignKey
ALTER TABLE "AICoachDaily" DROP CONSTRAINT "AICoachDaily_studentId_fkey";

-- DropForeignKey
ALTER TABLE "AIExplanation" DROP CONSTRAINT "AIExplanation_userId_fkey";

-- DropForeignKey
ALTER TABLE "AiRequestLog" DROP CONSTRAINT "AiRequestLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "AiUsageAnalytics" DROP CONSTRAINT "AiUsageAnalytics_userId_fkey";

-- DropForeignKey
ALTER TABLE "Analysis" DROP CONSTRAINT "Analysis_userId_fkey";

-- DropForeignKey
ALTER TABLE "Assessment" DROP CONSTRAINT "Assessment_userId_fkey";

-- DropForeignKey
ALTER TABLE "CoachNote" DROP CONSTRAINT "CoachNote_coachStudentId_fkey";

-- DropForeignKey
ALTER TABLE "CoachStudent" DROP CONSTRAINT "CoachStudent_coachId_fkey";

-- DropForeignKey
ALTER TABLE "CoachStudent" DROP CONSTRAINT "CoachStudent_studentId_fkey";

-- DropForeignKey
ALTER TABLE "CoachingRecommendation" DROP CONSTRAINT "CoachingRecommendation_userId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_userId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationSettings" DROP CONSTRAINT "NotificationSettings_userId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationSnooze" DROP CONSTRAINT "NotificationSnooze_userId_fkey";

-- DropForeignKey
ALTER TABLE "OutboxEvent" DROP CONSTRAINT "OutboxEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "ParentWeeklyReport" DROP CONSTRAINT "ParentWeeklyReport_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ParentWeeklyReport" DROP CONSTRAINT "ParentWeeklyReport_studentId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceAnalysis" DROP CONSTRAINT "PerformanceAnalysis_userId_fkey";

-- DropForeignKey
ALTER TABLE "ProactiveRecommendation" DROP CONSTRAINT "ProactiveRecommendation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Progress" DROP CONSTRAINT "Progress_userId_fkey";

-- DropForeignKey
ALTER TABLE "PushDevice" DROP CONSTRAINT "PushDevice_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuickChat" DROP CONSTRAINT "QuickChat_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuizResult" DROP CONSTRAINT "QuizResult_userId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralCode" DROP CONSTRAINT "ReferralCode_referrerId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralUse" DROP CONSTRAINT "ReferralUse_referralCodeId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralUse" DROP CONSTRAINT "ReferralUse_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "SosQuestion" DROP CONSTRAINT "SosQuestion_userId_fkey";

-- DropForeignKey
ALTER TABLE "StudentCompliance" DROP CONSTRAINT "StudentCompliance_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentPerformanceHistory" DROP CONSTRAINT "StudentPerformanceHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "StudentWeeklyMetrics" DROP CONSTRAINT "StudentWeeklyMetrics_userId_fkey";

-- DropForeignKey
ALTER TABLE "StudyStreak" DROP CONSTRAINT "StudyStreak_userId_fkey";

-- DropForeignKey
ALTER TABLE "SummaryGenerator" DROP CONSTRAINT "SummaryGenerator_userId_fkey";

-- DropForeignKey
ALTER TABLE "TopicPrerequisite" DROP CONSTRAINT "TopicPrerequisite_prerequisiteId_fkey";

-- DropForeignKey
ALTER TABLE "TopicPrerequisite" DROP CONSTRAINT "TopicPrerequisite_topicId_fkey";

-- DropForeignKey
ALTER TABLE "TopicWeight" DROP CONSTRAINT "TopicWeight_mebTopicId_fkey";

-- DropForeignKey
ALTER TABLE "UserActivity" DROP CONSTRAINT "UserActivity_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserFeedback" DROP CONSTRAINT "UserFeedback_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserUsageControl" DROP CONSTRAINT "UserUsageControl_userId_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyProgressReport" DROP CONSTRAINT "WeeklyProgressReport_userId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_queries" DROP CONSTRAINT "analytics_queries_userId_fkey";

-- DropForeignKey
ALTER TABLE "behavior_insight" DROP CONSTRAINT "behavior_insight_userId_fkey";

-- DropForeignKey
ALTER TABLE "behavior_pattern" DROP CONSTRAINT "behavior_pattern_userId_fkey";

-- DropForeignKey
ALTER TABLE "behavior_prediction" DROP CONSTRAINT "behavior_prediction_userId_fkey";

-- DropForeignKey
ALTER TABLE "behavior_recommendation" DROP CONSTRAINT "behavior_recommendation_userId_fkey";

-- DropForeignKey
ALTER TABLE "context_aware_recommendation" DROP CONSTRAINT "context_aware_recommendation_userId_fkey";

-- DropForeignKey
ALTER TABLE "dashboards" DROP CONSTRAINT "dashboards_userId_fkey";

-- DropForeignKey
ALTER TABLE "emotional_insight" DROP CONSTRAINT "emotional_insight_userId_fkey";

-- DropForeignKey
ALTER TABLE "emotional_state" DROP CONSTRAINT "emotional_state_userId_fkey";

-- DropForeignKey
ALTER TABLE "interactions" DROP CONSTRAINT "interactions_userId_fkey";

-- DropForeignKey
ALTER TABLE "motivational_content" DROP CONSTRAINT "motivational_content_userId_fkey";

-- DropForeignKey
ALTER TABLE "parents" DROP CONSTRAINT "parents_userId_fkey";

-- DropForeignKey
ALTER TABLE "personalized_recommendation" DROP CONSTRAINT "personalized_recommendation_userId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_roleId_fkey";

-- DropForeignKey
ALTER TABLE "social_interaction" DROP CONSTRAINT "social_interaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "student_journal" DROP CONSTRAINT "student_journal_userId_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_userId_fkey";

-- DropForeignKey
ALTER TABLE "text_analysis" DROP CONSTRAINT "text_analysis_userId_fkey";

-- DropForeignKey
ALTER TABLE "usage" DROP CONSTRAINT "usage_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_roleId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_userId_fkey";

-- DropForeignKey
ALTER TABLE "wellness_data" DROP CONSTRAINT "wellness_data_userId_fkey";

-- DropForeignKey
ALTER TABLE "widgets" DROP CONSTRAINT "widgets_dashboardId_fkey";

-- DropIndex
DROP INDEX "EmailLog_success_idx";

-- DropIndex
DROP INDEX "EmailLog_to_idx";

-- DropIndex
DROP INDEX "ExamResult_userId_examType_createdAt_idx";

-- DropIndex
DROP INDEX "MebTopic_grade_subject_topic_modelYear_key";

-- DropIndex
DROP INDEX "Notification_isRead_idx";

-- DropIndex
DROP INDEX "Notification_type_idx";

-- DropIndex
DROP INDEX "Notification_userId_createdAt_idx";

-- DropIndex
DROP INDEX "Notification_userId_isRead_idx";

-- DropIndex
DROP INDEX "Notification_userId_type_idx";

-- DropIndex
DROP INDEX "Plan_goals_idx";

-- DropIndex
DROP INDEX "Plan_isActive_endDate_idx";

-- DropIndex
DROP INDEX "Plan_startDate_endDate_idx";

-- DropIndex
DROP INDEX "Plan_subjects_idx";

-- DropIndex
DROP INDEX "Plan_type_isActive_idx";

-- DropIndex
DROP INDEX "StudySession_performance_idx";

-- DropIndex
DROP INDEX "StudySession_planId_startTime_idx";

-- DropIndex
DROP INDEX "StudySession_startTime_endTime_idx";

-- DropIndex
DROP INDEX "StudySession_subject_performance_idx";

-- DropIndex
DROP INDEX "StudySession_subject_topic_idx";

-- DropIndex
DROP INDEX "StudySession_userId_isCompleted_performance_idx";

-- DropIndex
DROP INDEX "StudySession_userId_isCompleted_startTime_idx";

-- DropIndex
DROP INDEX "StudySession_userId_subject_startTime_idx";

-- DropIndex
DROP INDEX "User_createdAt_idx";

-- DropIndex
DROP INDEX "User_email_idx";

-- DropIndex
DROP INDEX "User_lastActiveAt_idx";

-- DropIndex
DROP INDEX "User_subscriptionStatus_idx";

-- DropIndex
DROP INDEX "User_updatedAt_idx";

-- AlterTable
ALTER TABLE "EmailLog" DROP COLUMN "error",
DROP COLUMN "messageId",
DROP COLUMN "subject",
DROP COLUMN "to",
ALTER COLUMN "success" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ExamResult" DROP COLUMN "topic";

-- AlterTable
ALTER TABLE "Invite" DROP COLUMN "acceptedAt",
DROP COLUMN "declinedAt",
DROP COLUMN "resentAt",
DROP COLUMN "role";

-- AlterTable
ALTER TABLE "MebTopic" DROP COLUMN "modelYear",
DROP COLUMN "month",
DROP COLUMN "officialSubjectName";

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "duration",
DROP COLUMN "planType",
DROP COLUMN "status",
DROP COLUMN "targetExam",
DROP COLUMN "totalSessions";

-- AlterTable
ALTER TABLE "StudentProfile" DROP COLUMN "performanceMetrics",
DROP COLUMN "selectedSubjects";

-- AlterTable
ALTER TABLE "StudySession" DROP COLUMN "completedAt",
DROP COLUMN "dayOfWeek",
DROP COLUMN "difficulty",
DROP COLUMN "objectives",
DROP COLUMN "order",
DROP COLUMN "resources",
DROP COLUMN "status",
DROP COLUMN "techniques",
DROP COLUMN "type";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "amount";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "dailyLimit",
DROP COLUMN "dailyUsage",
DROP COLUMN "grade",
DROP COLUMN "lastActiveAt",
DROP COLUMN "monthlyLimit",
DROP COLUMN "monthlyUsage",
DROP COLUMN "refreshToken",
DROP COLUMN "resetToken",
DROP COLUMN "weeklyLimit",
DROP COLUMN "weeklyUsage",
DROP COLUMN "yksSubjects",
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STUDENT';

-- DropTable
DROP TABLE "AICoachDaily";

-- DropTable
DROP TABLE "AIExplanation";

-- DropTable
DROP TABLE "AiPromptTemplate";

-- DropTable
DROP TABLE "AiRequestLog";

-- DropTable
DROP TABLE "AiUsageAnalytics";

-- DropTable
DROP TABLE "Analysis";

-- DropTable
DROP TABLE "Assessment";

-- DropTable
DROP TABLE "CoachNote";

-- DropTable
DROP TABLE "CoachStudent";

-- DropTable
DROP TABLE "CoachingRecommendation";

-- DropTable
DROP TABLE "Curriculum";

-- DropTable
DROP TABLE "EmailTemplate";

-- DropTable
DROP TABLE "NotificationPreference";

-- DropTable
DROP TABLE "NotificationPreferenceTemplate";

-- DropTable
DROP TABLE "NotificationSettings";

-- DropTable
DROP TABLE "NotificationSnooze";

-- DropTable
DROP TABLE "OutboxEvent";

-- DropTable
DROP TABLE "ParentWeeklyReport";

-- DropTable
DROP TABLE "PerformanceAnalysis";

-- DropTable
DROP TABLE "ProactiveRecommendation";

-- DropTable
DROP TABLE "Progress";

-- DropTable
DROP TABLE "PushDevice";

-- DropTable
DROP TABLE "QuickChat";

-- DropTable
DROP TABLE "QuizResult";

-- DropTable
DROP TABLE "ReferralCode";

-- DropTable
DROP TABLE "ReferralUse";

-- DropTable
DROP TABLE "RefreshToken";

-- DropTable
DROP TABLE "SosQuestion";

-- DropTable
DROP TABLE "StudentCompliance";

-- DropTable
DROP TABLE "StudentPerformanceHistory";

-- DropTable
DROP TABLE "StudentWeeklyMetrics";

-- DropTable
DROP TABLE "StudyStreak";

-- DropTable
DROP TABLE "SummaryGenerator";

-- DropTable
DROP TABLE "Topic";

-- DropTable
DROP TABLE "TopicPrerequisite";

-- DropTable
DROP TABLE "TopicWeight";

-- DropTable
DROP TABLE "UserActivity";

-- DropTable
DROP TABLE "UserFeedback";

-- DropTable
DROP TABLE "UserUsageControl";

-- DropTable
DROP TABLE "WeeklyProgressReport";

-- DropTable
DROP TABLE "YksTopic";

-- DropTable
DROP TABLE "ai_alerts";

-- DropTable
DROP TABLE "ai_test_reports";

-- DropTable
DROP TABLE "ai_test_suites";

-- DropTable
DROP TABLE "analytics_queries";

-- DropTable
DROP TABLE "audit_logs";

-- DropTable
DROP TABLE "badges";

-- DropTable
DROP TABLE "behavior_insight";

-- DropTable
DROP TABLE "behavior_pattern";

-- DropTable
DROP TABLE "behavior_prediction";

-- DropTable
DROP TABLE "behavior_recommendation";

-- DropTable
DROP TABLE "content_template";

-- DropTable
DROP TABLE "context_aware_recommendation";

-- DropTable
DROP TABLE "courses";

-- DropTable
DROP TABLE "dashboards";

-- DropTable
DROP TABLE "emotional_insight";

-- DropTable
DROP TABLE "emotional_state";

-- DropTable
DROP TABLE "entity_schemas";

-- DropTable
DROP TABLE "interactions";

-- DropTable
DROP TABLE "log_entries";

-- DropTable
DROP TABLE "motivational_content";

-- DropTable
DROP TABLE "parents";

-- DropTable
DROP TABLE "permissions";

-- DropTable
DROP TABLE "personalized_recommendation";

-- DropTable
DROP TABLE "role_permissions";

-- DropTable
DROP TABLE "roles";

-- DropTable
DROP TABLE "social_interaction";

-- DropTable
DROP TABLE "student_journal";

-- DropTable
DROP TABLE "students";

-- DropTable
DROP TABLE "tenants";

-- DropTable
DROP TABLE "text_analysis";

-- DropTable
DROP TABLE "usage";

-- DropTable
DROP TABLE "user_roles";

-- DropTable
DROP TABLE "wellness_data";

-- DropTable
DROP TABLE "widgets";

-- DropEnum
DROP TYPE "ExamType";

-- DropEnum
DROP TYPE "UserRoleType";

-- DropEnum
DROP TYPE "WidgetType";

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleMap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemporaryUserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemporaryUserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "service" TEXT,
    "correlationId" TEXT,
    "userId" TEXT,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagEntity" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "targetUsers" TEXT[],
    "targetRoles" TEXT[],
    "targetSegments" TEXT[],
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlagEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemoteConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemoteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "UserRoleMap_userId_idx" ON "UserRoleMap"("userId");

-- CreateIndex
CREATE INDEX "UserRoleMap_roleId_idx" ON "UserRoleMap"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleMap_userId_roleId_key" ON "UserRoleMap"("userId", "roleId");

-- CreateIndex
CREATE INDEX "TemporaryUserRole_userId_idx" ON "TemporaryUserRole"("userId");

-- CreateIndex
CREATE INDEX "TemporaryUserRole_roleId_idx" ON "TemporaryUserRole"("roleId");

-- CreateIndex
CREATE INDEX "TemporaryUserRole_expiresAt_idx" ON "TemporaryUserRole"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "LogEntry_level_idx" ON "LogEntry"("level");

-- CreateIndex
CREATE INDEX "LogEntry_service_idx" ON "LogEntry"("service");

-- CreateIndex
CREATE INDEX "LogEntry_timestamp_idx" ON "LogEntry"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlagEntity_key_key" ON "FeatureFlagEntity"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RemoteConfig_key_key" ON "RemoteConfig"("key");

-- CreateIndex
CREATE INDEX "EmailLog_templateName_idx" ON "EmailLog"("templateName");

-- CreateIndex
CREATE UNIQUE INDEX "MebTopic_grade_subject_topic_key" ON "MebTopic"("grade", "subject", "topic");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleMap" ADD CONSTRAINT "UserRoleMap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleMap" ADD CONSTRAINT "UserRoleMap_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryUserRole" ADD CONSTRAINT "TemporaryUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemporaryUserRole" ADD CONSTRAINT "TemporaryUserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
