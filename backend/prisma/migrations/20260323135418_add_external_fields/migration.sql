/*
  Warnings:

  - A unique constraint covering the columns `[source,externalId]` on the table `Content` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Content] ADD [coverImage] NVARCHAR(1000),
[externalId] NVARCHAR(1000),
[externalUrl] NVARCHAR(1000),
[rating] FLOAT(53),
[source] NVARCHAR(1000),
[status] NVARCHAR(1000);

-- CreateIndex
ALTER TABLE [dbo].[Content] ADD CONSTRAINT [Content_source_externalId_key] UNIQUE NONCLUSTERED ([source], [externalId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
