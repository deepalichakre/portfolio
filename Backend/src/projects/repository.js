// Backend/src/projects/repository.js
import { db } from "../lib/db.js";

export const repo = {
  // CREATE
  create: (data) => db.project.create({ data }),

  // READ
  list: () => db.project.findMany({ orderBy: { createdAt: "desc" } }),
 // was: findBySlug: (slug) => db.project.findUnique({ where: { slug } }),
findBySlug: (slug) =>
  db.project.findFirst({
    where: { slug: { equals: String(slug), mode: "insensitive" } },
  }),

  findById: (id) => db.project.findUnique({ where: { id } }),

  // UPDATE
  update: (id, data) => db.project.update({ where: { id }, data }),

  // DELETE
  remove: (id) => db.project.delete({ where: { id } }),
};
