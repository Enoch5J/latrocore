import medicinesImg from '../../assets/hero/medicines.png';
import monitoringImg from '../../assets/hero/monitoring.png';
import latroAiImg from '../../assets/hero/latro-ai.png';
import followUpsImg from '../../assets/hero/follow-ups.png';

export const HERO_SLIDES = [
  {
    id: 'medicines',
    label: 'Medicines',
    headline: 'Turn your prescription into daily reminders.',
    body: 'See when each medicine is due, log a dose and keep track of refills.',
    buttonLabel: 'See how reminders work',
    actionType: 'route',
    target: '/patient/medications',
    image: medicinesImg,
    imageWidth: 1024,
    imageHeight: 680,
    imageAlt: 'Folded prescription beside a green morning medicine reminder card with a mark as taken button',
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    headline: 'See your glucose readings over time.',
    body: 'Keep readings and notes together to review with your care team.',
    buttonLabel: 'Explore glucose tracking',
    actionType: 'route',
    target: '/patient/glucose',
    image: monitoringImg,
    imageWidth: 1024,
    imageHeight: 812,
    imageAlt: 'Open glucose logbook showing dated readings, a trend chart, and a green pen',
  },
  {
    id: 'latro-ai',
    label: 'Latro AI',
    headline: 'Ask about diabetes in your language.',
    body: 'Ask about medicines, lab tests and everyday care in English, Tamil or Hindi.',
    buttonLabel: 'Ask Latro AI',
    actionType: 'chat',
    target: null,
    image: latroAiImg,
    imageWidth: 1024,
    imageHeight: 822,
    imageAlt: 'Tamil conversation bubbles asking about HbA1c alongside a glucose meter, test tubes, and medicine bottle',
  },
  {
    id: 'follow-ups',
    label: 'Follow-ups',
    headline: 'Know what’s due before your next visit.',
    body: 'Keep tests and follow-ups in view, and prepare questions for your care team.',
    buttonLabel: 'Explore follow-up care',
    actionType: 'route',
    target: '/patient/test-reminders',
    image: followUpsImg,
    imageWidth: 1024,
    imageHeight: 892,
    imageAlt: 'Appointment card clipped with a green paperclip listing lab test, follow-up, and questions for my visit',
  },
];

export function getNextHeroIndex(currentIndex, key, total = HERO_SLIDES.length) {
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return (currentIndex + 1) % total;
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return (currentIndex - 1 + total) % total;
  }
  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return total - 1;
  }
  return currentIndex;
}
