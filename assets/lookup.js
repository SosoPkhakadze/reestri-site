const button = document.getElementById('run-lookup');
const output = document.getElementById('lookup-results');
const query = document.getElementById('lookup-query');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function safeSource(value) { try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : null; } catch { return null; } }
async function run() {
  const q = query.value.trim();
  if (q.length < 2) { output.textContent = 'Enter a company name or identifier with at least two characters.'; query.focus(); return; }
  button.disabled = true; output.textContent = 'Reading the public register…';
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch('https://api.reestri.io/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q, country: document.getElementById('lookup-country').value }), signal: controller.signal });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.message || 'The lookup is unavailable. Try again later or use the tool on Apify.');
    output.replaceChildren();
    if (!data.records?.length) { output.textContent = 'No records returned. Check the exact identifier or local-script spelling.'; return; }
    for (const record of data.records) {
      const div = document.createElement('div'); div.className = 'lookup-record';
      const title = document.createElement('h3'); title.textContent = record.resultType === 'company' ? record.nameLatin || record.nameLocal : record.resultType === 'not_found' ? 'No exact company match' : 'Source unavailable';
      const text = document.createElement('p'); text.textContent = record.resultType === 'company' ? [record.country, record.companyNumber || record.taxId, record.legalForm, record.status].filter(Boolean).join(' · ') : record.reason || 'Check the exact registered name or company identifier.';
      div.append(title, text);
      const source = safeSource(record.evidence?.sourceUrl);
      if (source) { const a = document.createElement('a'); a.href = source; a.rel = 'nofollow noopener'; a.textContent = 'Official source →'; div.append(a); }
      if (record.evidence?.retrievedAt) { const p = document.createElement('p'); p.className = 'note'; p.textContent = 'Retrieved: ' + record.evidence.retrievedAt; div.append(p); }
      output.append(div);
    }
    const note = document.createElement('p'); note.className = 'note'; note.textContent = data.cached ? 'Cached result, retrieved within the last six hours.' : 'Fetched from the register for this lookup.'; output.append(note);
  } catch (e) { output.textContent = e.name === 'AbortError' ? 'The register took too long to respond. Try again later or use Apify.' : e.message || 'Could not reach the lookup service.'; }
  finally { clearTimeout(timeout); button.disabled = false; }
}
button?.addEventListener('click', run);
query?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
