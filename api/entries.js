import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getRole(req) {
  const token = req.headers['x-admin-token'];
  if (token && process.env.ADMIN_PASSWORD && token === process.env.ADMIN_PASSWORD) return 'admin';
  if (token && process.env.EDITOR_PASSWORD && token === process.env.EDITOR_PASSWORD) return 'editor';
  return null;
}

function checkAuth(req, res) {
  const role = getRole(req);
  if (!role) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// Fields an editor-role login is allowed to change. Everyone else (admin)
// can change anything. Editors are content contributors, not content
// owners — they can tag entries but not touch the details, per team policy.
const EDITOR_ALLOWED_FIELDS = ['tags'];

const TRACKED_FIELDS = ['editing_started', 'editing_done', 'launched', 'winner_status', 'page'];
const LABELS = {
  editing_started: 'Editing in progress',
  editing_done: 'Editing done',
  launched: 'Launched',
  winner_status: 'Status',
  page: 'Page assigned'
};

function describe(field, from, to) {
  if (field === 'editing_started' || field === 'editing_done' || field === 'launched') {
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
  const role = getRole(req);
  try {
    if (req.method === 'GET') {
      const { id } = req.query || {};
      if (id) {
        const { data, error } = await supabase
          .from('creatives')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }
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
      const { id, expected_updated_at, ...fields } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Missing id' });

      if (role === 'editor') {
        const disallowed = Object.keys(fields).filter((f) => !EDITOR_ALLOWED_FIELDS.includes(f));
        if (disallowed.length) {
          return res.status(403).json({ error: 'Editor accounts can only update tags, not the entry details.' });
        }
      }

      const { data: current, error: fetchErr } = await supabase
        .from('creatives')
        .select('editing_started,editing_done,launched,winner_status,page,history,updated_at')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;

      // Optimistic concurrency check: if the caller tells us what updated_at
      // it expected (captured when its edit form was opened) and the row has
      // since changed, refuse the write instead of silently overwriting
      // someone else's newer edit (e.g. a script someone just added).
      if (
        expected_updated_at &&
        current.updated_at &&
        new Date(expected_updated_at).getTime() !== new Date(current.updated_at).getTime()
      ) {
        return res.status(409).json({
          error: 'conflict',
          message: 'This entry was updated by someone else in the meantime. Refresh and try again so you don\'t overwrite their changes.'
        });
      }

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
      fields.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('creatives')
        .update(fields)
        .eq('id', id)
        .select();
      if (error) throw error;
      return res.status(200).json(data[0]);
    }

    if (req.method === 'DELETE') {
      if (role === 'editor') {
        return res.status(403).json({ error: 'Editor accounts cannot delete entries.' });
      }
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
