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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { page, adId, adName } = req.body || {};
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_ACCESS_TOKEN not configured' });

  try {
    let targetId = adId;

    // No exact ad ID on file (manual entry) — try to find the closest name match first.
    if (!targetId && adName && page) {
      const listUrl = `https://graph.facebook.com/v21.0/${page}/ads?fields=id,name&limit=100&access_token=${token}`;
      const lr = await fetch(listUrl);
      const ldata = await lr.json();
      if (ldata.error) return res.status(400).json({ error: ldata.error.message });
      const match = (ldata.data || []).find((a) =>
        (a.name || '').toLowerCase().includes((adName || '').toLowerCase())
      );
      if (match) targetId = match.id;
    }

    if (!targetId) return res.status(200).json({ found: false });

    const insightsUrl = `https://graph.facebook.com/v21.0/${targetId}/insights?fields=spend,impressions,clicks,ctr,actions&date_preset=last_30d&access_token=${token}`;
    const ir = await fetch(insightsUrl);
    const idata = await ir.json();
    if (idata.error) return res.status(400).json({ error: idata.error.message });

    const row = (idata.data || [])[0];
    if (!row) return res.status(200).json({ found: false });

    res.status(200).json({
      found: true,
      spend: row.spend,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      actions: row.actions || [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
