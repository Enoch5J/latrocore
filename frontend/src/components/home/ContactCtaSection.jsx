import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function ContactCtaSection() {
  return (
    <section
      id="contact-cta"
      aria-labelledby="contact-cta-heading"
      className="home-scroll-target pb-12 sm:pb-16 pt-2 bg-[#FAF6EF]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-[#046A38] text-[#FAF6EF] shadow-lg border border-[#03542C]">
          {/* Subtle ambient highlight */}
          <div
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#1D8252]/35 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-stretch justify-between gap-6 lg:gap-8">
            {/* Left Copy (~60%) */}
            <div className="w-full lg:w-[60%] px-6 sm:px-10 lg:pl-12 lg:pr-4 py-8 sm:py-11 lg:py-12 flex flex-col items-center text-center lg:items-start lg:text-left justify-center">
              <h2
                id="contact-cta-heading"
                className="font-serif font-bold text-2xl sm:text-3xl lg:text-[34px] text-[#FAF6EF] tracking-tight leading-tight"
              >
                Have a question about Latrocore?
              </h2>
              <p className="mt-3.5 w-full max-w-xl font-['Inter',system-ui,sans-serif] text-sm sm:text-[15px] leading-relaxed text-[#FAF6EF]/90">
                Whether you’re managing diabetes, supporting a family member, or exploring Latrocore for your practice, our team can help you get started.
              </p>

              <div className="mt-6 flex justify-center lg:justify-start">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FAF6EF] hover:bg-[#F9EBD7] text-[#093322] font-['Inter',system-ui,sans-serif] font-semibold text-sm shadow-sm hover:shadow transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#FAF6EF] focus-visible:outline-offset-2 no-underline"
                >
                  <span>Contact our team</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Right Doctor Portrait (~40%, aligned to bottom) */}
            <div className="w-full lg:w-[40%] flex items-end justify-center lg:justify-end px-6 lg:pr-10 pt-2 lg:pt-6 self-end">
              <img
                src="/doctor-avatar.png"
                alt="Latrocore clinical care team"
                className="w-52 sm:w-60 lg:w-64 h-auto max-h-[290px] object-contain object-bottom bg-transparent select-none drop-shadow-md"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
