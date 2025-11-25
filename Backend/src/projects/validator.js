// Backend/src/projects/validator.js

function splitCSV(s) {
  return String(s || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
}

function isUrlOrEmpty(value) {
  if (value === "" || value === null) return null; // will set DB field to NULL
  if (!value) return undefined;                    // undefined = don't touch
  try { return String(new URL(String(value))); }
  catch { throw new Error("youtubeUrl is not a valid URL"); }
}
/** Normalize + validate input for CREATE */
export function normalizeCreate(body = {}) {
    
  const {
    title, slug, summary,
    bodyMDX = "",
    coverImageUrl = "",
    status = "Draft",
    techStack = "",
    tags = "",
    youtubeUrl = "" 
  } = body;

  const missing = ["title", "slug", "summary"].filter(k => !body[k]);
  if (missing.length) throw new Error(`Missing required: ${missing.join(", ")}`);

  const normalizedSlug = String(slug).trim().toLowerCase(); 

  return {
    title,
    slug: normalizedSlug,
    summary,
    bodyMDX,
    coverImageUrl,
    status,
    techStack: splitCSV(techStack),
    youtubeUrl: isUrlOrEmpty(youtubeUrl),
    tags: splitCSV(tags)
  };
}

/** Normalize input for UPDATE (all fields optional) */
export function normalizeUpdate(body = {}) {
  const out = {};
  const keys = ["title","slug","summary","bodyMDX","coverImageUrl","status", "youtubeUrl"];
  for (const k of keys) if (body[k] !== undefined) out[k] = body[k];
  if (body.slug !== undefined) out.slug = String(body.slug).trim().toLowerCase();
  if (body.techStack !== undefined) out.techStack = splitCSV(body.techStack);
  if (body.tags !== undefined) out.tags = splitCSV(body.tags);
  if (out.youtubeUrl !== undefined) out.youtubeUrl = isUrlOrEmpty(out.youtubeUrl); // ← validate
  return out;
}
