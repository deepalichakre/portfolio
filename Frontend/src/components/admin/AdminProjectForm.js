'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../hooks/useAPI'
import { supa } from '../../lib/supabase';
import {
  Container, Typography, Stack, TextField, Button, Select, Alert,
  FormControl, InputLabel, MenuItem
} from '@mui/material';
import MediaGallery from '../../components/admin/MediaGallery';
import 'quill/dist/quill.snow.css';
import { useQuill } from 'react-quilljs';

// ---------- helpers ----------
const getFileName = (f) => f?.name?.replace(/\s+/g, '-') || 'upload.bin';
const resetFileInput = (ref) => { if (ref?.current) ref.current.value = null; };

function toFormShape(project) {
  if (!project) {
    return {
      title: '', slug: '', summary: '',
      bodyMDX: '', youtubeUrl: '',
      techStack: '', tags: '', status: 'Draft',
      coverImageUrl: '',
    };
  }
  return {
    title: project.title || '',
    slug: project.slug || '',
    summary: project.summary || '',
    bodyMDX: project.bodyMDX || '',
    youtubeUrl: project.youtubeUrl || '',
    techStack: (project.techStack || []).join(', '),
    tags: (project.tags || []).join(', '),
    status: project.status || 'Draft',
    coverImageUrl: project.coverImageUrl || '',
  };
}
function normalized(form) {
  return {
    title: form.title.trim(),
    slug: form.slug.trim().toLowerCase(),
    summary: form.summary.trim(),
    bodyMDX: form.bodyMDX.trim(),
    youtubeUrl: form.youtubeUrl.trim(),
    techStack: form.techStack.split(',').map(s => s.trim()).filter(Boolean).join(','),
    tags: form.tags.split(',').map(s => s.trim()).filter(Boolean).join(','),
    status: form.status.trim(),
    coverImageUrl: form.coverImageUrl.trim(),
  };
}
const shallowEqual = (a, b) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.keys(a).every(k => a[k] === b[k]);

