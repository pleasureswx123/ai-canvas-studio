function topTerms(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 2);
  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

export async function handleTextRoute(req, res, url, body, send) {
  if (req.method === 'POST' && url.pathname === '/api/text-analyze') {
    const text = String(body?.text || '').trim();
    if (!text) throw new Error('Text cannot be empty');
    const sentences = text.split(/[。！？.!?]\s*/).filter(Boolean);
    const summary = sentences.slice(0, 2).join('。').slice(0, 220) || text.slice(0, 220);
    send(res, 200, {
      summary,
      keywords: topTerms(text),
      stats: {
        characters: text.length,
        sentences: sentences.length || 1,
      },
    });
    return true;
  }
  return false;
}
