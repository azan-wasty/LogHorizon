require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Connecting to database...');
    
    // 1. Ensure UserAchievement.pinned exists
    console.log('Syncing UserAchievement.pinned...');
    await pool.query(`
      ALTER TABLE "UserAchievement" 
      ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false;
    `);

    // 2. Ensure Friendship table exists
    console.log('Syncing Friendship table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Friendship" (
        "id" SERIAL PRIMARY KEY,
        "followerId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "followingId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("followerId", "followingId")
      );
      ALTER TABLE "Friendship" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACCEPTED';
      CREATE INDEX IF NOT EXISTS "Friendship_followerId_idx" ON "Friendship"("followerId");
      CREATE INDEX IF NOT EXISTS "Friendship_followingId_idx" ON "Friendship"("followingId");
      CREATE INDEX IF NOT EXISTS "Friendship_status_idx" ON "Friendship"("status");
    `);

    // 3. Ensure Activity table exists
    console.log('Syncing Activity table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Activity" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "contentId" INTEGER REFERENCES "Content"("id") ON DELETE CASCADE,
        "type" TEXT NOT NULL,
        "rating" INTEGER,
        "comment" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "comment" TEXT;
      CREATE INDEX IF NOT EXISTS "Activity_userId_createdAt_idx" ON "Activity"("userId", "createdAt");
      CREATE INDEX IF NOT EXISTS "Activity_createdAt_idx" ON "Activity"("createdAt");
    `);

    // 4. Ensure ActivityReaction table exists
    console.log('Syncing ActivityReaction table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ActivityReaction" (
        "id" SERIAL PRIMARY KEY,
        "activityId" INTEGER NOT NULL REFERENCES "Activity"("id") ON DELETE CASCADE,
        "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "emoji" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ActivityReaction_activityId_userId_emoji_key" UNIQUE ("activityId", "userId", "emoji")
      );
      CREATE INDEX IF NOT EXISTS "ActivityReaction_activityId_idx" ON "ActivityReaction"("activityId");
      CREATE INDEX IF NOT EXISTS "ActivityReaction_userId_idx" ON "ActivityReaction"("userId");
    `);

    // 5. Ensure ActivityComment table exists
    console.log('Syncing ActivityComment table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ActivityComment" (
        "id" SERIAL PRIMARY KEY,
        "activityId" INTEGER NOT NULL REFERENCES "Activity"("id") ON DELETE CASCADE,
        "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "text" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "ActivityComment_activityId_createdAt_idx" ON "ActivityComment"("activityId", "createdAt");
      CREATE INDEX IF NOT EXISTS "ActivityComment_userId_idx" ON "ActivityComment"("userId");
    `);

    console.log('DB sync completed successfully!');
  } catch (err) {
    console.error('DB sync error:', err);
  } finally {
    await pool.end();
  }
}

run();
