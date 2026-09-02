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
      let q = supabase.from('strategy_personas').select('*').order('created_at');
      if (req.query && req.query.brand_id) q = q.eq('brand_id', req.query.brand_id);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { brand_id, name, description, desire } = req.body || {};
      if (!brand_id || !name) return res.status(400).json({ error: 'Missing brand_id/name' });
      const { data, error } = await supabase
        .from('strategy_personas')
        .insert([{ brand_id, name, description: description || null, desire: desire || null }])
        .select();
      if (error) throw error;
      return res.status(200).json(data[0]);
    }

    if (req.method === 'PUT') {
      const { id, ...fields } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { data, error } = await supabase.from('strategy_personas').update(fields).eq('id', id).select();
      if (error) throw error;
      return res.status(200).json(data[0]);
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { error } = await supabase.from('strategy_personas').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ deleted: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
