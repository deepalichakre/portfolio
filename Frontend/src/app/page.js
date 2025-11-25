// Frontend/src/app/page.js
import Link from 'next/link';
import ProjectGrid from '../components/ProjectGrid';

function apiBase() {
  // Use the proxy when configured (e.g., in prod), else call relative on dev.
  // Keep using your /admin/api proxy we set up in Next.
  return process.env.NEXT_PUBLIC_BACKEND_URL || '';
}

async function getProjects() {
  try {
    const res = await fetch(`${apiBase()}/projects`, {
      // We always want fresh data on the landing page
      cache: 'no-store',
      // If your backend needs cookies/headers later, we can forward here.
    });
    if (!res.ok) return { ok: false, projects: [] };
    const json = await res.json();
    return { ok: true, projects: json.projects || [] };
  } catch {
    return { ok: false, projects: [] };
  }
}

export default async function HomePage() {
  const { projects } = await getProjects();

 
  // Customize these
  const name = 'Deepali Chakre';
  const intro = `
Seeking Qlik and BI opportunities, relocating to London, UK on 15th December, and have full work rights.

1. Skilled Visualisation Specialist with 7 years of experience in BI Space, primarily in Qlik Sense (Enterprise for Windows and Qlik Cloud), Qlikview, NPrinting, SQL (Oracle, MySQL, BigQuery), Python, JavaScript, SAP BO, Tableau, Power BI, and Python. 

2. Proven track record delivering impactful, self-serve dashboards and analytical insights using Qlik across insurance, banking, and payments domains. 

3. Ensuring high standards across data quality, data visualisation practices, and stakeholder collaboration.
This is my project showcase and below are selected projects with quick links.`;

  const skills = ['Qlik Sense', 'SQL', 'Python', 'Power BI', 'JavaScript', 'React'];
  const photoUrl = '/profile.jpg'; // place your image at Frontend/public/profile.jpg

  return (
    <main>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <h1>{name}</h1>
              <p>{intro}</p>
              <div>{skills.map(s => <span key={s} className="badge">{s}</span>)}</div>
            </div>
            
            
            <img src={photoUrl} alt={`${name} profile photo`} className="hero-photo" width={260} height={260}/>
          </div>
        </div>
      </section>

      <ProjectGrid projects={projects} />
    </main>
  );
}