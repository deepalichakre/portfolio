import "dotenv/config.js";
import express from "express";
import cors from "cors";
import basicAuth from "basic-auth";
import { db } from "./lib/db.js";
import { listProjects, getProjectBySlug } from "./projects/dataloader.js";
import { createProject , updateProject, deleteProject } from "./projects/service.js";
import { repo } from "./projects/repository.js"; 
import { supaAdmin, publicUrl } from "./lib/supabase.js";


const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.get("/", (_req, res) => {
  res.send("Portfolio API is running. Try /health or /projects");
});

try {
  const u = new URL(process.env.DATABASE_URL || "");
  console.log("DB target:", u.hostname, u.port, u.search);
} catch {
  console.log("DATABASE_URL not set or invalid");
}

function requireAdmin(req, res, next) {
  const creds = basicAuth(req);
  if (creds &&
      creds.name === process.env.ADMIN_USER &&
      creds.pass === process.env.ADMIN_PASS) return next();
  res.set("WWW-Authenticate", 'Basic realm="Secure Area"');
  return res.status(401).send("Authentication required");
}

app.get("/health", (req, res) => res.json({ ok: true }));

// Public reads (very simple for now)
// list projects (public)
// GET /projects (public)
app.get("/projects", async (_req, res) => {
  try {
    const rows = await listProjects();
    res.json({ ok: true, projects: rows });
  } catch (e) {
    console.error("GET /projects error:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// GET /projects/:slug (public)
app.get("/projects/:slug", async (req, res) => {
  try {
    const row = await getProjectBySlug(req.params.slug);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, project: row });
  } catch (e) {
    console.error("GET /projects/:slug error:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// GET one project by id (protected)
app.get("/admin/projects/:id", requireAdmin, async (req, res) => {
  try {
    const row = await repo.findById(req.params.id);
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, project: row });
  } catch (e) {
    console.error("GET /admin/projects/:id error:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /admin/projects (protected)
app.post("/admin/projects", requireAdmin, async (req, res) => {
  try {
    const project = await createProject(req.body);
    res.status(201).json({ ok: true, project });
  } catch (e) {
    console.error("POST /admin/projects error:", e);
    const msg = e?.message || "Bad Request";
    const code = msg.includes("Missing required") || msg.includes("Slug already exists") ? 400 : 500;
    res.status(code).json({ ok: false, error: msg });
  }
});

// UPDATE a project by id (protected)
app.put("/admin/projects/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await updateProject(req.params.id, req.body);
    res.json({ ok: true, project: updated });
  } catch (e) {
    console.error("PUT /admin/projects/:id error:", e);
    const msg = e?.message || "Bad Request";
    const code = msg.includes("Slug already exists") ? 400 : 500;
    res.status(code).json({ ok: false, error: msg });
  }
});

app.delete("/admin/projects/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    // If you haven’t added onDelete: Cascade, do a code-level cascade:
    await db.$transaction([
      db.media.deleteMany({ where: { projectId: id } }),
      db.project.delete({ where: { id } }),
    ]);

    // Return JSON so the client doesn’t try to parse empty body
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error("DELETE /admin/projects/:id error:", e);
    if (e?.code === "P2025") {
      return res.status(404).json({ ok: false, error: "Not found" });
    }
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/admin/media/sign-upload", requireAdmin, async (req, res) => {
  try {
    if (!supaAdmin) {
      return res.status(500).json({ ok: false, error: "Supabase not configured (check SUPABASE_URL / SUPABASE_SERVICE_ROLE)" });
    }

    const { projectId, filename } = req.body || {};
    if (!projectId || !filename) {
      return res.status(400).json({ ok: false, error: "projectId and filename are required" });
    }

    const path = `${projectId}/${Date.now()}-${filename}`.replace(/\s+/g, "-");
    const { data, error } = await supaAdmin
      .storage
      .from(process.env.SUPABASE_BUCKET)
      .createSignedUploadUrl(path);

    if (error) {
      console.error("Supabase sign-upload error:", error);
      return res.status(500).json({ ok: false, error: error.message || String(error) });
    }

    return res.json({
      ok: true,
      path,
      token: data.token,
      publicUrl: publicUrl(path),
    });
  } catch (e) {
    console.error("POST /admin/media/sign-upload error:", e);
    return res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
});
app.put("/admin/projects/:id/cover", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: "url is required" });

    // confirm project exists
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    // OPTIONAL: if replacing a previous cover, remove the old file to keep storage clean
    // only if it was in our bucket and differs from the new one
    const oldUrl = existing.coverImageUrl || "";
    if (oldUrl && oldUrl !== url) {
      try {
        const prefix = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/`;
        if (oldUrl.startsWith(prefix)) {
          const oldPath = oldUrl.slice(prefix.length);
          await supaAdmin.storage.from(process.env.SUPABASE_BUCKET).remove([oldPath]);
        }
      } catch (e) {
        console.warn("Could not remove old cover:", e.message || e);
      }
    }

    const updated = await db.project.update({
      where: { id },
      data: { coverImageUrl: url }
    });

    return res.json({ ok: true, project: updated });
  } catch (e) {
    console.error("PUT /admin/projects/:id/cover error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});
// ===== MEDIA: list for a project (admin) =====
app.get('/admin/projects/:id/media', requireAdmin, async (req, res) => {
  try {
    const list = await db.media.findMany({
      where: { projectId: req.params.id },
      orderBy: { sort: 'asc' },
    });
    res.json({ ok: true, media: list });
  } catch (e) {
    console.error('GET /admin/projects/:id/media error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// ===== MEDIA: create row after upload (admin) =====
// body: { url: string, caption?: string }
app.post('/admin/projects/:id/media', requireAdmin, async (req, res) => {
  try {
    const { url, caption = '' } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url is required' });

    // compute next sort index
    const max = await db.media.aggregate({
      where: { projectId: req.params.id },
      _max: { sort: true },
    });
    const nextSort = (max._max.sort ?? 0) + 1;

    const row = await db.media.create({
      data: {
        projectId: req.params.id,
        kind: 'image',
        url,
        caption,
        sort: nextSort,
      },
    });
    res.status(201).json({ ok: true, media: row });
  } catch (e) {
    console.error('POST /admin/projects/:id/media error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// ===== MEDIA: update caption (admin) =====
app.put('/admin/media/:mediaId', requireAdmin, async (req, res) => {
  try {
    const { caption = '' } = req.body || {};
    const row = await db.media.update({
      where: { id: req.params.mediaId },
      data: { caption },
    });
    res.json({ ok: true, media: row });
  } catch (e) {
    console.error('PUT /admin/media/:mediaId error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// ===== MEDIA: delete item (admin) =====
app.delete('/admin/media/:mediaId', requireAdmin, async (req, res) => {
  try {
    await db.media.delete({ where: { id: req.params.mediaId } });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /admin/media/:mediaId error:', e);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

app.get("/projects/:id/media", async (req, res) => {
  try {
    const media = await db.media.findMany({
      where: { projectId: req.params.id },
      orderBy: { sort: "asc" },
    });
    res.json({ ok: true, media });
  } catch (e) {
    console.error("GET /projects/:id/media error:", e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.use(cors({
  origin: process.env.CORS_ORIGIN,   // e.g. http://localhost:3000
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
}));



const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Backend on http://localhost:${port}`));
