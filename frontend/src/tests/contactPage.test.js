import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AppContext', () => ({
  useApp: () => ({ data: {}, setUser: vi.fn(), refreshData: vi.fn(), addToast: vi.fn() }),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));

vi.mock('../hooks/useScrollMotion', () => ({
  usePrefersReducedMotion: () => false,
  useScrollReveals: () => {},
}));

import Contact, { CONTACT_TOPIC_OPTIONS, validateContactForm } from '../pages/Contact';
import ContactCtaSection from '../components/home/ContactCtaSection';
import Welcome from '../pages/Welcome';

describe('Public Contact Latrocore Page & Homepage CTA', () => {
  it('renders banner, form fields, topic options, privacy note, shared header/footer, and public contact details', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/contact'] },
        React.createElement(Contact)
      )
    );

    // Navbar & footer reused
    expect(html).toContain('<header');
    expect(html).toContain('<footer');
    expect(html).toContain('LATROCORE');

    // Banner copy & breadcrumb
    expect(html).toContain('Contact Latrocore');
    expect(html).toContain('Home');
    expect(html).toContain('href="/"');
    expect(html).toContain('Contact');
    expect(html).toContain(
      'Have a question about using Latrocore, need help with your account, or want to introduce it to your practice? Get in touch with our team.'
    );
    expect(html).toContain('from-[#093322]');
    expect(html).toContain('to-[#046A38]');

    // Form heading, fields, required indicators, topic dropdown, privacy note, button
    expect(html).toContain('Send us a message');
    expect(html).toContain('Tell us what you need help with and where we can reach you.');
    expect(html).toContain('Full name');
    expect(html).toContain('Email address');
    expect(html).toContain('Phone number');
    expect(html).toContain('Enquiry topic');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('Message');
    expect(html).toContain('How can our team help?');
    expect(html).toContain('For your privacy, please leave out prescription details and test results.');
    expect(html).toContain('Send message');

    expect(CONTACT_TOPIC_OPTIONS).toEqual([
      'Getting started',
      'Account support',
      'Using Latrocore',
      'Clinic or pharmacy enquiry',
      'Other',
    ]);
    // Get in touch sidebar uses the provided Latrocore details, not reference-image data.
    expect(html).toContain('Get in touch');
    expect(html).toContain('Office address');
    expect(html).toContain('No. 85, Mogappair Road, Golden Flats, Chennai');
    expect(html).toContain('Email us');
    expect(html).toContain('href="mailto:info@latrocore.com"');
    expect(html).toContain('Mobile number');
    expect(html).toContain('href="tel:9940535349"');
    expect(html).toContain('bg-[#E8F5EE]');
    expect(html).not.toContain('data-contact-fallback="common-questions"');
    expect(html).not.toMatch(/sidco|1800-latro-care|clinical@latrocore\.internal/i);
  });

  it('renders verified contact detail cards with mint tiles when configured', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/contact'] },
        React.createElement(Contact, {
          contactInfoOverride: {
            email: 'care@latrocore.com',
            phone: '+91 44 4000 1234',
            address: '12 Health Way, Chennai',
            mapsUrl: 'https://maps.google.com/?q=12+Health+Way',
            socials: [{ key: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/latrocore' }],
            hasContactDetails: true,
          },
        })
      )
    );

    expect(html).toContain('href="mailto:care@latrocore.com"');
    expect(html).toContain('href="tel:+914440001234"');
    expect(html).toContain('12 Health Way, Chennai');
    expect(html).toContain('Open in Maps');
    expect(html).toContain('LinkedIn');
    expect(html).not.toContain('data-contact-fallback="common-questions"');
  });

  it('validates required fields, email format, and optional phone cleanly', () => {
    const bad = validateContactForm({
      full_name: ' ',
      email: 'bad-email',
      phone: 'abc',
      topic: '',
      message: 'hi',
    });
    expect(bad.full_name).toBeTruthy();
    expect(bad.email).toBeTruthy();
    expect(bad.phone).toBeTruthy();
    expect(bad.topic).toBeTruthy();
    expect(bad.message).toBeTruthy();

    const good = validateContactForm({
      full_name: 'Priya Nair',
      email: 'priya@example.com',
      phone: '',
      topic: 'Using Latrocore',
      message: 'How do I share readings with my clinician?',
    });
    expect(good).toEqual({});

    expect(validateContactForm({
      full_name: 'Priya Nair',
      email: 'priya..nair@example.com',
      phone: '9876543210',
      countryCode: '+91',
      topic: 'Using Latrocore',
      message: 'How do I share readings with my clinician?',
    }).email).toBeTruthy();

    expect(validateContactForm({
      full_name: 'Priya Nair',
      email: 'priya@example.com',
      phone: '1234567890',
      countryCode: '+91',
      topic: 'Using Latrocore',
      message: 'How do I share readings with my clinician?',
    }).phone).toContain('10-digit Indian mobile number');

    expect(validateContactForm({
      full_name: 'Priya Nair',
      email: 'priya@example.com',
      phone: '2345678901',
      countryCode: '+1',
      topic: 'Using Latrocore',
      message: 'How do I share readings with my clinician?',
    })).toEqual({});
  });

  it('connects homepage Contact CTA and footer Contact link to /contact', () => {
    const ctaHtml = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(ContactCtaSection)
      )
    );

    expect(ctaHtml).toContain('Have a question about Latrocore?');
    expect(ctaHtml).toContain(
      'Whether you’re managing diabetes, supporting a family member, or exploring Latrocore for your practice, our team can help you get started.'
    );
    expect(ctaHtml).toContain('Contact our team');
    expect(ctaHtml).toContain('href="/contact"');
    expect(ctaHtml).toContain('bg-[#046A38]');
    expect(ctaHtml).toContain('src="/doctor-avatar.png"');

    const homeHtml = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(Welcome)
      )
    );
    expect(homeHtml).toContain('id="contact-cta"');
    expect(homeHtml).toContain('href="/contact"');
  });
});
