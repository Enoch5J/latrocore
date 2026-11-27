import { CalendarCheck, ClipboardList, ShieldCheck } from 'lucide-react';

const HOW_WE_WORK_STEPS = [
  {
    step: '01',
    title: 'Record at home',
    description:
      'Log daily glucose readings, medicine doses, and personal notes in one calm timeline.',
    icon: ClipboardList,
  },
  {
    step: '02',
    title: 'Review & verify',
    description:
      'Pharmacists check prescriptions for interactions while Latro AI answers everyday questions.',
    icon: ShieldCheck,
  },
  {
    step: '03',
    title: 'Visit prepared',
    description:
      'Bring clear trends, lab reports, and your saved questions to every doctor appointment.',
    icon: CalendarCheck,
  },
];

export default function HowWeWorkSection() {
  return (
    <section
      id="how-we-work"
      aria-labelledby="how-we-work-heading"
      className="home-scroll-target bg-white py-14 sm:py-18 border-b border-[#E8DCC8]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div data-reveal="section" className="text-center max-w-2xl mx-auto mb-12">
          <p className="inline-flex items-center justify-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.16em] text-[#046A38] mb-3">
            <span className="h-[2px] w-6 bg-[#046A38] rounded-full" aria-hidden="true" />
            <span>HOW WE WORK</span>
          </p>
          <h2
            id="how-we-work-heading"
            className="font-sans font-extrabold text-[30px] sm:text-[38px] text-[#0D261C] tracking-[-0.02em] leading-tight"
          >
            Simple care in three clear steps
          </h2>
          <p className="mt-3 text-[15px] sm:text-[16px] text-[#48616A] font-medium leading-relaxed">
            Built to keep patients, doctors, and pharmacists aligned between every visit.
          </p>
        </div>

        <div data-reveal-grid="how-we-work" className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Desktop horizontal connector line */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-11 left-[16%] right-[16%] h-[1.5px] bg-[#CFE3D6]"
          />

          {HOW_WE_WORK_STEPS.map(({ step, title, description, icon: Icon }) => (
            <article
              key={step}
              data-reveal="card"
              className="relative group bg-[#FAF8F3] rounded-2xl border border-[#E8DCC8] p-6 sm:p-7 text-center flex flex-col items-center hover:bg-white hover:border-[#046A38]/40 hover:shadow-[0_12px_30px_-14px_rgba(9,51,34,0.18)] hover:-translate-y-1 transition-all duration-200"
            >
              <div className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-[#CFE3D6] text-[#046A38] shadow-xs group-hover:bg-[#046A38] group-hover:text-white group-hover:border-[#046A38] transition-colors duration-200">
                <Icon size={24} strokeWidth={1.9} />
                <span className="absolute -top-2 -right-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#E5F6EC] border border-[#9BC9AA] px-1.5 text-[11px] font-bold text-[#046A38] group-hover:bg-white">
                  {step}
                </span>
              </div>

              <h3 className="font-sans font-bold text-[18px] sm:text-[19px] text-[#0D261C] tracking-tight">
                {title}
              </h3>
              <p className="mt-2.5 text-[14.5px] sm:text-[15px] text-[#2F3E37] font-medium leading-relaxed max-w-[30ch]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
