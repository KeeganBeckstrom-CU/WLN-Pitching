// Sends a phone notification for each new announcement a coach posted with "send a notification" checked.
import webpush from 'web-push';
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const { VAPID_PRIVATE } = process.env;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uppnclgtqhfawmoahfrv.supabase.co';
const PAGE = 'index%20WLN.html';
const VAPID_PUBLIC = 'BEuAvnEHuSsSpq3n1m63YwofWfNv_S--aQ57pMRvNRH__56iUYRPzqLIic5uJUt9gsA-_CN_FjLnz1lR2PAf51c';
if (!SUPABASE_SERVICE_KEY || !VAPID_PRIVATE) { console.log('Secrets not set yet, nothing sent.'); process.exit(0); }
webpush.setVapidDetails('mailto:coach@cleary.edu', VAPID_PUBLIC, VAPID_PRIVATE);
// works with the new sb_secret_ key or the legacy service_role key
const H = { apikey: SUPABASE_SERVICE_KEY, ...(SUPABASE_SERVICE_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } : {}), 'Content-Type': 'application/json' };
const since = new Date(Date.now() - 24 * 3600e3).toISOString();
const q = `${SUPABASE_URL}/rest/v1/announcements?select=id,title,body,author&push=eq.true&pushed_at=is.null&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc`;
const r = await fetch(q, { headers: H });
if (!r.ok) { console.log('Could not read announcements (table missing?):', r.status, await r.text()); process.exit(0); }
const anns = await r.json();
if (!anns.length) { console.log('No new announcements to send.'); process.exit(0); }
const subs = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?select=endpoint,sub`, { headers: H }).then(x => x.ok ? x.json() : []);
for (const a of anns) {
  // claim it first so two runs never double-send
  const claim = await fetch(`${SUPABASE_URL}/rest/v1/announcements?id=eq.${a.id}&pushed_at=is.null`, { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ pushed_at: new Date().toISOString() }) }).then(x => x.json()).catch(() => []);
  if (!claim.length) continue;
  const body = (a.body || '').trim() || `From ${a.author || 'Coach'}. Open the app for details.`;
  const payload = JSON.stringify({ title: `📌 ${a.title}`, body: body.length > 180 ? body.slice(0, 177) + '…' : body, url: `${PAGE}#clubhouse`, tag: `ann-${a.id}` });
  let sent = 0, gone = 0;
  for (const s of subs) {
    try { await webpush.sendNotification(s.sub, payload, { TTL: 24 * 3600, urgency: 'high' }); sent++; }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { gone++; await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'DELETE', headers: H }); }
      else console.error('Send failed', e.statusCode || '', e.body || e.message);
    }
  }
  console.log(`"${a.title}": sent ${sent}, removed ${gone} expired, out of ${subs.length}.`);
}
