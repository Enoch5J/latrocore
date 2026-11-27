import { normalizeRole } from '../auth/ProtectedRoute';

/**
 * Returns a clean single-character uppercase initial for avatar badges.
 */
export function getUserInitial(user) {
  const source = (user?.name || user?.email || 'U').trim();
  const stripped = source.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Pharm\.)\s*/i, '').trim() || source;
  const match = stripped.match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : 'U';
}

/**
 * Maps internal role identifiers into clean title-case labels.
 */
export function getRoleDisplayLabel(role) {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case 'admin':
      return 'Admin';
    case 'doctor':
      return 'Doctor';
    case 'pharmacist':
      return 'Pharmacist';
    case 'patient':
    default:
      return 'Patient';
  }
}
