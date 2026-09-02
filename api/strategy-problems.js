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
      let q = supabase.from('strategy_problems').select('*').order('total_score', { ascending: false });
      if (req.query && req.query.persona_id) q = q.eq('persona_id', req.query.persona_id);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { persona_id, problem, intensity, repeatability, scale } = req.body || {};
      if (!persona_id || !problem) return res.status(400).json({ error: 'Missing persona_id/problem' });
      const { data, error } = await supabase
        .from('strategy_problems')
        .insert([{
          persona_id, problem,
          intensity: clampScore(intensity), repeatability: clampScore(repeatability), scale: clampScore(scale)
        }])
        .select();
      if (error) throw error;
      return res.status(200).json(data[0]);
    }

    if (req.method === 'PUT') {
      const { id, ...fields } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Missing id' });
      if (fields.intensity !== undefined) fields.intensity = clampScore(fields.intensity);
      if (fields.repeatability !== undefined) fields.repeatability = clampScore(fields.repeatability);
      if (fields.scale !== undefined) fields.scale = clampScore(fields.scale);
      const { data, error } = await supabase.from('strategy_problems').update(fields).eq('id', id).select();
      if (error) throw error;
      return res.status(200).json(data[0]);
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { error } = await supabase.from('strategy_problems').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ deleted: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function clampScore(v) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return 1;
  return Math.min(10, Math.max(1, n));
}
