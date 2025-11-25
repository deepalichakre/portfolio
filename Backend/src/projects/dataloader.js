// Backend/src/projects/dataloader.js
import { repo } from "./repository.js";

export const listProjects = () => repo.list();
export const getProjectBySlug = (slug) => repo.findBySlug(slug);
