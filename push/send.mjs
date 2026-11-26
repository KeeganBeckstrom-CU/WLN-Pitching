// Sends the 9:00 AM (Michigan time) reminder to every pitcher who turned it on.
import webpush from 'web-push';
const { SUPABASE_SERVICE_KEY, VAPID_PRIVATE, SCHEDULE = '', FORCE = '' } = process.env;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uppnclgtqhfawmoahfrv.supabase.co';
const VAPID_PUBLIC = process.env.VAPID_PUBLIC || 'BEuAvnEHuSsSpq3n1m63YwofWfNv_S--aQ57pMRvNRH__56iUYRPzqLIic5uJUt9gsA-_CN_FjLnz1lR2PAf51c';
if (!SUPABASE_SERVICE_KEY || !VAPID_PRIVATE) { console.log('Secrets not set yet, nothing sent.'); process.exit(0); }

// Two runs are scheduled (12:45 and 13:45 UTC). Only the one that lands just before 9 AM in Michigan sends,
// so it stays at 7 AM through daylight saving changes even if GitHub starts the run a few minutes late.
const now = new Date();
const detHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', hour: 'numeric', hourCycle: 'h23' }).format(now));
const offset = ((detHour - now.getUTCHours()) + 24) % 24 - 24;          // -4 in summer, -5 in winter
const want = offset === -4 ? '45 12 * * *' : '45 13 * * *';
if (!FORCE && SCHEDULE && SCHEDULE !== want) { console.log(`Skipping ${SCHEDULE}; today's send is the ${want} run.`); process.exit(0); }

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); // YYYY-MM-DD
if (today < '2026-11-27') { console.log('Reminders start Friday, Nov 27. Nothing sent.'); process.exit(0); }
const md = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Detroit', month: '2-digit', day: '2-digit' }).format(now); // MM-DD
const dow = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', weekday: 'long' }).format(now);
const lines = [
  "Today's throwing work is ready. Get it in and log it.",
  'Arm care first, then your throwing work. Log it when you finish.',
  'New day, new work. Open the Clubhouse and see what is on the plan.',
  'Get your work in early. Log it so the staff can see it.',
];
let body = lines[now.getUTCDate() % lines.length];
if (dow === 'Monday') body = 'New week. Check your plan in the Clubhouse and get your first day in.';
if (md === '11-27') body = 'Hope you ate well yesterday 🦃 Time to get back to work. Open the Clubhouse and get your throwing in.';

webpush.setVapidDetails('mailto:coach@cleary.edu', VAPID_PUBLIC, VAPID_PRIVATE);
const H = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
const ts = await fetch(`${SUPABASE_URL}/rest/v1/team_settings?id=eq.main&select=data`, { headers: H }).then(r => r.ok ? r.json() : []).catch(() => []);
if (ts[0] && ts[0].data && ts[0].data.push_on === false) { console.log("Coach's Cheats: MORNING_REMINDER_9AM is off. Nothing sent."); process.exit(0); }
const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?select=endpoint,name,sub`, { headers: H });
if (!res.ok) { console.error('Could not read push_subs:', res.status, await res.text()); process.exit(1); }
const subs = await res.json();
let sent = 0, gone = 0, failed = 0;
for (const s of subs) {
  const first = String(s.name || '').trim().split(/\s+/)[0];
  const payload = JSON.stringify({ title: first ? `☀️ Morning, ${first}` : '☀️ Morning, Knight', body, url: 'index%20WLN.html#daily-work', tag: 'cleary-morning' });
  try {
    await webpush.sendNotification(s.sub, payload, { TTL: 3 * 3600, urgency: 'high', topic: 'cleary-morning' });
    sent++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      gone++;
      await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'DELETE', headers: H });
    } else { failed++; console.error('Send failed', e.statusCode || '', e.body || e.message); }
  }
}
console.log(`Sent ${sent}, removed ${gone} expired, ${failed} failed, out of ${subs.length}.`);
