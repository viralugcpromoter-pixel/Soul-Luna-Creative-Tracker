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

function slugify(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function clampScore(v) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return 1;
  return Math.min(10, Math.max(1, n));
}

// All four strategy resources live in one file (routed by ?resource=) so this
// counts as a single Vercel Serverless Function instead of four — the Hobby
// plan caps a deployment at 12 functions total.
export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  const resource = (req.query && req.query.resource) || '';

  try {
    if (resource === 'brands') return await handleBrands(req, res);
    if (resource === 'products') return await handleProducts(req, res);
    if (resource === 'personas') return await handlePersonas(req, res);
    if (resource === 'problems') return await handleProblems(req, res);
    return res.status(400).json({ error: 'Missing or unknown ?resource= (brands|products|personas|problems)' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// ---------- Brands ----------
async function handleBrands(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('brands').select('*').order('name');
    if (error) throw error;
    return res.status(200).json(data);
  }
  if (req.method === 'POST') {
    const { name, website, description } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const id = slugify(name);
    if (!id) return res.status(400).json({ error: 'Invalid brand name' });
    const { data, error } = await supabase
      .from('brands')
      .upsert({ id, name, website: website || null, description: description || null })
      .select();
    if (error) throw error;
    return res.status(200).json(data[0]);
  }
  if (req.method === 'PUT') {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { data, error } = await supabase.from('brands').update(fields).eq('id', id).select();
    if (error) throw error;
    return res.status(200).json(data[0]);
  }
  if (req.method === 'DELETE') {
    const id = (req.query && req.query.id) || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ deleted: true });
  }
  res.status(405).json({ error: 'Method not allowed' });
}

// ---------- Products ----------
async function handleProducts(req, res) {
  if (req.method === 'GET') {
    let q = supabase.from('strategy_products').select('*').order('created_at');
    if (req.query && req.query.brand_id) q = q.eq('brand_id', req.query.brand_id);
    const { data, error } = await q;
    if (error) throw error;
    return res.status(200).json(data);
  }
  if (req.method === 'POST') {
    const { brand_id, name, details, positioning } = req.body || {};
    if (!brand_id || !name || !positioning) return res.status(400).json({ error: 'Missing brand_id/name/positioning' });
    const { data, error } = await supabase
      .from('strategy_products')
      .insert([{ brand_id, name, details: details || null, positioning }])
      .select();
    if (error) throw error;
    return res.status(200).json(data[0]);
  }
  if (req.method === 'PUT') {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { data, error } = await supabase.from('strategy_products').update(fields).eq('id', id).select();
    if (error) throw error;
    return res.status(200).json(data[0]);
  }
  if (req.method === 'DELETE') {
    const id = (req.query && req.query.id) || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabase.from('strategy_products').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ deleted: true });
  }
  res.status(405).json({ error: 'Method not allowed' });
}

// ---------- Personas ----------
async function handlePersonas(req, res) {
  if (req.method === 'GET') {
    let q = supabase.from('strategy_personas').select('*').order('created_at');
    if (req.query && req.query.brand_id) q = q.eq('brand_id', req.query.brand_id);
    const { data, error } = await q;
    if (error) throw error;
    return res.status(200).json(data);
  }
  if (req.method === 'POST') {
    const { brand_id, name, description, desire, market_awareness, market_sophistication } = req.body || {};
    if (!brand_id || !name) return res.status(400).json({ error: 'Missing brand_id/name' });
    const { data, error } = await supabase
      .from('strategy_personas')
      .insert([{ brand_id, name, description: description || null, desire: desire || null, market_awareness: market_awareness || null, market_sophistication: market_sophistication || null }])
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
}

// ---------- Problems ----------
async function handleProblems(req, res) {
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
      .insert([{ persona_id, problem, intensity: clampScore(intensity), repeatability: clampScore(repeatability), scale: clampScore(scale) }])
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
}
