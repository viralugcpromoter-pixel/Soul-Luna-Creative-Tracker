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

  const { page } = req.body || {};
  if (!page) return res.status(400).json({ error: 'Missing page (ad account id)' });

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_ACCESS_TOKEN not configured' });

  try {
    const url = `https://graph.facebook.com/v21.0/${page}/ads?fields=id,name,effective_status&limit=50&access_token=${token}`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const ads = (data.data || []).map((a) => ({
      ad_id: a.id,
      ad_name: a.name,
      status: a.effective_status,
    }));
    res.status(200).json({ ads });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
