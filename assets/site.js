const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const menu = $('#site-menu'), menuToggle = $('#menu-toggle');
let menuTimer;
function setMenu(open) {
  clearTimeout(menuTimer);
  menuToggle.setAttribute('aria-expanded', String(open));
  menu.classList.remove('closing');
  if (open) menu.classList.add('open');
  else if (!matchMedia('(prefers-reduced-motion: reduce)').matches && menu.classList.contains('open')) {
    menu.classList.add('closing');
    menuTimer = setTimeout(() => menu.classList.remove('open', 'closing'), 150);
  } else menu.classList.remove('open');
}
menuToggle?.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  setMenu(open);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
    setMenu(false); menuToggle.focus();
  }
});
$$('[data-tabset]').forEach(group => {
  const buttons = $$(':scope > .tabs > [role=tab]', group);
  const select = button => {
    buttons.forEach(b => { b.setAttribute('aria-selected', String(b === button)); b.tabIndex = b === button ? 0 : -1; });
    $$(':scope > [role=tabpanel]', group).forEach(p => { p.hidden = p.id !== button.getAttribute('aria-controls'); });
  };
  buttons.forEach((b, i) => {
    b.addEventListener('click', () => select(b));
    b.addEventListener('keydown', e => {
      let n;
      if (e.key === 'ArrowRight') n = (i + 1) % buttons.length;
      if (e.key === 'ArrowLeft') n = (i + buttons.length - 1) % buttons.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = buttons.length - 1;
      if (n !== undefined) { e.preventDefault(); select(buttons[n]); buttons[n].focus(); }
    });
  });
  const hash = location.hash.slice(1), target = buttons.find(b => b.getAttribute('aria-controls') === hash);
  if (target) select(target);
});
function openLinkedDetail() {
  const id = location.hash.slice(1);
  const detail = document.getElementById(id);
  if (detail?.tagName === 'DETAILS') detail.open = true;
}
openLinkedDetail();
window.addEventListener('hashchange', openLinkedDetail);
$$('[data-country-selector]').forEach(group => {
  $$('button', group).forEach(button => button.addEventListener('click', () => {
    $$('button', group).forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $$('[data-country-price]').forEach(p => { p.hidden = p.dataset.countryPrice !== button.dataset.country; });
  }));
});
const search = $('#guide-search');
let country = 'all';
function filterGuides() {
  if (!search) return;
  const q = search.value.trim().toLocaleLowerCase();
  let count = 0;
  $$('.guide-row[data-country]').forEach(row => {
    const show = (country === 'all' || row.dataset.country.split(' ').includes(country)) && row.textContent.toLocaleLowerCase().includes(q);
    row.hidden = !show; if (show) count++;
  });
  $('#guide-count').textContent = count + (count === 1 ? ' guide' : ' guides');
  $('#guide-empty').hidden = count > 0;
}
search?.addEventListener('input', filterGuides);
$$('[data-guide-filter]').forEach(b => b.addEventListener('click', () => {
  country = b.dataset.guideFilter;
  $$('[data-guide-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  filterGuides();
}));
filterGuides();

const FAQ = [
  { q: 'Which document should I choose?', terms: 'pack charter extract compare document', a: 'An Armenian register pack includes the official extract and current charter. Choose extract only for the official company extract on its own. Registration-file copies add the particular founding documents or filed changes you name. Georgia currently offers the official company extract with an English summary.', links: [['Compare documents and fees', '/pricing/'], ['Start a request', '/records/']] },
  { q: 'What are the fees and extra costs?', terms: 'price money cost payment quote', a: 'The Armenian register pack is USD 350 in service fees. Official and local costs are additional, at cost with receipts; the full Armenian set usually adds about USD 100 to 135 per company. A Georgian extract is USD 49 with the state fee included. You approve the written quote and cost cap before any spend.', links: [['See all prices', '/pricing/']] },
  { q: 'When do I pay?', terms: 'deposit advance invoice transfer credit pay', a: 'There is no payment when you send a request. We agree payment terms with your quote. Small new-client orders are paid upfront. Larger matters normally require 50% of the service fee plus approved external costs before work, with the remaining service fee before final delivery. Established clients may have separately agreed invoice terms.', links: [['Payment and costs', '/pricing/#payment']] },
  { q: 'How long will the records take?', terms: 'deadline delivery time urgent working day', a: 'We usually reply to requests the same working day, Georgia time. Georgian extracts normally take one working day. Armenian extracts are usually available the same or next working day after filing. Charters and file copies depend on the Register: often 1 to 2 working days with an available expedited service, or up to 7 without. We confirm timing in your quote; expedited processing is not guaranteed.', links: [['Timing and scope', '/pricing/#delivery']] },
  { q: 'Can I get an Armenian shareholder list?', terms: 'owner beneficial cjsc ojsc shareholder shares', a: 'The Armenian State Register does not hold shareholder lists for CJSCs and OJSCs. The Central Depository limits access to the company or its shareholders. Public beneficial-owner declarations may be available, but they are not a complete shareholder register.', links: [['Coverage and limits', '/coverage/'], ['Read the ownership guide', '/guides/armenia-beneficial-owners/']] },
  { q: 'What is the free first note?', terms: 'free trial sample initial note', a: 'For the first company of a new firm, we check what the public registers already show. Depending on the country and available sources, that can include status, declared beneficial owners or state contracts. Soso reviews the result and replies by email. It does not include ordering official paid documents.', links: [['Ask for a free first note', '/records/?mode=note']] },
  { q: 'Can I send several companies or both countries?', terms: 'batch twenty 20 list multiple countries', a: 'One request can include up to 20 companies in the same country, with documents chosen for each. Please send separate requests for Armenia and Georgia. Email Soso for a larger list or an unusual scope.', links: [['Start a request', '/records/'], ['Contact Soso', 'mailto:soso@reestri.io']] },
  { q: 'Can I attach our NDA?', terms: 'confidential privacy upload agreement nda data', a: 'Yes. The request form accepts an optional PDF or Word NDA, up to 5 MB. We confirm any agreement separately; uploading it does not mean it has been signed or accepted. Attached NDAs are removed from the order store after 90 days. Request details are kept there for 24 months.', links: [['Request privacy information', '/privacy/'], ['Start a request', '/records/']] },
  { q: 'Do I need an account?', terms: 'registration register login password account sign in', a: 'No. You can browse fees and guides and send your first request without creating an account. We send your reference and next steps by email. For an existing request, reply to that confirmation email.', links: [['Find your request', '/requests/'], ['Start a request', '/records/']] },
  { q: 'Where are my documents or my request?', terms: 'status tracking reference order already existing', a: 'Look for your Reestri confirmation email and reply in that conversation. If you cannot find it, email Soso from the address you used for the request and include your reference if you have it. There is no public tracking page that exposes matter details by reference number.', links: [['Find your request', '/requests/'], ['Email Soso', 'mailto:soso@reestri.io']] },
  { q: 'Is the English summary a certified translation?', terms: 'language translated certified paper apostille', a: 'No. You receive the official electronic document and an English summary of its key facts. Certified translations, certified paper copies and apostilles are separate services, quoted only if available for your request.', links: [['What is covered', '/coverage/'], ['Contact Soso', 'mailto:soso@reestri.io']] },
  { q: 'Can I use an API or connect an AI agent?', terms: 'developer apify json mcp api code automation', a: 'Yes. The Data tools area links to Reestri tools on Apify and explains API and MCP access. Those tools return structured public-register data. They are priced separately and do not replace an ordered official extract.', links: [['Explore data tools', '/tools/'], ['Data-tool pricing', '/pricing/#data-tools']] },
  { q: 'Who runs Reestri?', terms: 'trust company founder contact government soso', a: 'Reestri is run by Soso Pkhakadze in Kutaisi, Georgia. It is an independent service, not a government registry. The relevant authorities issue the original records; Reestri arranges requests and prepares English summaries.', links: [['About Reestri', '/about/'], ['Email Soso', 'mailto:soso@reestri.io']] }
];
const help = $('#records-guide'), faqSearch = $('#help-search'), faqList = $('#faq-list'), answer = $('#faq-answer');
let opener;
function listFaqs() {
  if (!faqList) return;
  faqList.replaceChildren();
  const q = faqSearch.value.trim().toLocaleLowerCase();
  const found = FAQ.filter(item => (item.q + ' ' + item.terms).toLocaleLowerCase().includes(q));
  found.forEach(item => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = item.q + ' →';
    b.setAttribute('aria-controls', 'faq-answer'); b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', () => {
      $$('button', faqList).forEach(button => {
        button.classList.toggle('is-selected', button === b);
        button.setAttribute('aria-expanded', String(button === b));
      });
      answer.replaceChildren();
      const title = document.createElement('h3'); title.textContent = item.q;
      const text = document.createElement('p'); text.textContent = item.a;
      answer.append(title, text);
      item.links.forEach(([label, href]) => { const p = document.createElement('p'), a = document.createElement('a'); a.href = href; a.textContent = label + ' →'; p.append(a); answer.append(p); });
      answer.hidden = false; answer.tabIndex = -1; answer.focus();
      answer.scrollIntoView({ block: 'nearest' });
    });
    faqList.append(b);
  });
  if (!found.length) { const p = document.createElement('p'); p.className = 'note'; p.textContent = 'No matching answer. Try a shorter question, or contact Soso below.'; faqList.append(p); }
}
$$('[data-open-help]').forEach(b => b.addEventListener('click', () => {
  opener = b; help.showModal(); faqSearch.focus();
}));
$('#help-close')?.addEventListener('click', () => help.close());
help?.addEventListener('click', e => { if (e.target === help) { const r = help.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) help.close(); } });
help?.addEventListener('close', () => opener?.focus());
faqSearch?.addEventListener('input', () => { answer.hidden = true; listFaqs(); });
faqSearch?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); $('button', faqList)?.click(); }
});
listFaqs();
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let revealObserver;
function setupMotion() {
  revealObserver?.disconnect();
  const reduce = motionPreference.matches;
  document.body.classList.toggle('js-motion', !reduce);
  const elements = $$('main .band, main .steps-inline > li, .guide-row, .tools-row, .page-top, .plain-sections > section');
  if (reduce || !('IntersectionObserver' in window)) { elements.forEach(el => el.classList.add('is-visible')); return; }
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: .08, rootMargin: '0px 0px 24px 0px' });
  elements.forEach(el => {
    el.classList.add('reveal');
    if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-visible');
    else revealObserver.observe(el);
  });
}
setupMotion();
motionPreference.addEventListener('change', setupMotion);
document.addEventListener('focusin', e => e.target.closest?.('.reveal')?.classList.add('is-visible'));
const siteHeader = $('.site-header');
let scrollFrame = false;
function updateHeader() { siteHeader?.classList.toggle('scrolled', scrollY > 24); scrollFrame = false; }
window.addEventListener('scroll', () => { if (!scrollFrame) { scrollFrame = true; requestAnimationFrame(updateHeader); } }, { passive: true });
updateHeader();
$$('[data-print]').forEach(b => b.addEventListener('click', () => window.print()));
if (/^(www\.)?reestri\.io$/.test(location.hostname)) {
  try { navigator.sendBeacon('https://api.reestri.io/hit', JSON.stringify({ p: location.pathname, r: document.referrer ? new URL(document.referrer).hostname : '' })); } catch {}
}
