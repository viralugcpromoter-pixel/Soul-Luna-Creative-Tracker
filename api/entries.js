import { createClient } from '@supabase/supabase-js';
import { checkAuth } from './_auth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TRACKED_FIELDS = ['editing_done', 'launched', 'winner_status', 'page'];
const LABELS = {
  editing_done: 'Editing done',
  launched: 'Launched',
  winner_status: 'Status',
  page: 'Page assigned'
};

function describe(field, from, to) {
  if (field === 'editing_done' || field === 'launched') {
    return `${LABELS[field]}: ${to ? 'yes' : 'no'}`;
  }
  if (field === 'winner_status') {
    return `Status changed to ${to}`;
  }
  if (field === 'page') {
    return `Page set`;
  }
  return `${LABELS[field] || field} updated`;
}

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('creatives')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      body.history = [{ at: new Date().toISOString(), text: 'Logged by ' + (body.submitted_by || 'someone') }];
      const { data, error } = await supabase.from('creatives').insert([body]).select();
      if (error) throw error;
      return res.status(200).json(data[0]);
    }

    if (req.method === 'PUT') {
      const { id, ...fields } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const { data: current, error: fetchErr } = await supabase
        .from('creatives')
        .select('editing_done,launched,winner_status,page,history')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      const history = Array.isArray(current.history) ? [...current.history] : [];
      const now = new Date().toISOString();
      TRACKED_FIELDS.forEach((f) => {
        if (Object.prototype.hasOwnProperty.call(fields, f) && fields[f] !== current[f]) {
          history.push({ at: now, text: describe(f, current[f], fields[f]) });
        }
      });
      if (history.length !== (current.history || []).length) {
        fields.history = history;
      }

      const { data, error } = await supabase
        .from('creatives')
        .update(fields)
        .eq('id', id)
        .select();
      if (error) throw error;
      return res.status(200).json(data[0]);
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { error } = await supabase.from('creatives').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ deleted: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
