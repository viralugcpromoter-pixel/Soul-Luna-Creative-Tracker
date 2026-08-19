import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function checkAuth(req, res) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { title, type, url, added_by } = req.body || {};
      if (!title || !url) return res.status(400).json({ error: 'Missing title/url' });
      const { data, error } = await supabase
        .from('assets')
        .insert([{ title, type: type || 'other', url, added_by: added_by || null }])
        .select();
      if (error) throw error;
      return res.status(200).json(data[0]);
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ deleted: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
