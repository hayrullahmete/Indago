const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 50001;
const ROOT = __dirname;
const SOURCES = path.join(ROOT, 'sources.json');
const LOCAL_CONFIG = path.join(ROOT, 'local.config.json');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

function decode(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&(?:amp|#38);/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function tag(block, name) {
  const escaped = name.replace(':', '(?::)?');
  const match = block.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  if (match) return decode(match[1]).trim();
  const attr = block.match(new RegExp(`<${escaped}\\b[^>]*\\b(?:href|url)=["']([^"']+)["']`, 'i'));
  return attr ? decode(attr[1]).trim() : '';
}

function parseFeed(xml, source) {
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => m[2]);
  return blocks.map(block => {
    const link = tag(block, 'link');
    const date = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'date');
    const rawTitle = tag(block, 'title');
    const title = rawTitle.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const summary = tag(block, 'description') || tag(block, 'summary') || tag(block, 'content:encoded') || tag(block, 'content');
    const embeddedImage = (summary.match(/<img\b[^>]*\b(?:src|data-src)=["']([^"']+)/i) || [])[1] || '';
    const mediaImage = (block.match(/<(?:media:content|media:thumbnail|thumbnail)\b[^>]*\burl=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
    const enclosureImage = (block.match(/<enclosure\b(?=[^>]*\btype=["']image\/)[^>]*\burl=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
    const atomImage = (block.match(/<link\b(?=[^>]*\brel=["']enclosure["'])(?=[^>]*\btype=["']image\/)[^>]*\bhref=["']([^"']+)["'][^>]*>/i) || [])[1] || '';
    const image = decode(embeddedImage || mediaImage || enclosureImage || atomImage || '').trim();
    const content = summary.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&(?:nbsp|#160);/gi, ' ').replace(/\s+/g, ' ').trim();
    const parsedDate = Date.parse(date);
    return { title, link, date: Number.isNaN(parsedDate) ? null : new Date(parsedDate).toISOString(), description: content.slice(0, 280), content: content.slice(0, 12000), image, source: source.name };
  }).filter(item => item.title && item.link && item.date);
}

function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;
  if (pathname === '/api/news') {
    try {
      const requestedLimit = Number(requestUrl.searchParams.get('limit'));
      const limit = [5, 10, 15, 20].includes(requestedLimit) ? requestedLimit : 5;
      const sources = JSON.parse(await fs.readFile(SOURCES, 'utf8'));
      const results = await Promise.all(sources.map(async source => {
        try {
          const response = await fetch(source.url, { headers: { 'User-Agent': 'Indago/1.0 RSS reader (+local app)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(10000) });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const xml = await response.text();
          return { items: parseFeed(xml, source), error: null };
        } catch (error) { return { items: [], error: error.message }; }
      }));
      const items = results.flatMap(result => result.items).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, limit);
      const failed = results.filter(result => result.error).length;
      send(res, 200, { items, limit, sources: sources.map(source => source.name), sourceCount: sources.length, failedCount: failed, updatedAt: new Date().toISOString() });
    } catch (error) { send(res, 500, { error: 'Haber kaynakları okunamadı.', detail: error.message }); }
    return;
  }

  if (pathname === '/api/summarize' && req.method === 'POST') {
    let requestLanguage = 'tr';
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 20000) throw new Error('İstek içeriği çok uzun.');
      }
      const { title, content, provider = 'ollama', language = 'tr' } = JSON.parse(body || '{}');
      requestLanguage = language === 'en' ? 'en' : 'tr';
      const messages = requestLanguage === 'en'
        ? { missing: 'No story content was provided to summarize.', provider: 'Unknown AI provider.', noKey: 'OpenAI API key is not configured. Add it to openaiApiKey in local.config.json.', unavailable: 'Could not connect to the AI provider. Check Ollama or your internet connection.', failed: 'Could not create the story summary.' }
        : { missing: 'Özetlenecek haber içeriği bulunamadı.', provider: 'Bilinmeyen AI sağlayıcısı.', noKey: 'OpenAI API anahtarı ayarlı değil. local.config.json içindeki openaiApiKey alanını doldurun.', unavailable: 'AI sağlayıcısına bağlanılamadı. Ollama veya internet bağlantısını kontrol edin.', failed: 'Haber özeti oluşturulamadı.' };
      if (typeof title !== 'string' || typeof content !== 'string' || !content.trim()) {
        return send(res, 400, { error: messages.missing });
      }
      if (!['ollama', 'openai'].includes(provider)) return send(res, 400, { error: messages.provider });
      const prompt = `${requestLanguage === 'en' ? 'Title' : 'Başlık'}: ${title.slice(0, 500)}\n\n${requestLanguage === 'en' ? 'Story content' : 'Haber içeriği'}:\n${content.slice(0, 12000)}`;
      const instructions = requestLanguage === 'en'
        ? 'Reply in English. Summarize the story in 3–5 concise bullet points using only information in the text. Do not add opinions or invent facts.'
        : 'Türkçe yanıt ver. Haber metnini 3-5 kısa maddeyle, yalnızca metinde bulunan bilgilere dayanarak özetle. Yorum veya bilgi uydurma.';
      let summary;
      let model;
      if (provider === 'openai') {
        let config = {};
        try { config = JSON.parse(await fs.readFile(LOCAL_CONFIG, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        const apiKey = process.env.OPENAI_API_KEY || config.openaiApiKey;
        if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
          return send(res, 503, { error: messages.noKey });
        }
        model = process.env.OPENAI_MODEL || config.openaiModel || 'gpt-4o-mini';
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            instructions,
            input: prompt,
            max_output_tokens: 500
          }),
          signal: AbortSignal.timeout(120000)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || `OpenAI HTTP ${response.status}`);
        summary = result.output_text || result.output?.flatMap(item => item.content || []).map(item => item.text || '').join('\n').trim();
      } else {
        const ollamaUrl = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
        model = process.env.OLLAMA_MODEL || 'qwen3.8:latest';
        const response = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            stream: false,
            messages: [
              { role: 'system', content: instructions },
              { role: 'user', content: prompt }
            ],
            options: { temperature: 0.3 }
          }),
          signal: AbortSignal.timeout(120000)
        });
        if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
        const result = await response.json();
        summary = result.message?.content?.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      }
      if (!summary) throw new Error('Model boş yanıt verdi.');
      send(res, 200, { summary, model, provider });
    } catch (error) {
      const unavailable = error.cause?.code === 'ECONNREFUSED' || error.name === 'TimeoutError' || error.message.includes('fetch failed');
      const messages = requestLanguage === 'en'
        ? { unavailable: 'Could not connect to the AI provider. Check Ollama or your internet connection.', failed: 'Could not create the story summary.' }
        : { unavailable: 'AI sağlayıcısına bağlanılamadı. Ollama veya internet bağlantısını kontrol edin.', failed: 'Haber özeti oluşturulamadı.' };
      send(res, unavailable ? 503 : 502, { error: unavailable ? messages.unavailable : messages.failed, detail: error.message });
    }
    return;
  }

  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.resolve(ROOT, relative);
  if (file === LOCAL_CONFIG) return send(res, 404, { error: 'Not found' });
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, { error: 'Forbidden' });
  try {
    const content = await fs.readFile(file);
    const type = MIME[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  }
  catch { send(res, 404, { error: 'Not found' }); }
});

server.listen(PORT, () => console.log(`Indago hazır: http://localhost:${PORT}`));
