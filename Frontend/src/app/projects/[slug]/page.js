// Frontend/src/app/projects/[slug]/page.js
import Link from "next/link";
import GalleryLightbox from "../../../components/GalleryLightbox";
// --- helpers ---
function toYouTubeEmbed(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // https://www.youtube.com/watch?v=ID  or youtu.be/ID
    const id =
      u.searchParams.get("v") ||
      (u.hostname.includes("youtu.be") ? u.pathname.slice(1) : null);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

async function getProject(slug) {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const res = await fetch(`${base}/projects/${slug}`, {
    cache: "no-store",
  });
  
  if (!res.ok) return null;
  const { project } = await res.json();
  return project || null;
}

async function getMedia(projectId) {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const res = await fetch(`${base}/projects/${projectId}/media`, { cache: "no-store" });
  if (!res.ok) return [];
  const { media = [] } = await res.json();
  return media.filter(m => (m.kind === "image") && (m.url));
}

export default async function ProjectDetailPage({ params }) {
  const { slug } = await params; // Next15 server param
  const project = await getProject(slug);

  if (!project) {
    return (
      <main className="container detail">
        <div className="ribbon">
          <Link href="/" prefetch={false}>Deepali Chakre’s Portfolio</Link>
        </div>
        <p>Project not found.</p>
      </main>
    );
  }

  const gallery = await getMedia(project.id);
  const yt = toYouTubeEmbed(project.youtubeUrl);

  return (
        <main className="container detail">


      <section className="detail-hero">
        <header className="detail-grid">
          <div className="detail-head">
            <h1 className="detail-title">{project.title}</h1>
            {project.summary && <h3 className="detail-summary">{project.summary}</h3>}
            {!!(project.tags?.length) && (
              <div className="badges" style={{ marginTop: 8 }}>
                {project.tags.slice(0, 6).map(t => <span className="badge" key={t}>{t}</span>)}
              </div>
            )}
          </div>
          {project.coverImageUrl && (
            <figure className="detail-cover">
              <img src={project.coverImageUrl} alt={project.title} />
            </figure>
          )}
        </header>
      </section>

      {/* YouTube embed (if any) */}
      {yt && (
        <section className="detail-block">
          <h2 className="detail-h2">Demo video</h2>
          <div className="video-embed">
            <iframe
              src={yt}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>
      )}

        {project.bodyMDX && (
          <section className="project-body">
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: project.bodyMDX }}
            />
          </section>
        )}


      {/* Media gallery */}
      {gallery.length > 0 && (
    <section className="detail-block">
      <h2 className="detail-h2">Additional images</h2>
      <GalleryLightbox gallery={gallery} />

    </section>
  )}
    </main>
  );
}
