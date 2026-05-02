BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] ADD [avatarUrl] NVARCHAR(1000),
[bio] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[UserLibrary] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [contentId] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [rating] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserLibrary_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [UserLibrary_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserLibrary_userId_contentId_key] UNIQUE NONCLUSTERED ([userId],[contentId])
);

-- CreateTable
CREATE TABLE [dbo].[UserAchievement] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [key] NVARCHAR(1000) NOT NULL,
    [unlockedAt] DATETIME2 NOT NULL CONSTRAINT [UserAchievement_unlockedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserAchievement_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserAchievement_userId_key_key] UNIQUE NONCLUSTERED ([userId],[key])
);

-- CreateTable
CREATE TABLE [dbo].[DiscordRecommendation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [contentId] INT NOT NULL,
    [inviteLink] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [DiscordRecommendation_status_df] DEFAULT 'PENDING',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DiscordRecommendation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DiscordRecommendation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DiscordRecommendation_userId_contentId_key] UNIQUE NONCLUSTERED ([userId],[contentId])
);

-- AddForeignKey
ALTER TABLE [dbo].[UserLibrary] ADD CONSTRAINT [UserLibrary_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserLibrary] ADD CONSTRAINT [UserLibrary_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserAchievement] ADD CONSTRAINT [UserAchievement_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DiscordRecommendation] ADD CONSTRAINT [DiscordRecommendation_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[DiscordRecommendation] ADD CONSTRAINT [DiscordRecommendation_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
