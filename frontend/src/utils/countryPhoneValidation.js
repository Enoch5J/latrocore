export function validateCountryPhone(countryCode, value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) {
    return 'Mobile number is required.';
  }

  if (countryCode === '+91' && !/^[5-9]\d{9}$/.test(digits)) {
    return 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).';
  }
  if (countryCode === '+1' && digits.length !== 10) {
    return 'US/Canada phone number must be 10 digits.';
  }
  if (countryCode === '+44' && (digits.length < 10 || digits.length > 11)) {
    return 'UK phone number must be 10 or 11 digits.';
  }
  if (countryCode === '+971' && digits.length !== 9) {
    return 'UAE phone number must be 9 digits (e.g. 501234567).';
  }
  if (countryCode === '+65' && digits.length !== 8) {
    return 'Singapore phone number must be 8 digits.';
  }
  if (countryCode === '+61' && digits.length !== 9) {
    return 'Australia phone number must be 9 digits.';
  }
  if (countryCode === '+49' && (digits.length < 10 || digits.length > 11)) {
    return 'German phone number must be 10 or 11 digits.';
  }
  if (!['+91', '+1', '+44', '+971', '+65', '+61', '+49'].includes(countryCode)
    && (digits.length < 7 || digits.length > 15)) {
    return 'Phone number must be between 7 and 15 digits.';
  }

  return '';
}
