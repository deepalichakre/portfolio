'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../../hooks/useAPI';
import AdminProjectForm from '../../../../components/admin/AdminProjectForm';
import { Container, CircularProgress, Alert } from '@mui/material';

export default function AdminEditProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { project } = await apiFetch(`/admin/projects/${id}`);
        if (mounted) setProject(project);
      } catch (e) {
        setMsg({ type: 'error', text: e.message });
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  return (
    <Container sx={{ py: 6, maxWidth: 720 }}>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
      {loading && !project ? <CircularProgress /> : null}
      {project && <AdminProjectForm mode="edit" initialProject={project} />}
    </Container>
  );
}