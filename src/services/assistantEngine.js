// Deterministic local response engine for the AI assistant
// Supports English, Tamil, and Hindi with prewritten responses

const RESPONSES = {
  en: {
    glucose: {
      q: ['glucose', 'sugar', 'blood sugar', 'glucose log', 'reading', 'glucose level'],
      a: "Based on your glucose logs, I can see your recent readings. Your fasting glucose has been varying between 85-130 mg/dL. To understand your trends better, visit the Glucose Monitor section where you can view charts, filter by date and context, and track patterns. If you notice consistently high or low readings, please discuss with your doctor at your next appointment.",
    },
    prescription: {
      q: ['prescription', 'medicine', 'medication', 'what am I taking', 'my medicines', 'drug'],
      a: "You can view your current prescriptions in the Medications section. Each prescription shows the medicine name, dose, frequency, timing, and food instructions. Your doctor has authorized these based on your health needs. For any concerns about your medications, please reach out to your pharmacist or doctor.",
    },
    missed_dose: {
      q: ['missed dose', 'forgot medicine', 'skip dose', 'what if I miss', 'forgot to take'],
      a: "If you've missed a dose, please check your prescription instructions in the Medications section for guidance specific to your medicine. Do not double your next dose to make up for a missed one. Contact your pharmacist or doctor for advice on what to do. You can reach them through the Messages section or request a counselling session.",
    },
    lifestyle: {
      q: ['exercise', 'activity', 'diet', 'food', 'weight', 'sleep', 'lifestyle', 'walking'],
      a: "Regular physical activity, balanced meals, adequate sleep, and maintaining a healthy weight are important aspects of diabetes management. You can track these in the Lifestyle section. Your records show recent activities and meal patterns. Discuss personalized lifestyle recommendations with your care team.",
    },
    investigation: {
      q: ['hba1c', 'test', 'lab', 'investigation', 'report', 'blood test', 'lipid', 'kidney'],
      a: "Your investigation records are available in the Investigations section. You can view HbA1c trends, lipid profiles, kidney function tests, and more. Upcoming review reminders will alert you when tests are due. Upload your lab reports for easy access by your care team.",
    },
    reminder: {
      q: ['reminder', 'screening', 'appointment', 'when', 'next visit', 'check-up'],
      a: "Check your Screening section for upcoming health screenings like eye exams, foot checks, and kidney assessments. Your Appointments section shows scheduled visits. Set reminders to stay on track with your care plan.",
    },
    pharmacist: {
      q: ['pharmacist', 'pharm d', 'counselling', 'counsel', 'talk to pharmacist'],
      a: "You can request a counselling session with your Pharm D team through the Request Counselling option. They can help with medication queries, adherence support, lifestyle advice, and understanding your condition. Your assigned pharmacist will be notified and will schedule a session.",
    },
    doctor: {
      q: ['doctor', 'dr', 'physician', 'specialist', 'review'],
      a: "You can send a message to your doctor through the Messages section or view your upcoming appointments. For urgent concerns, please contact your healthcare provider directly. The doctor can review your shared records including glucose logs, medications, and investigations.",
    },
    greeting: {
      q: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'help'],
      a: "Hello! I'm the LATROCORE AI Assistant (simulated). I can help you understand your glucose logs, find prescription information, answer medication questions, and navigate the platform. What would you like to know?",
    },
  },
  ta: {
    glucose: {
      q: ['குளுக்கோஸ்', 'சர்க்கரை', 'இரத்த சர்க்கரை', 'அளவு'],
      a: "உங்கள் குளுக்கோஸ் பதிவுகளின்படி, உங்கள் சமீபத்திய அளவீடுகள் 85-130 mg/dL இடையே மாறுபட்டுள்ளன. உங்கள் போக்குகளை நன்கு புரிந்துகொள்ள, குளுக்கோஸ் மானிட்டர் பகுதியைப் பார்வையிடவும். தொடர்ந்து உயர்ந்த அல்லது குறைந்த அளவீடுகளை நீங்கள் கவனித்தால், உங்கள் மருத்துவரிடம் விவாதிக்கவும்.",
    },
    prescription: {
      q: ['மருந்து', 'மருந்துச்சீட்டு', 'என்ன எடுக்கிறேன்'],
      a: "உங்கள் தற்போதைய மருந்துச் சீட்டுகளை மருந்துகள் பகுதியில் பார்க்கலாம். ஒவ்வொரு மருந்துச் சீட்டிலும் மருந்தின் பெயர், அளவு, அதிர்வெண் மற்றும் உணவு வழிமுறைகள் காட்டப்படும். உங்கள் மருந்துகள் பற்றிய கவலைகளுக்கு, உங்கள் மருந்தாளர் அல்லது மருத்துவரைத் தொடர்பு கொள்ளவும்.",
    },
    missed_dose: {
      q: ['தவறவிட்ட', 'மறந்துவிட்ட', 'மருந்து தவறவிட்டேன்'],
      a: "நீங்கள் ஒரு மருந்தை தவறவிட்டிருந்தால், மருந்துகள் பகுதியில் உங்கள் மருந்துச்சீட்டு வழிமுறைகளைப் பார்க்கவும். அடுத்த நேரத்தில் இரட்டிப்பு அளவு எடுக்காதீர்கள். உங்கள் மருந்தாளர் அல்லது மருத்துவரிடம் ஆலோசனை பெறவும்.",
    },
    greeting: {
      q: ['வணக்கம்', 'ஹலோ', 'உதவி'],
      a: "வணக்கம்! நான் LATROCORE AI உதவியாளர் (உருவகப்படுத்தப்பட்டது). உங்கள் குளுக்கோஸ் பதிவுகள், மருந்துச் சீட்டு தகவல்கள், மருந்து கேள்விகள் ஆகியவற்றில் நான் உங்களுக்கு உதவ முடியும். என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?",
    },
  },
  hi: {
    glucose: {
      q: ['ग्लूकोज', 'शुगर', 'ब्लड शुगर', 'शर्करा', 'रीडिंग'],
      a: "आपके ग्लूकोज लॉग के अनुसार, आपकी हाल की रीडिंग 85-130 mg/dL के बीच रही हैं। अपने ट्रेंड को बेहतर समझने के लिए, ग्लूकोज मॉनिटर सेक्शन देखें। यदि आपको लगातार उच्च या निम्न रीडिंग दिखती है, तो कृपया अपने डॉक्टर से चर्चा करें।",
    },
    prescription: {
      q: ['दवा', 'प्रिस्क्रिप्शन', 'मेडिसिन', 'क्या ले रहा हूं'],
      a: "आप अपने वर्तमान प्रिस्क्रिप्शन मेडिकेशन सेक्शन में देख सकते हैं। प्रत्येक प्रिस्क्रिप्शन में दवा का नाम, खुराक, आवृत्ति और भोजन निर्देश दिखाए गए हैं। अपनी दवाओं के बारे में किसी भी चिंता के लिए, अपने फार्मासिस्ट या डॉक्टर से संपर्क करें।",
    },
    missed_dose: {
      q: ['खुराक छूट गई', 'दवा भूल गया', 'मिस्ड डोज'],
      a: "यदि आपकी खुराक छूट गई है, तो कृपया अपने प्रिस्क्रिप्शन निर्देश देखें। अगली खुराक डबल न लें। अपने फार्मासिस्ट या डॉक्टर से सलाह लें। आप मैसेज सेक्शन से उनसे संपर्क कर सकते हैं।",
    },
    greeting: {
      q: ['नमस्ते', 'हेलो', 'मदद', 'सहायता'],
      a: "नमस्ते! मैं LATROCORE AI सहायक (सिमुलेटेड) हूं। मैं आपकी ग्लूकोज लॉग, प्रिस्क्रिप्शन जानकारी, और दवा प्रश्नों में मदद कर सकता हूं। आप क्या जानना चाहेंगे?",
    },
  },
};

