import { PrismaClient } from "../generated/prisma/index.js";
//import { PrismaClient } from "@prisma/client";

const g = globalThis;
const prisma = g.__prisma || new PrismaClient({ log: ["warn", "error"] });
if (process.env.NODE_ENV !== "production") g.__prisma = prisma;

export const db = prisma;

/*
// Backend/src/lib/db.js
import { PrismaClient } from '@prisma/client';

const g = globalThis;
export const db = g.__db || new PrismaClient({ log: ['warn', 'error'] });
if (!g.__db) g.__db = db;

// Backend/src/lib/db.js
import pkg from "@prisma/client";

const { PrismaClient } = pkg;

const g = globalThis;

export const db =
  g.__db ||
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  g.__db = db;
}
  */
