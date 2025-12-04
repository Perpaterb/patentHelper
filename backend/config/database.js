/**
 * Database Connection Configuration
 *
 * Prisma Client singleton instance for the application.
 *
 * @module config/database
 */

const { PrismaClient } = require('@prisma/client');

/**
 * Prisma Client instance
 * @type {PrismaClient}
 */
const prisma = new PrismaClient({
  log: ['error'], // Only log errors (removed verbose query logging)
});

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Gracefully disconnect from database
 */
async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log('Database disconnected');
}

module.exports = {
  prisma,
  testConnection,
  disconnectDatabase
};
