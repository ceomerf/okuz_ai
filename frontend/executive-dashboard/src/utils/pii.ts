export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  const visible = Math.min(3, user.length);
  const masked = user.slice(0, visible) + '*'.repeat(Math.max(0, user.length - visible));
  return `${masked}@${domain}`;
};

export const maskPhone = (phone: string): string => {
  if (!phone) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  return phone.replace(/(\d{3})\d{3}(\d{2,})/, '$1***$2');
};

export interface ExportOptions {
  anonymizeEmail?: boolean;
  anonymizePhone?: boolean;
}

export const maybeAnonymize = (value: string, opts?: ExportOptions, kind?: 'email' | 'phone') => {
  if (!opts) return value;
  if (kind === 'email' && opts.anonymizeEmail) return maskEmail(value);
  if (kind === 'phone' && opts.anonymizePhone) return maskPhone(value);
  return value;
};


