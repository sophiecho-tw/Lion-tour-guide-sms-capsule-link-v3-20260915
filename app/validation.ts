// Only LINE group invitation paths are permitted; a LINE hostname alone is insufficient.
const LINE_HOSTS = new Set(['line.me', 'lin.ee']);
export function validateMessage(message: string): string[] {
  const errors: string[] = [];
  const urls = Array.from(message.matchAll(/(?:[a-z][a-z\d+.-]*:\/\/|www\.)[^\s\u3000，。；！？、（）()「」『』【】<>\u3400-\u9fff]+|(?:[a-z\d-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#][^\s\u3000，。；！？、（）()「」『』【】<>\u3400-\u9fff]*)?/gi));
  let blocked = false;
  let spacing = false;
  for (const match of urls) {
    const raw = match[0];
    const start = match.index!;
    let url: URL;
    try { url = new URL(raw.includes('://') ? raw : `https://${raw}`); }
    catch { blocked = true; continue; }
    const host = url.hostname.toLowerCase();
    if (!(host === 'line.me' && /^\/(?:R\/)?ti\/g\/[A-Za-z0-9_-]+$/.test(url.pathname) && !url.search && !url.hash) || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) blocked = true;
    if (LINE_HOSTS.has(host)) {
      const before = message[start - 1] ?? '';
      const after = message[start + raw.length] ?? '';
      if (!/^[ \u3000]$/.test(before) || !/^[ \u3000]$/.test(after)) spacing = true;
    }
  }
  if (blocked) errors.push('僅允許 LINE 群組邀請網址，請移除其他網址或更換後重新送出');
  if (spacing) errors.push('LINE 網址前後需保留空格');
  if (!message.includes('雄獅')) errors.push('訊息內容需包含「雄獅」');
  if (message.length > 300) errors.push('訊息內容不可超過 300 字，請縮短後重新送出');
  return errors;
}