// ---------- component ----------
export default function AdminProjectForm({ mode, initialProject, onCreatedId }) {
  // form & baseline
  const [form, setForm] = useState(toFormShape(initialProject));
  const [projectId, setProjectId] = useState(initialProject?.id || null);
  const [baseline, setBaseline] = useState(normalized(form));
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  // cover upload state
  const coverInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // editor upload input (hidden)
  const editorFileRef = useRef(null);

  // Quill guards to avoid infinite loops
  const quillHtmlFromQuillRef = useRef('');
  const quillInitializedRef   = useRef(false);

  // ---- Quill setup with custom image handler ----
  const formats = [
    'header','font','size','align','direction',
    'bold','italic','underline','strike',
    'script','blockquote','code-block',
    'list','indent','link','image','color','background',
  ];
  const { quill, quillRef } = useQuill({
    theme: 'snow',
    modules: {
      toolbar: {
        container: [
          [{ font: [] }, { size: [] }],
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ script: 'sub' }, { script: 'super' }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          [{ align: [] }],
          ['blockquote', 'code-block'],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: {
          image: () => {
            if (!projectId) {
              setMsg({ type: 'error', text: 'Save the project first, then insert images.' });
              return;
            }
            editorFileRef.current?.click();
          },
        },
      },
    },
    formats,
  });

  // Keep focus on editor after toolbar interaction (Space/Enter behave)
  useEffect(() => {
    if (!quill) return;
    const toolbar = quillRef.current?.parentElement?.querySelector('.ql-toolbar');
    if (!toolbar) return;
    const refocus = () => setTimeout(() => quill.focus(), 0);
    toolbar.addEventListener('mousedown', refocus, true);
    toolbar.addEventListener('click', refocus, true);
    return () => {
      toolbar.removeEventListener('mousedown', refocus, true);
      toolbar.removeEventListener('click', refocus, true);
    };
  }, [quill, quillRef]);

  // Enforce LTR selection (caret correctness)
  useEffect(() => {
    if (!quill) return;
    quill.root.setAttribute('dir', 'ltr');
    quill.root.style.direction = 'ltr';
    quill.root.style.textAlign = 'left';
    const enforce = () => {
      const sel = quill.getSelection();
      if (!sel) return;
      quill.format('direction', 'ltr');
      quill.format('align', 'left');
      quill.formatLine(sel.index, 1, { direction: 'ltr', align: 'left' });
    };
    enforce();
    quill.on('selection-change', enforce);
    return () => quill.off('selection-change', enforce);
  }, [quill]);

  // State → Quill (init + external changes)
  useEffect(() => {
    if (!quill) return;
    const html = form?.bodyMDX || '';
    if (!quillInitializedRef.current) {
      quill.clipboard.dangerouslyPasteHTML(html, 'silent');
      const end = quill.getLength();
      quill.setSelection(end, 0, 'silent');
      quill.focus();
      quillHtmlFromQuillRef.current = html;
      quillInitializedRef.current = true;
    } else if (html && html !== quillHtmlFromQuillRef.current) {
      quill.clipboard.dangerouslyPasteHTML(html, 'silent');
      const end = quill.getLength();
      quill.setSelection(end, 0, 'silent');
      quill.focus();
      quillHtmlFromQuillRef.current = html;
    }
  }, [quill, form?.bodyMDX]);

  // Quill → State (only when actually changed)
  useEffect(() => {
    if (!quill) return;
    const onTextChange = () => {
      const html = quill.root.innerHTML || '';
      if (quillHtmlFromQuillRef.current === html) return;
      quillHtmlFromQuillRef.current = html;
      setForm(f => (f && f.bodyMDX === html ? f : { ...f, bodyMDX: html }));
    };
    quill.on('text-change', onTextChange);
    return () => quill.off('text-change', onTextChange);
  }, [quill]);

  // Load edit data
  useEffect(() => {
    if (mode === 'edit' && initialProject) {
      const fs = toFormShape(initialProject);
      setForm(fs);
      setProjectId(initialProject.id);
      setBaseline(normalized(fs));
      setSelectedFile(null);
      setPreviewUrl('');
    }
  }, [mode, initialProject?.id]);

  // Preview cover file
  useEffect(() => {
    if (!selectedFile) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const isDirty = useMemo(() => !shallowEqual(normalized(form), baseline), [form, baseline]);
  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // -------- editor image upload flow --------
  async function uploadEditorImage(file) {
    if (!projectId) throw new Error('Save the project first, then insert images.');
    if (!file) throw new Error('No file selected');

    // 1) sign
    const sign = await apiFetch('/admin/media/sign-upload', {
      method: 'POST',
      body: { projectId, filename: getFileName(file) },
    });

    // 2) upload
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'projects';
    const up = await supa.storage.from(bucket).uploadToSignedUrl(sign.path, sign.token, file);
    if (up.error) throw up.error;

    // 3) persist a Media row (shows in gallery too)
    await apiFetch(`/admin/projects/${projectId}/media`, {
      method: 'POST',
      body: { url: sign.publicUrl, caption: '' },
    });

    return sign.publicUrl;
  }
  function onEditorFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    (async () => {
      try {
        setMsg(null);
        const url = await uploadEditorImage(file);
        const range = quill.getSelection(true);
        const index = range ? range.index : quill.getLength();
        quill.insertEmbed(index, 'image', url, 'user');
        quill.setSelection(index + 1, 0, 'silent');
        e.target.value = null;
      } catch (err) {
        setMsg({ type: 'error', text: err.message || 'Upload failed' });
      }
    })();
  }

  // -------- save / update --------
  async function handleSave(e) {
    e?.preventDefault?.();
    setMsg(null);
    setSaving(true);
    try {
      if (!projectId) {
        const { project } = await apiFetch('/admin/projects', { method: 'POST', body: form });
        setProjectId(project.id);
        onCreatedId?.(project.id);
        const fs = toFormShape(project);
        setForm(fs);
        setBaseline(normalized(fs));
        setMsg({ type: 'success', text: `Created: ${project.title}. You can now upload a cover or add images to the body.` });
      } else {
        if (!isDirty) return;
        const { project } = await apiFetch(`/admin/projects/${projectId}`, { method: 'PUT', body: form });
        const fs = toFormShape(project);
        setForm(fs);
        setBaseline(normalized(fs));
        setMsg({ type: 'success', text: 'Saved changes' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  // -------- cover upload / remove --------
  async function uploadCover() {
    try {
      if (!projectId) throw new Error('Create the project first');
      if (!selectedFile) throw new Error('Please choose an image first');

      const sign = await apiFetch('/admin/media/sign-upload', {
        method: 'POST',
        body: { projectId, filename: getFileName(selectedFile) },
      });
      const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'projects';
      const up = await supa.storage.from(bucket).uploadToSignedUrl(sign.path, sign.token, selectedFile);
      if (up.error) throw up.error;

      await apiFetch(`/admin/projects/${projectId}/cover`, {
        method: 'PUT',
        body: { url: sign.publicUrl },
      });

      setForm(f => ({ ...f, coverImageUrl: sign.publicUrl }));
      setBaseline(b => ({ ...b, coverImageUrl: sign.publicUrl.trim() }));
      setSelectedFile(null);
      setPreviewUrl('');
      resetFileInput(coverInputRef);
      setMsg({ type: 'success', text: 'Cover image set' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Upload failed' });
    }
  }
  async function removeCover() {
    try {
      if (!projectId) return;
      await apiFetch(`/admin/projects/${projectId}`, { method: 'PUT', body: { coverImageUrl: null } });
      setForm(f => ({ ...f, coverImageUrl: '' }));
      setBaseline(b => ({ ...b, coverImageUrl: '' }));
      setSelectedFile(null);
      setPreviewUrl('');
      resetFileInput(coverInputRef);
      setMsg({ type: 'success', text: 'Cover removed' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  const saveLabel = projectId ? 'Re-save' : 'Create Project';
  const saveDisabled = projectId ? (!isDirty || saving) : saving;

  return (
    <Container sx={{ py: 4, maxWidth: 720 }}>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}

      {/* prevent accidental submit; let Quill own typing */}
      <form
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.target?.closest?.('.ql-editor')) {
            e.stopPropagation();
          } else {
            if (e.key === 'Enter') e.preventDefault();
          }
        }}
      >
        <Stack spacing={2}>
          <TextField label="Title" name="title" value={form.title} onChange={onChange} required />
          <TextField label="Slug" name="slug" value={form.slug} onChange={onChange} required />
          <TextField label="Summary" name="summary" value={form.summary} onChange={onChange} required multiline />

          <div>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Body (MDX/Description)</Typography>

            {/* Hidden input for editor image uploads */}
            <input
              ref={editorFileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onEditorFileChange}
            />

            <div
              ref={quillRef}
              style={{ background: '#fff', minHeight: 300 }}
              onKeyDownCapture={(e) => {
                if (e.target?.closest?.('.ql-editor')) e.stopPropagation();
              }}
            />
          </div>

          <TextField label="YouTube URL (optional)" name="youtubeUrl" value={form.youtubeUrl} onChange={onChange} />
          <TextField label="Tech Stack (comma separated)" name="techStack" value={form.techStack} onChange={onChange} />
          <TextField label="Tags (comma separated)" name="tags" value={form.tags} onChange={onChange} />

          <FormControl required>
            <InputLabel id="status-label">Status</InputLabel>
            <Select labelId="status-label" id="status" name="status" value={form.status} label="Status" onChange={onChange}>
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Published">Published</MenuItem>
            </Select>
          </FormControl>

          {/* Cover Image */}
          <Stack spacing={1} sx={{ border: '1px dashed #ccc', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle1">Cover Image</Typography>

            {form.coverImageUrl && (
              <img src={form.coverImageUrl} alt="cover" style={{ maxWidth: 320, borderRadius: 8 }} />
            )}

            {previewUrl && (
              <Alert severity="info" sx={{ maxWidth: 340 }}>
                Preview
                <div style={{ marginTop: 8 }}>
                  <img src={previewUrl} alt="preview" style={{ maxWidth: 320, borderRadius: 8 }} />
                </div>
              </Alert>
            )}

            <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <Button
                variant="outlined"
                onClick={() => { resetFileInput(coverInputRef); coverInputRef.current?.click(); }}
                disabled={!projectId}
              >
                Choose Image
              </Button>
              <Button variant="contained" onClick={uploadCover} disabled={!projectId || !selectedFile}>
                Upload & Set as Cover
              </Button>
              <Button color="warning" variant="outlined" onClick={removeCover} disabled={!projectId || !form.coverImageUrl}>
                Remove Cover
              </Button>
            </Stack>
          </Stack>
             {projectId && <MediaGallery projectId={projectId} />}
          <Button type="button" onClick={handleSave} variant="contained" disabled={saveDisabled}>
            {saving ? (projectId ? 'Saving…' : 'Creating…') : saveLabel}
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
