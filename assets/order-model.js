export const PRICES = { AM: { pack: 350, pack_copies: 500, extract: 200, none: 0, court: 150 }, GE: { extract: 49 } };
export const DOC_LABELS = { pack: 'Extract + current charter', pack_copies: 'Extract + charter + file copies', extract: 'Official extract', none: 'Public court-case check only' };
export function activeCompanies(state) {
  return (state.mode === 'note' ? state.companies.slice(0, 1) : state.companies).map(c => state.mode === 'note'
    ? { name: c.name.trim(), number: c.number.trim() }
    : { name: c.name.trim(), number: c.number.trim(), docs: state.country === 'GE' ? 'extract' : c.docs, court: state.country === 'AM' && c.court });
}
export function companyFee(country, company) {
  return country === 'GE' ? 49 : (PRICES.AM[company.docs] ?? 0) + (company.court ? 150 : 0);
}
export function estimate(state) {
  const companies = activeCompanies(state);
  const fees = companies.map(c => state.mode === 'note' ? 0 : companyFee(state.country, c));
  const fullSets = state.mode === 'order' && state.country === 'AM' ? companies.filter(c => c.docs === 'pack' || c.docs === 'pack_copies').length : 0;
  const fee = fees.reduce((a, b) => a + b, 0);
  return { fee, fees, count: companies.length, costLow: fullSets * 100, costHigh: fullSets * 135, fullSets,
    costsQuoted: state.mode === 'order' && state.country === 'AM' && fullSets !== companies.length };
}
export function companyError(state) {
  const companies = activeCompanies(state);
  if (!companies.length || companies.length > 20) return 'Include between 1 and 20 companies.';
  const unnamed = companies.findIndex(c => c.name.length < 2);
  if (unnamed >= 0) return 'Company ' + (unnamed + 1) + ': enter a company name with at least two characters.';
  return null;
}
export function scopeError(state) {
  if (state.mode === 'note' || state.country === 'GE') return null;
  const invalid = state.companies.findIndex(c => !Object.hasOwn(DOC_LABELS, c.docs) || (c.docs === 'none' && !c.court));
  return invalid >= 0 ? 'Company ' + (invalid + 1) + ': choose documents or a public court-case check.' : null;
}
export function appendRequestFields(formData, state, fields, token, file) {
  formData.append('mode', state.mode); formData.append('country', state.country);
  formData.append('companies', JSON.stringify(activeCompanies(state)));
  for (const k of ['firm', 'contact', 'email', 'deadline', 'notes', 'website']) formData.append(k, k === 'deadline' && state.mode === 'note' ? '' : String(fields[k] || '').trim());
  formData.append('consent', fields.consent ? 'yes' : '');
  formData.append('turnstile', token);
  if (file) formData.append('nda', file, file.name);
  return formData;
}
