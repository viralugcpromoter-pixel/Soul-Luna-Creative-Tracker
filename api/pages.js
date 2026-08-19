import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Starting set — edit freely, or just add more from the app itself once deployed.
const BASE_PAGES = {
  act_489797123282000: 'Cosmetic Cocoon — Messaging',
  act_533836145607020: 'Cosmetic Cocoon — Lead',
  act_1045439867619481: 'Cosmetic Cocoon — Cocoon 2',
  act_653049897306859: 'Cosmetic Cocoon — Cocoon 3',
};

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('pages').select('*');
      if (error) throw error;
      const custom = {};
      (data || []).forEach((p) => { custom[p.id] = p.label; });
      return res.status(200).json({
        pages: { ...BASE_PAGES, ...custom },
        customIds: Object.keys(custom)
      });
    }

    if (req.method === 'POST') {
      const { id, label } = req.body || {};
      if (!id || !label) return res.status(400).json({ error: 'Missing id/label' });
      const { error } = await supabase.from('pages').upsert({ id, label });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      if (Object.prototype.hasOwnProperty.call(BASE_PAGES, id)) {
        return res.status(400).json({ error: 'Cannot remove a built-in page' });
      }
      const { error } = await supabase.from('pages').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ deleted: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
