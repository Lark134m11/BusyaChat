/*
  Warnings:

  - The values [STAGE] on the enum `ChannelType` will be removed. If these variants are still used in the database, this will fail.
  - The values [DND,INVISIBLE] on the enum `PresenceStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `replyToId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `nickname` on the `ServerMember` table. All the data in the column will be lost.
  - You are about to drop the column `about` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `nickname` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedAt` on the `User` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Channel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Server` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ServerRole" AS ENUM ('OWNER', 'ADMIN', 'MOD', 'MEMBER');

-- AlterEnum
BEGIN;
CREATE TYPE "ChannelType_new" AS ENUM ('TEXT', 'VOICE');
ALTER TABLE "Channel" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Channel" ALTER COLUMN "type" TYPE "ChannelType_new" USING ("type"::text::"ChannelType_new");
ALTER TYPE "ChannelType" RENAME TO "ChannelType_old";
ALTER TYPE "ChannelType_new" RENAME TO "ChannelType";
DROP TYPE "ChannelType_old";
ALTER TABLE "Channel" ALTER COLUMN "type" SET DEFAULT 'TEXT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PresenceStatus_new" AS ENUM ('ONLINE', 'IDLE', 'OFFLINE');
ALTER TABLE "User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE "PresenceStatus_new" USING ("status"::text::"PresenceStatus_new");
ALTER TYPE "PresenceStatus" RENAME TO "PresenceStatus_old";
ALTER TYPE "PresenceStatus_new" RENAME TO "PresenceStatus";
DROP TYPE "PresenceStatus_old";
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ONLINE';
COMMIT;

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "minRole" "ServerRole" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "replyToId",
DROP COLUMN "updatedAt",
ADD COLUMN     "editedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Server" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ServerMember" DROP COLUMN "nickname",
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "role" "ServerRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "about",
DROP COLUMN "nickname",
DROP COLUMN "verifiedAt",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ServerBan" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ServerBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "maxUses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelReadState" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadMessageId" TEXT,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ChannelReadState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectThread" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMember" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessageReaction" (
    "id" TEXT NOT NULL,
    "directMessageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectReadState" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadMessageId" TEXT,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "DirectReadState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "messageId" TEXT,
    "directMessageId" TEXT,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServerBan_serverId_idx" ON "ServerBan"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerBan_serverId_userId_key" ON "ServerBan"("serverId", "userId");

-- CreateIndex
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- CreateIndex
CREATE INDEX "Invite_serverId_idx" ON "Invite"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelReadState_channelId_userId_key" ON "ChannelReadState"("channelId", "userId");

-- CreateIndex
CREATE INDEX "DirectMember_userId_idx" ON "DirectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectMember_threadId_userId_key" ON "DirectMember"("threadId", "userId");

-- CreateIndex
CREATE INDEX "DirectMessage_threadId_createdAt_idx" ON "DirectMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessageReaction_directMessageId_idx" ON "DirectMessageReaction"("directMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessageReaction_directMessageId_userId_emoji_key" ON "DirectMessageReaction"("directMessageId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "DirectReadState_threadId_userId_key" ON "DirectReadState"("threadId", "userId");

-- CreateIndex
CREATE INDEX "Attachment_uploaderId_idx" ON "Attachment"("uploaderId");

-- AddForeignKey
ALTER TABLE "ServerBan" ADD CONSTRAINT "ServerBan_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerBan" ADD CONSTRAINT "ServerBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerBan" ADD CONSTRAINT "ServerBan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelReadState" ADD CONSTRAINT "ChannelReadState_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelReadState" ADD CONSTRAINT "ChannelReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMember" ADD CONSTRAINT "DirectMember_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DirectThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMember" ADD CONSTRAINT "DirectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DirectThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageReaction" ADD CONSTRAINT "DirectMessageReaction_directMessageId_fkey" FOREIGN KEY ("directMessageId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessageReaction" ADD CONSTRAINT "DirectMessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectReadState" ADD CONSTRAINT "DirectReadState_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DirectThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectReadState" ADD CONSTRAINT "DirectReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_directMessageId_fkey" FOREIGN KEY ("directMessageId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
