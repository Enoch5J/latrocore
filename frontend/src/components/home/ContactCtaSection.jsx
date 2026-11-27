import { Link } from 'react-router-dom';
import { ArrowRight, PhoneCall } from 'lucide-react';

const CTA_HIGHLIGHTS = [
  'Patient-first guidance',
  'English, Tamil & Hindi',
  'Built for daily care',
];

export default function ContactCtaSection() {
  return (
    <section
      id="contact-cta"
      aria-labelledby="contact-cta-heading"
      className="home-scroll-target py-12 sm:py-16 bg-[#FAF6EF]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          data-reveal="section"
          className="relative overflow-hidden rounded-3xl bg-[#046A38] bg-gradient-to-br from-[#046A38] via-[#045E32] to-[#024725] text-[#FAF6EF] shadow-[0_20px_48px_-16px_rgba(4,106,56,0.45)] border border-[#03542C]"
        >
          {/* Subtle dot-matrix texture + ambient glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(rgba(168, 215, 189, 0.45) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div
            className="absolute -top-28 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full bg-[#1D8252]/40 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16 text-center flex flex-col items-center">
            <p className="inline-flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#A8D7BD] font-['Inter',system-ui,sans-serif] mb-3.5">
              <span className="h-[2px] w-5 sm:w-6 bg-[#A8D7BD]/85 rounded-full" aria-hidden="true" />
              <span>GET IN TOUCH</span>
            </p>

            <h2
              id="contact-cta-heading"
              className="home-section-heading text-3xl sm:text-4xl lg:text-[42px] text-[#FAF6EF]"
            >
              Have a question about Latrocore?
            </h2>

            <p className="mt-4 max-w-xl font-['Inter',system-ui,sans-serif] text-sm sm:text-base leading-relaxed text-[#FAF6EF]/88">
              Whether you’re managing diabetes, supporting a family member, or exploring Latrocore for your practice, our team can help you get started.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                to="/contact"
                className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#FAF6EF] hover:bg-[#F9EBD7] text-[#093322] font-['Inter',system-ui,sans-serif] font-semibold text-sm sm:text-[15px] shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#FAF6EF] focus-visible:outline-offset-2 no-underline"
              >
                <span>Contact our team</span>
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[#FAF6EF]/30 bg-white/10 hover:bg-white/15 text-[#FAF6EF] font-['Inter',system-ui,sans-serif] font-semibold text-sm sm:text-[15px] backdrop-blur-xs transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#FAF6EF] focus-visible:outline-offset-2 no-underline"
              >
                <PhoneCall size={15} aria-hidden="true" />
                <span>Sign in to Portal</span>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-[13px] font-medium text-[#D7F0E2]/90">
              {CTA_HIGHLIGHTS.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#6EE7B7]" aria-hidden="true" />
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
