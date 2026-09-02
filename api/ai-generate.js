function checkAuth(req, res) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// Model string per Anthropic's current lineup — check docs.claude.com/en/docs/about-claude/models
// if this ever 404s (model names change over time).
const MODEL = 'claude-sonnet-5';

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const {
    mode, // 'headline' | 'ad_copy' | 'both'
    productName, positioning, personaName, personaDescription, desire,
    problem, marketAwareness, marketSophistication, hypothesis,
    typeOfAd, hookPatterns, typeOfHeadline
  } = req.body || {};

  if (!positioning || !problem) {
    return res.status(400).json({ error: 'Missing positioning/problem — fill in Product and Problem first.' });
  }

  const context = `
Brand product: ${productName || '—'}
Positioning: ${positioning}
Persona: ${personaName || '—'} — ${personaDescription || ''}
Core desire: ${desire || '—'}
Problem being addressed: ${problem}
Market awareness stage: ${marketAwareness || '—'}
Market sophistication stage: ${marketSophistication || '—'}
Hypothesis (why we're testing this): ${hypothesis || '—'}
Type of ad: ${typeOfAd || '—'}
Hook pattern(s) to use: ${(hookPatterns || []).join(', ') || '—'}
Type of headline formula: ${typeOfHeadline || '—'}
`.trim();

  const wantHeadlines = mode !== 'ad_copy';
  const wantCopy = mode !== 'headline';

  const system = `You write Facebook ad headlines and ad copy for a Philippine aesthetics/wellness clinic marketing agency. The audience is Filipino, so default to natural Taglish (Tagalog-English code-switching) unless the brand context implies pure English. Stay strictly inside the given Positioning, Problem, and Hook Pattern — do not invent claims, prices, or guarantees the positioning doesn't support. Respond with ONLY valid JSON, no markdown fences, no preamble, matching this shape:
{"headlines": ["...", "...", "..."], "ad_copy": "..."}
${wantHeadlines ? 'Provide 4-5 distinct headline options that follow the Type of Headline formula and Hook Pattern(s) given.' : 'Return an empty array for headlines.'}
${wantCopy ? 'Provide one ad_copy draft (2-4 short paragraphs, FB-ad length, ending with a soft CTA).' : 'Return an empty string for ad_copy.'}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system,
        messages: [{ role: 'user', content: context }]
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || 'Claude API error' });

    const text = (data.content || []).map((b) => b.text || '').join('').trim();
    const cleaned = text.replace(/^```json\s*|^```\s*|```$/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch { return res.status(502).json({ error: 'Could not parse AI response', raw: text }); }

    res.status(200).json({
      headlines: Array.isArray(parsed.headlines) ? parsed.headlines : [],
      ad_copy: typeof parsed.ad_copy === 'string' ? parsed.ad_copy : ''
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
