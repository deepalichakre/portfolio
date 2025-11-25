import { repo } from "./repository.js";
import { normalizeCreate, normalizeUpdate } from "./validator.js";

export async function createProject(body) {
  const data = normalizeCreate(body);
  const exists = await repo.findBySlug(data.slug);
  if (exists) throw new Error("Slug already exists");
  return repo.create(data);
}

export async function updateProject(id, body) {
  const data = normalizeUpdate(body);

  // if slug is being changed, enforce uniqueness
  if (data.slug) {
    const exists = await repo.findBySlug(data.slug);
    if (exists && exists.id !== id) throw new Error("Slug already exists");
  }
  return repo.update(id, data);
}

export async function deleteProject(id) {
  return repo.remove(id);
}
