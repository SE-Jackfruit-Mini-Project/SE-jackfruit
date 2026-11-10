/**
 * @file prisma.js
 * @description Shared Prisma Client instance for PostgreSQL database access.
 * Exporting a single client instance prevents connection pool exhaustion across modules.
 */

import { PrismaClient } from "@prisma/client";

/**
 * Global Prisma Client singleton instance for database query execution.
 * @type {PrismaClient}
 */
export const prisma = new PrismaClient();