const TOPICS = [
  { id: 'diabetes', label: { en: 'Diabetes & Endocrine Health', ta: 'நீரிழிவு & நாளமில்லா சுரப்பி', hi: 'मधुमेह और एंडोक्राइन' }, desc: 'General diabetes education and management' },
  { id: 'cardio', label: { en: 'Heart & Cardiovascular Health', ta: 'இதயம் & இருதய', hi: 'हृदय और कार्डियोवैस्कुलर' }, desc: 'Heart health in diabetes' },
  { id: 'kidney', label: { en: 'Kidney & Urinary Health', ta: 'சிறுநீரகம்', hi: 'किडनी और मूत्र' }, desc: 'Kidney health monitoring' },
  { id: 'respiratory', label: { en: 'Respiratory Health', ta: 'சுவாச ஆரோக்கியம்', hi: 'श्वसन स्वास्थ्य' }, desc: 'Respiratory considerations' },
  { id: 'neuro', label: { en: 'Neurological Health', ta: 'நரம்பு மண்டல', hi: 'न्यूरोलॉजिकल' }, desc: 'Neuropathy and neurological aspects' },
  { id: 'gastro', label: { en: 'Gastrointestinal Health', ta: 'இரைப்பை குடல்', hi: 'गैस्ट्रो' }, desc: 'GI health in diabetes' },
  { id: 'musculo', label: { en: 'Musculoskeletal Health', ta: 'தசைக்கூட்டு', hi: 'मस्कुलोस्केलेटल' }, desc: 'Musculoskeletal considerations' },
  { id: 'derma', label: { en: 'Dermatology', ta: 'தோல் நோய்', hi: 'त्वचा विज्ञान' }, desc: 'Skin health in diabetes' },
  { id: 'maternal', label: { en: 'Maternal & Reproductive Health', ta: 'தாய்மை & இனப்பெருக்க', hi: 'मातृ एवं प्रजनन' }, desc: 'Reproductive health considerations' },
];

