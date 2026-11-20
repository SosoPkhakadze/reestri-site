import { inquiryPayload } from './request-model.js';
const $ = q => document.querySelector(q);
const form = $('#simple-request-form');
const params = new URLSearchParams(location.search);
const live = /^(www\.)?reestri\.io$/.test(location.hostname);
const local = ['localhost', '127.0.0.1'].includes(location.hostname) && params.get('test') === '1';
const api = local ? '/__dev/order' : live ? 'https://api.reestri.io/order' : 'https://reestri-desk-test.soso-pkhakadze-dev.workers.dev/order';
const sitekey = live ? '0x4AAAAAAGKS3j4B0BufS7J-' : '1x00000000000000000000AA';
const mode = params.get('mode') === 'note' ? 'note' : 'inquiry';
let sending = false, widget = null;
const el = name => form.elements.namedItem(name);
if (['AM', 'GE'].includes(params.get('country'))) el('country').value = params.get('country');
el('companyList').value = (params.get('company') || '').slice(0, 3400);
if (params.get('describe') === '1') $('#needs-details').open = true;
if (mode === 'note') {
  $('#request-title').textContent = 'Ask for a free first note.';
  $('#request-intro').textContent = 'One company, for a firm new to Reestri. Soso reviews what the public registers show.';
  $('#company-hint').textContent = 'One company only. Paid official documents are quoted separately.';
  $('#send-request').textContent = 'Ask for the free note';
  $('#deadline-field').hidden = true;
}
const errorBox = $('#form-error');
function showError(message, target) {
  errorBox.textContent = message; errorBox.hidden = false;
  if (target) { const disclosure = target.closest('details'); if (disclosure) disclosure.open = true; target.setAttribute('aria-invalid', 'true'); target.focus(); }
  else errorBox.focus();
  errorBox.scrollIntoView({ block: 'nearest' });
}
form.addEventListener('input', e => { e.target.removeAttribute('aria-invalid'); errorBox.hidden = true; });
if (local) {
  const banner = document.createElement('p'); banner.className = 'local-test-banner'; banner.textContent = 'Local preview. No request, email or attachment leaves this computer.';
  $('#request-layout').before(banner);
} else {
  window.onSimpleTurnstile = () => {
    widget = window.turnstile.render('#turnstile', { sitekey, theme: 'light', size: 'flexible', appearance: 'interaction-only',
      'error-callback': () => { errorBox.textContent = 'The security check could not finish. Try again or email soso@reestri.io.'; errorBox.hidden = false; },
      'expired-callback': () => window.turnstile.reset(widget) });
  };
  const script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onSimpleTurnstile&render=explicit'; script.async = true; script.defer = true;
  script.onerror = () => { errorBox.textContent = 'The security check could not load. You can email your request to soso@reestri.io.'; errorBox.hidden = false; };
  document.head.append(script);
}
form.addEventListener('submit', async e => {
  e.preventDefault(); if (sending) return;
  errorBox.hidden = true;
  const values = { mode, country: el('country').value, consent: el('consent').checked };
  for (const name of ['companyList','email','notes','contact','firm','deadline','website']) values[name] = el(name).value.trim();
  const file = el('nda').files[0];
  const payload = inquiryPayload(values, local ? 'local-preview' : widget !== null ? window.turnstile?.getResponse(widget) || '' : '', file);
  if (payload.error) {
    const target = /company|companies|characters/.test(payload.error) ? el('companyList') : /email/.test(payload.error) ? el('email') : /agree/.test(payload.error) ? el('consent') : null;
    showError(payload.error, target); return;
  }
  if (file && (file.size > 5*1024*1024 || !/\.(pdf|docx?)$/i.test(file.name))) { showError('Use a PDF or Word attachment up to 5 MB.', el('nda')); return; }
  if (!payload.fd.get('turnstile')) { showError('The security check has not finished. Wait a moment, then send again. You can also email soso@reestri.io.'); return; }
  sending = true; form.setAttribute('aria-busy', 'true');
  const button = $('#send-request'), original = button.textContent;
  button.disabled = true; button.textContent = 'Sending request…';
  try {
    const response = await fetch(api, { method: 'POST', body: payload.fd });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.id) throw new Error(result.message || 'The request could not be saved.');
    $('#request-layout').hidden = true; $('#request-done').hidden = false;
    $('#done-reference').textContent = 'Reference: ' + result.id;
    $('#done-confirmation').textContent = local ? 'Local preview only. No request or email was sent.' : result.confirmationStatus === 'unavailable' ? 'Your request is saved. Soso will reply to ' + payload.email + '. An automatic confirmation is unavailable, so please keep this reference.' : 'Reestri will email a confirmation to ' + payload.email + ' from orders@reestri.io.';
    if (mode === 'note') { $('#done-title').textContent = 'Free-note request received.'; $('#done-next').textContent = 'Soso will review what the public registers show and reply personally. Paid official documents are quoted separately.'; }
    const summary = $('#done-summary');
    for (const text of [values.country === 'AM' ? 'Armenia' : 'Georgia', payload.companies.map(c => c.name).join('\n'), payload.email, values.notes, values.deadline ? 'Requested deadline: ' + values.deadline : '', file ? 'Attachment: ' + file.name : '']) {
      if (!text) continue; const p = document.createElement('p'); p.textContent = text; summary.append(p);
    }
    $('#receipt-email').href = 'mailto:soso@reestri.io?subject=' + encodeURIComponent('Records request ' + result.id);
    $('#request-done').focus(); $('#request-done').scrollIntoView({ block: 'start' });
    if (live) try { navigator.sendBeacon('https://api.reestri.io/hit', JSON.stringify({p:'/records/sent/'+mode,r:''})); } catch {}
  } catch (err) {
    showError((err.message === 'Failed to fetch' ? 'We could not confirm receipt. Check your connection and your inbox before resending.' : err.message) + ' Your details are still here. You can also email soso@reestri.io.');
    if (!local && widget !== null) window.turnstile?.reset(widget);
  } finally { sending = false; form.removeAttribute('aria-busy'); button.disabled = false; button.textContent = original; }
});
