export function readCompanies(value, mode = 'inquiry') {
  const names = String(value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!names.length) return { error: 'Add a company name or registration number.' };
  if (names.length > (mode === 'note' ? 1 : 20)) return { error: mode === 'note' ? 'The free first note covers one company. Please leave one company on this request.' : 'Use up to 20 companies per request, one per line. Email Soso for a larger list.' };
  if (names.some(s => s.length < 2 || s.length > 160)) return { error: 'Use 2 to 160 characters per company. Put extra details in the optional description.' };
  return { companies: names.map(name => ({ name, number: '' })) };
}

export function inquiryPayload(values, token, file) {
  const mode = values.mode === 'note' ? 'note' : 'inquiry';
  const parsed = readCompanies(values.companyList, mode);
  if (parsed.error) return parsed;
  if (!['AM', 'GE'].includes(values.country)) return { error: 'Choose Armenia or Georgia.' };
  const email = String(values.email || '').trim().toLowerCase();
  if (email.length > 160 || !/^[^\s@<>",;]+@[^\s@<>",;]+\.[a-z]{2,}$/i.test(email)) return { error: 'Enter a valid email address so Soso can reply.' };
  if (!values.consent) return { error: 'Please agree to the use of your details to handle this request.' };
  const fd = new FormData();
  for (const [key, value] of Object.entries({ mode, country: values.country, companies: JSON.stringify(parsed.companies), email, consent: 'yes', turnstile: token, firm: values.firm || '', contact: values.contact || '', notes: values.notes || '', deadline: mode === 'note' ? '' : values.deadline || '', website: values.website || '' })) fd.set(key, value);
  if (file?.size) fd.set('nda', file);
  return { fd, companies: parsed.companies, email, mode };
}
