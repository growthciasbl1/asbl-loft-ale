/**
 * Client-side phone validation helpers. Accept common India phone formats:
 *   - 10-digit starting with 6-9 (e.g. 9876543210)
 *   - 12-digit with 91 prefix (e.g. 919876543210)
 *   - with +91 / 91 / 0 prefix and with spaces/dashes
 * Output is always +91XXXXXXXXXX (E.164) or null when invalid.
 */

export function digitsOnly(raw: string): string {
  return (raw ?? '').replace(/\D/g, '');
}

export function isValidIndiaPhone(raw: string): boolean {
  const d = digitsOnly(raw);
  if (/^[6-9]\d{9}$/.test(d)) return true; // 10-digit local
  if (/^91[6-9]\d{9}$/.test(d)) return true; // 91 + 10-digit
  if (/^0[6-9]\d{9}$/.test(d)) return true; // 0 + 10-digit (some users type it)
  return false;
}

export function normaliseIndiaPhoneE164(raw: string): string | null {
  const d = digitsOnly(raw);
  if (/^[6-9]\d{9}$/.test(d)) return `+91${d}`;
  if (/^91[6-9]\d{9}$/.test(d)) return `+${d}`;
  if (/^0[6-9]\d{9}$/.test(d)) return `+91${d.slice(1)}`;
  return null;
}

/** Short human-facing hint when validation fails — used in form UX. */
export function phoneValidationHint(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const d = digitsOnly(raw);
  if (d.length < 10) return `Phone needs 10 digits (you've entered ${d.length}).`;
  if (!isValidIndiaPhone(raw)) return 'Enter a valid 10-digit Indian mobile number.';
  return null;
}
