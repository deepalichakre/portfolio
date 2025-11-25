import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!url || !serviceKey) {
  console.warn("Supabase admin not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE missing)");
}

export const supaAdmin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;

export function publicUrl(path) {
  // for public buckets
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${path}`;
}
