export const PROFILE_KEY = 'sepa_saved_profile';

export const loadProfile = () => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const name = String(data.name ?? '').trim();
    const iban = String(data.iban ?? '').replace(/\s/g, '').toUpperCase();
    if (!name || !iban) return null;
    return {
      name,
      iban,
      bic: String(data.bic ?? '').trim(),
    };
  } catch {
    return null;
  }
};

export const saveProfile = (profile) => {
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({
      name: String(profile.name ?? '').trim(),
      iban: String(profile.iban ?? '').replace(/\s/g, '').toUpperCase(),
      bic: String(profile.bic ?? '').trim(),
    })
  );
};

export const clearProfile = () => localStorage.removeItem(PROFILE_KEY);

export const DEMO_AT = {
  name: 'Max Mustermann',
  iban: 'AT232011100234573201',
  bic: '',
};

export const DEMO_DE = {
  name: 'Erika Musterfrau',
  iban: 'DE89370400440532013000',
  bic: '',
};
