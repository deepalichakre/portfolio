// Frontend/src/components/ProjectGrid.js
"use client";
import { useState } from "react";
import Link from "next/link";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

export default function ProjectGrid({ projects }) {
  const published = Array.isArray(projects)
    ? projects.filter(p => (p.status || '').toLowerCase() === 'published')
    : [];

  const allTechs = Array.from(
    new Set(
      published.flatMap(p =>
        Array.isArray(p.techStack) ? p.techStack
          : typeof p.techStack === 'string'
            ? p.techStack.split(',').map(t => t.trim())
            : []
      )
    )
  ).filter(Boolean);

  const [selectedTech, setSelectedTech] = useState("");
  const [searchText, setSearchText] = useState("");

  const filtered = published.filter(p => {
    const techs = Array.isArray(p.techStack) ? p.techStack
      : typeof p.techStack === 'string'
        ? p.techStack.split(',').map(t => t.trim())
        : [];
    const techMatch = selectedTech ? techs.includes(selectedTech) : true;
    const searchMatch = !searchText.trim() ||
      (p.title || '').toLowerCase().includes(searchText.trim().toLowerCase());
    return techMatch && searchMatch;
  });

  return (
    <div className="container">
      {/* Filters */}
      <section className="filters" aria-label="Project filters">
        <FormControl size="medium" sx={{ minWidth: 220, fontFamily: 'inherit' }}>
          <InputLabel id="tech-filter-label" shrink>Filter Tech Stack</InputLabel>
          <Select
            labelId="tech-filter-label"
            id="tech-filter"
            value={selectedTech}
            label="Filter Tech Stack"
            onChange={e => setSelectedTech(e.target.value)}
            displayEmpty
            sx={{ fontFamily: 'inherit' }}
          >
            <MenuItem value=""><em>All</em></MenuItem>
            {allTechs.map(tech => (
              <MenuItem key={tech} value={tech}>{tech}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <input
          type="text"
          placeholder="Search projects..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{
            width: '100%',
            height: '56px',
            padding: '0 1rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '1rem',
            fontFamily: 'inherit',
            background: '#fafafa',
            outline: 'none',
            boxSizing: 'border-box',
            color: '#222',
          }}
        />
      </section>

      {/* Grid */}
      <section className="section">
        {filtered.length === 0 ? (
          <p style={{ opacity: .7 }}>No projects found for this filter.</p>
        ) : (
          <div className="projects-grid">
            {filtered.map(p => (
              <div key={p.id} className="card">
                <article>
                  <img src={p.coverImageUrl || '/placeholder.png'} alt={p.title}/>
                  <div className="card-body">
                    <p className="card-title">
                      <Link href={`/projects/${p.slug}`} className="no-underline" style={{ color: 'inherit' }}>
                        {p.title}
                      </Link>
                    </p>
                    {!!(p.tags?.length) && (
                      <p className="card-tagline">{p.tags.slice(0,3).join(' • ')}</p>
                    )}
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
