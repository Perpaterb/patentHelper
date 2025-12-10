/**
 * Database Connection Configuration
 *
 * Prisma Client singleton instance for the application.
 *
 * @module config/database
 */

const { PrismaClient } = require('@prisma/client');

/**
 * Prisma Client singleton instance
 *
 * For Lambda, we limit connections to prevent exhausting RDS connection pool.
 * RDS db.t3.micro has ~85 max connections. With Lambda concurrency, we need
 * to limit each Lambda instance's pool size.
 *
 * @type {PrismaClient}
 */

// Reuse existing Prisma client if available (Lambda warm starts)
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['error'], // Only log errors (removed verbose query logging)
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=1&pool_timeout=10',
    },
  },
});

// Prevent creating new clients in development hot-reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

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
