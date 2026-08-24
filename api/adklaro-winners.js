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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const baseUrl = process.env.ADKLARO_API_URL;
  if (!baseUrl) {
    // Scaffold is ready — just no connection details yet from Ad-Klaro's side.
    return res.status(200).json({ configured: false, creatives: [] });
  }

  try {
    const account = req.query.account || '';
    const url = baseUrl + (account ? (baseUrl.includes('?') ? '&' : '?') + 'account=' + encodeURIComponent(account) : '');
    const headers = {};
    if (process.env.ADKLARO_API_KEY) headers['Authorization'] = 'Bearer ' + process.env.ADKLARO_API_KEY;

    const r = await fetch(url, { headers });
    if (!r.ok) {
      return res.status(200).json({ configured: true, error: 'Ad-Klaro returned ' + r.status, creatives: [] });
    }
    const data = await r.json();
    const creatives = Array.isArray(data) ? data : (data.creatives || data.data || []);
    return res.status(200).json({ configured: true, creatives });
  } catch (e) {
    return res.status(200).json({ configured: true, error: e.message, creatives: [] });
  }
}
