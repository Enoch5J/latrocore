import labResultsImg from '../../assets/trust-pillars/lab-results.jpg';
import changesOverTimeImg from '../../assets/trust-pillars/changes-over-time.jpg';
import recordAccessImg from '../../assets/trust-pillars/record-access.jpg';
import medicineInteractionsImg from '../../assets/trust-pillars/medicine-interactions.jpg';

const TRUST_CARDS = [
  {
    id: 'lab-results',
    title: 'Lab results in one place',
    description: 'Find past test results by date when you prepare for your next visit.',
    image: labResultsImg,
  },
  {
    id: 'changes-over-time',
    title: 'Changes over time',
    description: 'Compare your blood sugar readings across days and weeks.',
    image: changesOverTimeImg,
  },
  {
    id: 'record-access',
    title: 'Who can see your records?',
    description: 'What you can see depends on your role as a patient or care team member.',
    image: recordAccessImg,
  },
  {
    id: 'medicine-interactions',
    title: 'Medicine interaction checks',
    description: 'Potential interactions are flagged for your care team to review.',
    image: medicineInteractionsImg,
  },
];

export default function TrustPillarsSection() {
  return (
    <section
      id="trust-pillars"
      aria-labelledby="trust-pillars-heading"
      className="home-scroll-target home-band-cream py-12 sm:py-16 border-b border-[#E8DCC8]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div data-reveal="section" className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <p className="inline-flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#046A38] font-['Inter',system-ui,sans-serif] mb-2.5">
            <span className="h-[2px] w-5 sm:w-6 bg-[#046A38]/75 rounded-full" aria-hidden="true" />
            <span>CLINICAL STANDARDS</span>
          </p>
          <h2
            id="trust-pillars-heading"
            className="font-serif font-bold text-3xl sm:text-4xl lg:text-[40px] text-[#093322] tracking-tight leading-tight"
          >
            Care you can follow between visits
          </h2>
        </div>

        <div className="home-band-mint rounded-3xl p-4 sm:p-6 lg:p-7">
          <div
            data-reveal-grid="trust-pillars"
            data-reveal-order="sequential"
            data-reveal-step="60"
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {TRUST_CARDS.map((card) => (
              <article
                key={card.id}
                data-reveal="card"
                className="flex items-center gap-4 rounded-2xl border border-[#CFE3D6] bg-white p-3 sm:p-4 shadow-2xs"
              >
                <div className="w-24 sm:w-28 md:w-1/3 shrink-0 aspect-square overflow-hidden rounded-xl bg-[#FAF6EF]">
                  <img
                    src={card.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-[#093322] leading-snug tracking-tight">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 font-sans text-sm sm:text-[15px] text-[#48616A] leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