const TOPIC_RESPONSE = {
  en: "This section covers education and navigation for {topic}. In a production application, this content would be developed with clinical experts and regularly reviewed. These topics demonstrate the platform's education capabilities, not diagnostic functions. For specific medical questions, please consult your healthcare provider.",
  ta: "இந்த பகுதி {topic} பற்றிய கல்வி மற்றும் வழிகாட்டலை உள்ளடக்கியது. உற்பத்தி பயன்பாட்டில், இந்த உள்ளடக்கம் மருத்துவ நிபுணர்களுடன் உருவாக்கப்படும். குறிப்பிட்ட மருத்துவ கேள்விகளுக்கு, உங்கள் மருத்துவரை அணுகவும்.",
  hi: "यह खंड {topic} के बारे में शिक्षा और नेविगेशन को कवर करता है। प्रोडक्शन एप्लिकेशन में, यह सामग्री क्लिनिकल विशेषज्ञों द्वारा विकसित की जाएगी। विशिष्ट चिकित्सा प्रश्नों के लिए, कृपया अपने डॉक्टर से परामर्श लें।",
};

const FALLBACK = {
  en: "I'm not sure I can fully answer that question. As a simulated AI assistant, my responses are limited to predefined topics. I'd recommend reaching out to your care team for personalized guidance. Would you like me to help you request a counselling session?",
  ta: "அந்த கேள்விக்கு முழுமையாக பதிலளிக்க என்னால் முடியவில்லை. உருவகப்படுத்தப்பட்ட AI உதவியாளராக, எனது பதில்கள் வரையறுக்கப்பட்ட தலைப்புகளுக்கு மட்டுமே. தனிப்பயனாக்கப்பட்ட வழிகாட்டுதலுக்கு உங்கள் பராமரிப்பு குழுவை அணுகுமாறு பரிந்துரைக்கிறேன்.",
  hi: "मैं उस प्रश्न का पूरी तरह से उत्तर देने में असमर्थ हूं। सिमुलेटेड AI सहायक के रूप में, मेरे उत्तर सीमित विषयों तक हैं। व्यक्तिगत मार्गदर्शन के लिए अपनी केयर टीम से संपर्क करें। क्या आप काउंसलिंग सत्र का अनुरोध करना चाहेंगे?",
};

export function getAssistantResponse(message, lang = 'en') {
  const lower = message.toLowerCase();
  const langResponses = RESPONSES[lang] || RESPONSES.en;

  for (const [key, item] of Object.entries(langResponses)) {
    if (item.q.some(keyword => lower.includes(keyword))) {
      return { text: item.a, topic: key, matched: true };
    }
  }

  // Check English as fallback
  if (lang !== 'en') {
    for (const [key, item] of Object.entries(RESPONSES.en)) {
      if (item.q.some(keyword => lower.includes(keyword))) {
        return { text: item.a, topic: key, matched: true };
      }
    }
  }

  // Topic navigation
  for (const topic of TOPICS) {
    if (lower.includes(topic.id) || lower.includes(topic.label.en.toLowerCase())) {
      const resp = (TOPIC_RESPONSE[lang] || TOPIC_RESPONSE.en).replace('{topic}', topic.label[lang] || topic.label.en);
      return { text: resp, topic: topic.id, matched: true };
    }
  }

  return { text: FALLBACK[lang] || FALLBACK.en, topic: 'unknown', matched: false };
}

export function getSuggestedQuestions(lang = 'en') {
  const suggestions = {
    en: [
      'How are my glucose levels trending?',
      'What medicines am I taking?',
      'I missed a dose, what should I do?',
      'When is my next appointment?',
      'Tell me about my HbA1c results',
      'I want to talk to my pharmacist',
      'How can I track my exercise?',
      'What screenings do I need?',
    ],
    ta: [
      'என் குளுக்கோஸ் அளவுகள் எப்படி உள்ளன?',
      'நான் என்ன மருந்துகள் எடுக்கிறேன்?',
      'மருந்தை தவறவிட்டேன், என்ன செய்வது?',
      'என் அடுத்த சந்திப்பு எப்போது?',
    ],
    hi: [
      'मेरा ग्लूकोज लेवल कैसा है?',
      'मैं कौन सी दवाएं ले रहा हूं?',
      'खुराक छूट गई, क्या करूं?',
      'मेरी अगली अपॉइंटमेंट कब है?',
    ],
  };
  return suggestions[lang] || suggestions.en;
}

export { TOPICS };
