// Shared auth check — imported by other /api files, not itself a route
// (files starting with _ are excluded from Vercel's routing).
export function checkAuth(req, res) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
