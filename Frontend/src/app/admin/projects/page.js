'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../hooks/useAPI';
import Link from 'next/link';
import {
  Container, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Button, Stack, Chip, CircularProgress, Alert, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';

export default function AdminProjectsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [auth, setAuth] = useState({ user: '', pass: '' });

  // delete dialog
  const [confirmId, setConfirmId] = useState(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const { projects } = await apiFetch('/projects');
      setRows(projects);
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  const onAuth = (e) => setAuth(a => ({ ...a, [e.target.name]: e.target.value }));

  async function doDelete() {
    if (!confirmId) return;
    try {
      await apiFetch(`/admin/projects/${confirmId}`, { method: 'DELETE', auth });
      setMsg({ type: 'success', text: 'Deleted' });
      setConfirmId(null);
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  return (
    <Container sx={{ py: 6 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Projects (Admin)</Typography>
        <Button component={Link} href="/admin/new" variant="contained">+ New Project</Button>
      </Stack>

      {/* Admin creds */}
      <Stack direction={{ xs:'column', sm:'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Admin user" name="user" value={auth.user} onChange={onAuth} size="small" />
        <TextField label="Admin pass" name="pass" type="password" value={auth.pass} onChange={onAuth} size="small" />
      </Stack>

      {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
      {loading ? <CircularProgress /> : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(p => (
              <TableRow key={p.id} hover>
                <TableCell>{p.title}</TableCell>
                <TableCell>{p.slug}</TableCell>
                <TableCell>{p.status}</TableCell>
                <TableCell>
                  {(p.tags || []).slice(0,4).map(tag => <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5 }}/>)}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button component={Link} href={`/admin/edit/${p.id}`} variant="outlined" size="small">Edit</Button>
                    <Button variant="outlined" color="error" size="small" onClick={() => setConfirmId(p.id)}>
                      Delete
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmId} onClose={() => setConfirmId(null)}>
        <DialogTitle>Delete project?</DialogTitle>
        <DialogContent>This action cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmId(null)}>Cancel</Button>
          <Button color="error" onClick={doDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
