import { activeCompanies, companyError, scopeError, estimate, DOC_LABELS, appendRequestFields } from './order-model.js';
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const form = $('#request-form');
const params = new URLSearchParams(location.search);
const live = /^(www\.)?reestri\.io$/.test(location.hostname);
const localTest = ['localhost', '127.0.0.1'].includes(location.hostname) && params.get('test') === '1';
const API = localTest ? '/__dev/order' : (live ? 'https://api.reestri.io/order' : 'https://reestri-desk-test.soso-pkhakadze-dev.workers.dev/order');
const SITEKEY = live ? '0x4AAAAAAGKS3j4B0BufS7J-' : '1x00000000000000000000AA';
const state = { mode: params.get('mode') === 'note' ? 'note' : 'order', country: params.get('country') === 'GE' ? 'GE' : 'AM', companies: [{ name: '', number: '', docs: 'pack', court: false }] };
let step = 1, visited = 1, editingReview = false, sending = false, tsId = null;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => 'USD ' + n.toLocaleString('en-US');
const range = (low, high) => money(low) + ' to ' + high.toLocaleString('en-US');
const route = () => state.mode === 'note' ? [1, 3, 4] : [1, 2, 3, 4];
const fields = () => Object.fromEntries(['firm', 'contact', 'email', 'deadline', 'notes', 'website'].map(k => [k, form.elements[k].value.trim()]));
function error(message, target) {
  const box = $('#form-error'); box.textContent = message; box.hidden = false;
  if (target) { target.setAttribute('aria-invalid', 'true'); target.classList.add('invalid'); target.focus(); }
  else { box.tabIndex = -1; box.focus(); }
  box.scrollIntoView({ block: 'nearest' });
  return false;
}
function clearError() { $('#form-error').hidden = true; $$('[aria-invalid]', form).forEach(el => { el.removeAttribute('aria-invalid'); el.classList.remove('invalid'); }); }
function captureCompanies() {
  $$('.company-box', $('#company-inputs')).forEach(box => {
    const c = state.companies[Number(box.dataset.company)];
    c.name = $('.company-name', box).value; c.number = $('.company-number', box).value;
  });
}
function renderCompanies() {
  const list = $('#company-inputs'); list.replaceChildren();
  const selected = state.mode === 'note' ? state.companies.slice(0, 1) : state.companies;
  selected.forEach((c, i) => {
    const box = document.createElement('section'); box.className = 'company-box'; box.dataset.company = i;
    box.innerHTML = '<div class="company-head"><h2>Company ' + (i + 1) + '</h2>' + (selected.length > 1 ? '<button type="button" class="text-button">Remove company ' + (i + 1) + '</button>' : '') + '</div>' +
      '<label class="field">Company name<input class="company-name" id="company-name-' + i + '" maxlength="160" autocomplete="off" value="' + esc(c.name) + '" required></label>' +
      '<label class="field">Registration number or tax ID <span class="optional">(if known)</span><input class="company-number" maxlength="60" autocomplete="off" value="' + esc(c.number) + '"></label>';
    $('button', box)?.addEventListener('click', () => {
      captureCompanies();
      if (c.name.trim() && !confirm('Remove ' + c.name.trim() + ' from this request?')) return;
      state.companies.splice(i, 1); renderCompanies(); renderEstimate(); $('.company-name', list)?.focus();
    });
    list.append(box);
  });
  $('#add-company').hidden = state.mode === 'note' || state.companies.length >= 20;
  $('#company-limit').textContent = state.mode === 'note' ? 'The free first note covers one company. Other entered companies stay available if you switch back to official records.' : state.companies.length >= 20 ? 'You have reached 20 companies. Email Soso for a larger list.' : 'Up to 20 companies, with documents chosen for each.';
}
$('#company-inputs').addEventListener('input', () => { captureCompanies(); renderEstimate(); clearError(); });
$('#add-company').addEventListener('click', () => {
  captureCompanies(); if (state.companies.length >= 20) return;
  state.companies.push({ name: '', number: '', docs: 'pack', court: false }); renderCompanies(); renderEstimate();
  $$('.company-name').at(-1).focus();
});
function renderDocuments() {
  const list = $('#document-inputs'); list.replaceChildren();
  const cs = activeCompanies(state);
  if (state.mode === 'note') return;
  cs.forEach((c, i) => {
    const box = document.createElement('section'); box.className = 'company-box';
    box.innerHTML = '<div class="company-head"><h2>' + esc(c.name || 'Company ' + (i + 1)) + '</h2><button type="button" class="text-button">Change company</button></div><p class="note">' + (state.country === 'AM' ? 'Armenia' : 'Georgia') + (c.number ? ' · ' + esc(c.number) : '') + '</p>';
    $('button', box).addEventListener('click', () => go(1));
    if (state.country === 'GE') {
      box.insertAdjacentHTML('beforeend', '<p><b>Official registry extract + English summary</b></p><p>USD 49, state fee included.</p>');
    } else {
      const group = document.createElement('fieldset'); group.style.cssText = 'border:0;padding:0;margin:0';
      group.innerHTML = '<legend class="sr-only">Documents for ' + esc(c.name) + '</legend>';
      for (const [value, title, desc, price] of [['pack', 'Register pack', 'Official extract and current charter', 350], ['extract', 'Extract only', 'Official State Register extract', 200], ['none', 'Public court-case check only', 'No registry documents', 150]]) {
        const selected = state.companies[i].docs === value || (value === 'pack' && state.companies[i].docs === 'pack_copies');
        const label = document.createElement('label'); label.className = 'choice';
        label.innerHTML = '<input type="radio" name="docs-' + i + '" value="' + value + '"' + (selected ? ' checked' : '') + '><span class="choice-copy"><b>' + title + '</b><small>' + desc + '</small></span><span class="amount">' + money(price) + '</span>';
        $('input', label).addEventListener('change', () => {
          state.companies[i].docs = value;
          if (value === 'none') state.companies[i].court = true;
          renderDocuments(); renderEstimate();
          $('input[value="' + value + '"]', $$('.company-box', list)[i]).focus();
        });
        group.append(label);
      }
      box.append(group);
      if (['pack', 'pack_copies'].includes(state.companies[i].docs)) {
        const copies = document.createElement('label'); copies.className = 'checkbox-line';
        copies.innerHTML = '<input type="checkbox"' + (state.companies[i].docs === 'pack_copies' ? ' checked' : '') + '><span><b>Add registration-file copies, USD 150</b><br><span class="note">Founding documents and the filed changes you name.</span></span>';
        $('input', copies).addEventListener('change', e => { state.companies[i].docs = e.target.checked ? 'pack_copies' : 'pack'; renderEstimate(); });
        box.append(copies);
      }
      if (state.companies[i].docs !== 'none') {
        const court = document.createElement('label'); court.className = 'checkbox-line';
        court.innerHTML = '<input type="checkbox"' + (state.companies[i].court ? ' checked' : '') + '><span><b>Add a public court-case check, USD 150</b><br><span class="note">Published case information and an English summary.</span></span>';
        $('input', court).addEventListener('change', e => { state.companies[i].court = e.target.checked; renderEstimate(); });
        box.append(court);
      }
    }
    list.append(box);
  });
}
function estimateHTML() {
  const e = estimate(state);
  let html = '<div class="estimate-row"><span>Service fee</span><span>' + money(e.fee) + '</span></div>';
  if (state.mode === 'note') return html + '<p class="note">Public-register first note. No official paid documents ordered.</p>';
  if (state.country === 'GE') return html + '<div class="estimate-row total"><span>Total estimate</span><span>' + money(e.fee) + '</span></div><p class="note">State fee included.</p>';
  if (e.fullSets) html += '<div class="estimate-row"><span>Estimated costs' + (e.costsQuoted ? ' for register packs' : '') + '</span><span>' + range(e.costLow, e.costHigh) + '</span></div>';
  if (e.costsQuoted) html += '<p class="note">Other external costs are quoted for the scope selected. A full total will be confirmed in writing.</p>';
  else html += '<div class="estimate-row total"><span>Estimated total</span><span>' + range(e.fee + e.costLow, e.fee + e.costHigh) + '</span></div>';
  return html;
}
function renderEstimate() {
  const e = estimate(state); $('#estimate-count').textContent = e.count + (e.count === 1 ? ' company' : ' companies');
  $('#estimate-content').innerHTML = estimateHTML();
  $('#estimate-note').textContent = state.mode === 'note' ? 'Soso reviews the public result and replies by email.' : 'Final scope, costs, timing and payment terms agreed before any cost.';
  $('#mobile-estimate').innerHTML = estimateHTML() + '<p class="note">Confirmed in writing before any cost.</p>';
  $('#mobile-estimate').hidden = step === 4;
}
function scopeText(c) {
  if (state.mode === 'note') return 'Free first note from public-register information';
  if (state.country === 'GE') return 'Official registry extract + English summary';
  return DOC_LABELS[c.docs] + (c.court && c.docs !== 'none' ? ' + public court-case check' : '');
}
function changeButton(n) { return '<button type="button" class="text-button" data-review-change="' + n + '">Change<span class="sr-only"> ' + ({ 1: 'company details', 2: 'documents', 3: 'contact details' }[n]) + '</span></button>'; }
function renderReview() {
  const v = fields(), file = form.elements.nda.files[0];
  let html = '<section class="review-group"><h2>Company and documents</h2>';
  activeCompanies(state).forEach(c => {
    html += '<dl><div class="summary-row"><dt>' + (state.country === 'AM' ? 'Armenia' : 'Georgia') + '</dt><dd><b>' + esc(c.name) + '</b>' + (c.number ? '<br>' + esc(c.number) : '<br>Identifier not provided') + '</dd><dd>' + changeButton(1) + '</dd></div><div class="summary-row"><dt>Scope</dt><dd>' + esc(scopeText(c)) + '</dd><dd>' + (state.mode === 'order' ? changeButton(2) : '') + '</dd></div></dl>';
  });
  html += '<button class="text-button" type="button" data-review-change="1">' + (state.mode === 'order' ? 'Edit companies or add another' : 'Change company') + '</button></section><section class="review-group"><h2>Your details</h2><dl>';
  for (const [label, value] of [['Firm', v.firm], ['Contact', v.contact], ['Email', v.email], ...(state.mode === 'order' ? [['Deadline', v.deadline || 'Not specified']] : []), ['Notes', v.notes || 'Not provided'], ['NDA', file?.name || 'Not attached']]) {
    html += '<div class="summary-row"><dt>' + label + '</dt><dd>' + esc(value).replace(/\n/g, '<br>') + '</dd><dd>' + changeButton(3) + '</dd></div>';
  }
  html += '</dl></section><div class="aside">' + estimateHTML() + '</div><p class="note" style="margin-top:16px">This is an estimate, not a quote. No paid order is placed by sending this form.</p>';
  $('#review-summary').innerHTML = html;
  $$('[data-review-change]', $('#review-summary')).forEach(b => b.addEventListener('click', () => { editingReview = true; go(Number(b.dataset.reviewChange)); }));
}
function validate(n) {
  if (n === 1) {
    captureCompanies();
    const message = companyError(state);
    if (message) return error(message, $$('.company-name').find(x => x.value.trim().length < 2));
  }
  if (n === 2 && scopeError(state)) return error(scopeError(state));
  if (n === 3) {
    for (const [k, label] of [['firm', 'your firm'], ['contact', 'your name'], ['email', 'your email']]) if (!form.elements[k].value.trim()) return error('Please enter ' + label + '.', form.elements[k]);
    if (!/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[a-z]{2,}$/i.test(form.elements.email.value.trim())) return error('Enter an email address we can reply to.', form.elements.email);
    const nda = form.elements.nda.files[0];
    if (nda && (nda.size > 5 * 1024 * 1024 || !/\.(pdf|docx?)$/i.test(nda.name))) return error('Attach a PDF or Word file up to 5 MB, or email it to Soso instead.', form.elements.nda);
    const deadline = form.elements.deadline;
    if (state.mode === 'order' && deadline.value && !deadline.checkValidity()) return error('Choose a valid deadline that is today or later.', deadline);
  }
  return true;
}
function go(n, focus = true) {
  clearError(); step = n; visited = Math.max(visited, n);
  $$('[data-form-step]').forEach(el => el.hidden = Number(el.dataset.formStep) !== step);
  const steps = route();
  $('#step-label').textContent = 'Step ' + (steps.indexOf(n) + 1) + ' of ' + steps.length;
  $$('#step-nav button').forEach(b => {
    const i = Number(b.dataset.step); b.closest('li').hidden = !steps.includes(i); b.disabled = i > visited;
    if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  $('#previous-step').hidden = n === 1;
  $('#next-step').textContent = n === 4 ? (state.mode === 'note' ? 'Ask for the free note' : 'Send request') : editingReview ? 'Save and review' : 'Continue';
  $('#deadline-field').hidden = state.mode === 'note';
  if (n === 2) renderDocuments();
  if (n === 4) { renderReview(); loadTurnstile(); }
  renderEstimate();
  if (focus) { const heading = $('h1', $('[data-form-step="' + n + '"]')); heading.focus(); heading.scrollIntoView({ block: 'start' }); }
}
$$('#step-nav button').forEach(b => b.addEventListener('click', () => { if (!sending) { captureCompanies(); if (Number(b.dataset.step) > step && !validate(step)) return; go(Number(b.dataset.step)); } }));
$('#previous-step').addEventListener('click', () => { captureCompanies(); editingReview = false; go(route()[route().indexOf(step) - 1]); });
form.addEventListener('change', e => {
  if (e.target.name === 'mode' || e.target.name === 'country') {
    captureCompanies(); state.mode = form.elements.mode.value; state.country = form.elements.country.value;
    renderCompanies(); renderEstimate(); clearError();
  }
});
form.addEventListener('input', clearError);
function loadTurnstile() {
  if (localTest || $('#turnstile-script')) return;
  window.onRecordsTurnstile = () => {
    tsId = window.turnstile.render('#turnstile', { sitekey: SITEKEY, theme: 'light', size: 'flexible', appearance: 'interaction-only',
      'error-callback': () => error('The security check could not load. Try again, or email soso@reestri.io.'),
      'expired-callback': () => { if (tsId !== null) window.turnstile.reset(tsId); } });
  };
  const script = document.createElement('script'); script.id = 'turnstile-script';
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onRecordsTurnstile&render=explicit'; script.async = true; script.defer = true;
  script.onerror = () => error('The security check could not load. Email soso@reestri.io if it keeps failing.');
  document.head.append(script);
}
form.addEventListener('submit', async e => {
  e.preventDefault(); if (sending) return;
  if (!validate(step)) return;
  if (step !== 4) {
    if (editingReview) { if (!validate(1) || !validate(2) || !validate(3)) return; editingReview = false; go(4); }
    else go(route()[route().indexOf(step) + 1]);
    return;
  }
  for (const n of route().filter(i => i !== 4)) if (!validate(n)) { go(n); validate(n); return; }
  if (!form.elements.consent.checked) return error('Please agree to the use of these details to handle this request.', form.elements.consent);
  const token = localTest ? 'local-preview' : (window.turnstile && tsId !== null ? window.turnstile.getResponse(tsId) : '');
  if (!token) return error('The security check has not finished. Please wait a moment and try again.');
  const fd = appendRequestFields(new FormData(), state, { ...fields(), consent: form.elements.consent.checked }, token, form.elements.nda.files[0]);
  sending = true; const button = $('#next-step'); button.disabled = true; button.textContent = 'Sending…';
  try {
    const response = await fetch(API, { method: 'POST', body: fd });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.id) throw new Error(result.message || 'The request could not be sent.');
    const email = fields().email;
    $('#request-layout').hidden = true; $('#request-done').hidden = false;
    $('#done-reference').textContent = 'Reference: ' + result.id;
    $('#done-confirmation').textContent = localTest ? 'Local preview only. No request or email was sent.' : result.confirmationSent ? 'A confirmation is on its way to ' + email + '.' : 'We received your request. Soso will reply to ' + email + '. If a confirmation does not arrive, email Soso with this reference.';
    if (state.mode === 'note') {
      $('#done-title').textContent = 'Free-note request received.';
      $('#done-note').textContent = 'Soso will review what the public registers show and reply by email, usually the same working day. Any paid documents are quoted separately.';
      $('.steps-inline', $('#request-done')).hidden = true;
      $('h2', $('#request-done')).hidden = true;
    }
    $('#done-summary').innerHTML = '<details><summary>Your request summary</summary><div><p><b>' + esc(fields().firm) + '</b><br>' + esc(email) + '</p>' + activeCompanies(state).map(c => '<p><b>' + esc(c.name) + '</b><br>' + esc(scopeText(c)) + '</p>').join('') + estimateHTML() + '</div></details>';
    $('#request-done').focus(); $('#request-done').scrollIntoView({ block: 'start' });
    if (live) try { navigator.sendBeacon('https://api.reestri.io/hit', JSON.stringify({ p: '/records/sent/' + state.mode, r: '' })); } catch {}
  } catch (err) {
    error((err.message === 'Failed to fetch' ? 'Check your connection and try again.' : err.message) + ' If it keeps failing, email soso@reestri.io. Your entered details are still here.');
    if (window.turnstile && tsId !== null) window.turnstile.reset(tsId);
  } finally { sending = false; button.disabled = false; button.textContent = state.mode === 'note' ? 'Ask for the free note' : 'Send request'; }
});
form.elements.mode.value = state.mode; form.elements.country.value = state.country;
const today = new Date(); form.elements.deadline.min = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
if (localTest) { const banner = document.createElement('p'); banner.className = 'success-note'; banner.textContent = 'Local test mode. No request leaves this computer.'; $('#request-layout').before(banner); }
renderCompanies(); go(1, false);
