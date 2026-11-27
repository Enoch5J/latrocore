const DEFAULT_PUBLIC_CONTACT = {
  email: 'info@latrocore.com',
  phone: '9940535349',
  address: 'No. 85, Mogappair Road, Golden Flats, Chennai',
};

/**
 * Use Latrocore's provided public contact details unless deployment values override them.
 */
export function getVerifiedPublicContactInfo() {
  const email = String(import.meta.env?.VITE_PUBLIC_CONTACT_EMAIL || DEFAULT_PUBLIC_CONTACT.email).trim();
  const phone = String(import.meta.env?.VITE_PUBLIC_CONTACT_PHONE || DEFAULT_PUBLIC_CONTACT.phone).trim();
  const address = String(import.meta.env?.VITE_PUBLIC_CONTACT_ADDRESS || DEFAULT_PUBLIC_CONTACT.address).trim();
  const mapsUrl = String(import.meta.env?.VITE_PUBLIC_CONTACT_MAPS_URL || '').trim();

  const socials = [
    {
      key: 'linkedin',
      label: 'LinkedIn',
      url: String(import.meta.env?.VITE_PUBLIC_SOCIAL_LINKEDIN || '').trim(),
    },
    {
      key: 'twitter',
      label: 'X (Twitter)',
      url: String(import.meta.env?.VITE_PUBLIC_SOCIAL_X || '').trim(),
    },
    {
      key: 'instagram',
      label: 'Instagram',
      url: String(import.meta.env?.VITE_PUBLIC_SOCIAL_INSTAGRAM || '').trim(),
    },
  ].filter((item) => Boolean(item.url));

  const hasContactDetails = Boolean(email || phone || address || socials.length > 0);

  return {
    email,
    phone,
    address,
    mapsUrl,
    socials,
    hasContactDetails,
  };
}
