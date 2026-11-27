import {
  Bell,
  ClipboardCheck,
  Footprints,
  Languages,
  TestTube2,
  TrendingUp,
  Utensils,
} from 'lucide-react';

import languageSupportImg from '../../assets/ai-companion/language-support.png';
import medicineRemindersImg from '../../assets/ai-companion/medicine-reminders.png';
import glucoseLogsImg from '../../assets/ai-companion/glucose-logs.png';
import labTestsImg from '../../assets/ai-companion/lab-tests.png';
import visitPreparationImg from '../../assets/ai-companion/visit-preparation.png';
import mealPlanningImg from '../../assets/ai-companion/meal-planning.png';
import dailyActivityImg from '../../assets/ai-companion/daily-activity.png';

export const AI_COMPANION_TOPICS = [
  {
    id: 'language-support',
    title: 'Language support',
    question: 'Can you explain a glucose log in Tamil?',
    image: languageSupportImg,
    imageWidth: 861,
    imageHeight: 771,
    imageAlt: 'Two layered speech bubbles representing multilingual AI support',
    icon: Languages,
  },
  {
    id: 'medicine-reminders',
    title: 'Medicine reminders',
    question: 'How do refill reminders work?',
    image: medicineRemindersImg,
    imageWidth: 681,
    imageHeight: 763,
    imageAlt: 'Green medicine bottle beside a cream notification bell',
    icon: Bell,
  },
  {
    id: 'glucose-logs',
    title: 'Glucose logs',
    question: 'What should I record in my glucose log?',
    image: glucoseLogsImg,
    imageWidth: 688,
    imageHeight: 792,
    imageAlt: 'Spiral notebook showing a blood glucose trend chart',
    icon: TrendingUp,
  },
  {
    id: 'lab-tests',
    title: 'Lab tests',
    question: 'What does HbA1c mean?',
    image: labTestsImg,
    imageWidth: 599,
    imageHeight: 635,
    imageAlt: 'Green-capped blood sample tube beside a diagnostic test slip',
    icon: TestTube2,
  },
  {
    id: 'visit-preparation',
    title: 'Visit preparation',
    question: 'What should I ask my pharmacist about refills?',
    image: visitPreparationImg,
    imageWidth: 611,
    imageHeight: 836,
    imageAlt: 'Clipboard with three verified checklist rows',
    icon: ClipboardCheck,
  },
  {
    id: 'meal-planning',
    title: 'Meal planning',
    question: 'How can I build a balanced meal with rice, dal, and vegetables?',
    image: mealPlanningImg,
    imageWidth: 972,
    imageHeight: 824,
    imageAlt: 'Cream plate with rice, dal bowl, and fresh vegetables',
    icon: Utensils,
  },
  {
    id: 'daily-activity',
    title: 'Daily activity',
    question: 'How can I fit short walks into my workday?',
    image: dailyActivityImg,
    imageWidth: 1024,
    imageHeight: 624,
    imageAlt: 'Mint walking shoe beside a cream analog clock',
    icon: Footprints,
  },
];

export const INITIAL_ACTIVE_INDEX = 1; // Medicine reminders (second dot active)

export function getCircularOffset(index, activeIndex, total = AI_COMPANION_TOPICS.length) {
  let diff = (index - activeIndex) % total;
  if (diff < 0) diff += total;
  if (diff > Math.floor(total / 2)) {
    diff -= total;
  }
  return diff;
}

export function getOrderedIndices(activeIndex, total = AI_COMPANION_TOPICS.length) {
  const half = Math.floor(total / 2);
  const ordered = [];
  for (let offset = -half; offset <= half; offset += 1) {
    ordered.push(((activeIndex + offset) % total + total) % total);
  }
  return ordered;
}
