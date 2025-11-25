'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Stack, Typography, Button, TextField, Alert, IconButton, Card, CardMedia, CardContent } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { apiFetch } from '../../hooks/useAPI'
import { supa } from '../../lib/supabase';

const getFileName = (f) => f?.name?.replace(/\s+/g, '-') || 'upload.bin';
const resetFileInput = (ref) => { if (ref?.current) ref.current.value = null; };

export default function MediaGallery({ projectId }) {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState(null);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  // load existing media
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { media } = await apiFetch(`/admin/projects/${projectId}/media`);
        if (mounted) setItems(media);
      } catch (e) {
        setMsg({ type: 'error', text: e.message });
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  useEffect(() => {
    if (!file) { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(''); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function addToGallery() {
    try {
      if (!file) throw new Error('Choose an image first');
      setBusy(true); setMsg(null);

      // 1) sign
      const sign = await apiFetch('/admin/media/sign-upload', {
        method: 'POST',
        body: { projectId, filename: getFileName(file) },
      });

      // 2) upload
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'projects';
      const up = await supa.storage.from(bucket).uploadToSignedUrl(sign.path, sign.token, file);
      if (up.error) throw up.error;

      // 3) create DB row
      const { media } = await apiFetch(`/admin/projects/${projectId}/media`, {
        method: 'POST',
        body: { url: sign.publicUrl, caption: caption || '' },
      });

      setItems((arr) => [...arr, media]);
      setCaption('');
      resetFileInput(inputRef);
      setFile(null);
      if (inputRef.current) inputRef.current.value = null;
      setMsg({ type: 'success', text: 'Added to gallery' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Upload failed' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(mediaId) {
    const ok = window.confirm('Delete this image from gallery?');
    if (!ok) return;
    try {
      await apiFetch(`/admin/media/${mediaId}`, { method: 'DELETE' });
      setItems((arr) => arr.filter(x => x.id !== mediaId));
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  return (
    <Stack spacing={2} sx={{ border: '1px dashed #ccc', p: 2, borderRadius: 1 }}>
      <Typography variant="h6">Media Gallery</Typography>
      {msg && <Alert severity={msg.type}>{msg.text}</Alert>}

      {/* uploader */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Button
                variant="outlined"
                onClick={() => { inputRef.current?.click(); }}
                disabled={!projectId}
              >
                Choose Image
              </Button>
        <TextField
          label="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          size="small"
          sx={{ minWidth: 240 }}
        />
        <Button variant="contained" onClick={addToGallery} disabled={!file || busy}>
          {busy ? 'Uploading…' : 'Add to gallery'}
        </Button>
      </Stack>

      {previewUrl && (
        <Alert severity="info">
          Preview
          <div style={{ marginTop: 8 }}>
            <img src={previewUrl} alt="preview" style={{ maxWidth: 280, borderRadius: 8 }} />
          </div>
        </Alert>
      )}

      {/* list items */}
      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
        {items.map(item => (
          <Card key={item.id} sx={{ width: 220 }}>
            <CardMedia
              component="img"
              height="140"
              image={item.url}
              alt={item.caption || 'image'}
              sx={{ objectFit: 'cover' }}
            />
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {item.caption || <span style={{ color: '#777' }}>No caption</span>}
              </Typography>
              <IconButton size="small" onClick={() => remove(item.id)} aria-label="Delete image">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
