// Deterministic local clinical response engine for the AI assistant
// Supports 6 Indian & International Languages: English, Tamil, Hindi, Malayalam, Telugu, Kannada

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', native: 'English', locale: 'en-IN' },
  { code: 'ta', label: 'Tamil', short: 'தமிழ்', native: 'தமிழ்', locale: 'ta-IN' },
  { code: 'hi', label: 'Hindi', short: 'हिंदी', native: 'हिंदी', locale: 'hi-IN' },
  { code: 'ml', label: 'Malayalam', short: 'മലയാളം', native: 'മലയാളം', locale: 'ml-IN' },
  { code: 'te', label: 'Telugu', short: 'తెలుగు', native: 'తెలుగు', locale: 'te-IN' },
  { code: 'kn', label: 'Kannada', short: 'ಕನ್ನಡ', native: 'ಕನ್ನಡ', locale: 'kn-IN' },
];

const RESPONSES = {
  en: {
    glucose: {
      q: ['glucose', 'sugar', 'blood sugar', 'glucose log', 'reading', 'glucose level'],
      a: "Based on your clinical glucose logs, your fasting glucose ranges between 85-130 mg/dL. To analyze your glycemic variability, visit the Glucose Monitor section. If readings are consistently outside your target range, please inform your physician.",
    },
    prescription: {
      q: ['prescription', 'medicine', 'medication', 'what am i taking', 'my medicines', 'drug', 'tablet'],
      a: "You can view your active prescriptions in the Medications section. Each record specifies dosage, frequency, meal instructions, and refill status. Never alter medication doses without your doctor's authorization.",
    },
    missed_dose: {
      q: ['missed dose', 'forgot medicine', 'skip dose', 'what if i miss', 'forgot to take'],
      a: "If you have missed a dose, check your specific medication instructions. Never double your next dose. If unsure, message your clinical pharmacist or doctor through the Messages section.",
    },
    lifestyle: {
      q: ['exercise', 'activity', 'diet', 'food', 'weight', 'sleep', 'lifestyle', 'walking', 'meals'],
      a: "Consistent physical activity (at least 30 minutes daily) combined with a low-glycemic, high-fiber diet significantly improves insulin sensitivity. You can log meals and exercise in the Lifestyle section.",
    },
    investigation: {
      q: ['hba1c', 'test', 'lab', 'investigation', 'report', 'blood test', 'lipid', 'kidney'],
      a: "Your latest diagnostic lab tests are accessible in the Investigations section. Regular quarterly HbA1c tests and annual renal profiles ensure timely detection of any microvascular changes.",
    },
    reminder: {
      q: ['reminder', 'screening', 'appointment', 'when', 'next visit', 'check-up'],
      a: "Check your Screening and Appointments sections for upcoming clinical checks including annual retinal photography, foot exams, and kidney ACR assessments.",
    },
    greeting: {
      q: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'help'],
      a: "Hello! I am Latro AI, your healthcare assistant. How can I assist you with your medications, glucose records, test reminders, or diet plan today?",
    },
  },

  ta: {
    glucose: {
      q: ['குளுக்கோஸ்', 'சர்க்கரை', 'இரத்த சர்க்கரை', 'அளவு', 'ரீடிங்'],
      a: "உங்கள் குளுக்கோஸ் பதிவுகளின்படி, உங்கள் அளவீடுகள் 85-130 mg/dL வரை உள்ளன. போக்குகளைக் கண்காணிக்க குளுக்கோஸ் மானிட்டரைப் பார்க்கவும். தொடர்ந்து அதிகமாகவோ குறைவாகவோ இருந்தால் மருத்துவரை அணுகவும்.",
    },
    prescription: {
      q: ['மருந்து', 'மருந்துச்சீட்டு', 'என்ன எடுக்கிறேன்', 'மாத்திரை'],
      a: "உங்கள் தற்போதைய மருந்துகளை மருந்துகள் பகுதியில் பார்க்கலாம். ஒவ்வொரு மருந்துக்கும் நேரம் மற்றும் உணவு வழிமுறைகள் உள்ளன. மருத்துவ ஆலோசனை இன்றி மருந்தளவை மாற்றாதீர்கள்.",
    },
    missed_dose: {
      q: ['தவறவிட்ட', 'மறந்துவிட்ட', 'மருந்து தவறவிட்டேன்', 'மாத்திரை மறந்தேன்'],
      a: "ஒரு வேளை மருந்தை மறந்தால், அடுத்த முறை இரட்டிப்பு மாத்திரை எடுக்காதீர்கள். சந்தேகங்களுக்கு உங்கள் மருந்தாளர் அல்லது மருத்துவரிடம் ஆலோசனை கேட்கவும்.",
    },
    lifestyle: {
      q: ['உடற்பயிற்சி', 'நடைபயிற்சி', 'உணவு', 'சாப்பாடு', 'எடை', 'தூக்கம்'],
      a: "தினசரி 30 நிமிட உடற்பயிற்சியும் நார்ச்சத்து மிகுந்த குறைந்த சர்க்கரை உணவும் நீரிழிவு கட்டுப்பாட்டுக்கு அவசியம். உங்கள் உணவு மற்றும் உடற்பயிற்சியை லைஃப்ஸ்டைல் பகுதியில் பதிவு செய்யலாம்.",
    },
    investigation: {
      q: ['ஹெச்பிஏ1சி', 'பரிசோதனை', 'ரத்த பரிசோதனை', 'டெஸ்ட்', 'கிட்னி'],
      a: "உங்கள் ஆய்வக பரிசோதனை முடிவுகளை இன்வெஸ்டிகேஷன்ஸ் பகுதியில் பார்க்கலாம். 3 மாதங்களுக்கு ஒருமுறை HbA1c பரிசோதனை செய்வது மிக முக்கியம்.",
    },
    reminder: {
      q: ['நினைவூட்டல்', 'சந்திப்பு', 'அப்பாயின்ட்மென்ட்', 'எப்போது'],
      a: "ஸ்கிரீனிங் மற்றும் அப்பாயின்ட்மென்ட்ஸ் பகுதியில் உங்கள் கண், பாதம் மற்றும் சிறுநீரக பரிசோதனை அட்டவணைகளை நீங்கள் சரிபார்க்கலாம்.",
    },
    greeting: {
      q: ['வணக்கம்', 'ஹலோ', 'உதவி'],
      a: "வணக்கம்! நான் Latro AI உதவியாளர். உங்கள் ரத்த சர்க்கரை, மாத்திரைகள், பரிசோதனை நினைவூட்டல் அல்லது உணவு முறையில் நான் எவ்வாறு உதவ வேண்டும்?",
    },
  },

  hi: {
    glucose: {
      q: ['ग्लूकोज', 'शुगर', 'ब्लड शुगर', 'शर्करा', 'रीडिंग'],
      a: "आपके ग्लूकोज लॉग के अनुसार, आपकी हाल की रीडिंग 85-130 mg/dL के बीच रही हैं। अपने ट्रेंड को बेहतर समझने के लिए, ग्लूकोज मॉनिटर सेक्शन देखें। यदि रीडिंग लगातार असामान्य हो तो डॉक्टर से परामर्श करें।",
    },
    prescription: {
      q: ['दवा', 'प्रिस्क्रिप्शन', 'मेडिसिन', 'गोली', 'क्या ले रहा हूं'],
      a: "आप अपने वर्तमान प्रिस्क्रिप्शन मेडिकेशन सेक्शन में देख सकते हैं। प्रत्येक दवा में खुराक, समय और भोजन के निर्देश दिए गए हैं। बिना डॉक्टर की सलाह के खुराक न बदलें।",
    },
    missed_dose: {
      q: ['खुराक छूट गई', 'दवा भूल गया', 'मिस्ड डोज', 'दवा नहीं ली'],
      a: "यदि आपकी खुराक छूट गई है, तो अगली बार दोहरी खुराक न लें। अपने फार्मासिस्ट या डॉक्टर से सलाह लें।",
    },
    lifestyle: {
      q: ['व्यायाम', 'आहार', 'भोजन', 'डाइट', 'वॉक', 'वजन'],
      a: "रोजाना कम से कम 30 मिनट का व्यायाम और फाइबर युक्त कम ग्लाइसेमिक आहार ब्लड शुगर को नियंत्रित रखने में मदद करता है। आप इसे लाइफस्टाइल सेक्शन में लॉग कर सकते हैं।",
    },
    investigation: {
      q: ['एचबीए1सी', 'जांच', 'लैब', 'टेस्ट', 'खून जांच', 'किडनी'],
      a: "आपके लैब टेस्ट परिणाम इन्वेस्टिगेशन सेक्शन में उपलब्ध हैं। हर 3 महीने में HbA1c टेस्ट कराना आवश्यक है।",
    },
    reminder: {
      q: ['रिमाइंडर', 'स्क्रीनिंग', 'अपॉइंटमेंट', 'डॉक्टर से मिलना'],
      a: "अपनी आगामी आंखों, पैरों और किडनी की जांच की जानकारी के लिए स्क्रीनिंग और अपॉइंटमेंट सेक्शन देखें।",
    },
    greeting: {
      q: ['नमस्ते', 'हेलो', 'मदद', 'सहायता'],
      a: "नमस्ते! मैं Latro AI सहायक हूँ। आज मैं आपकी रक्त शर्करा, दवाओं, टेस्ट रिमाइंडर या डाइट प्लान में कैसे मदद कर सकता हूँ?",
    },
  },

  ml: {
    glucose: {
      q: ['ഗ്ലൂക്കോസ്', 'പഞ്ചസാര', 'ഷുഗർ', 'രക്തത്തിലെ പഞ്ചസാര', 'റീഡിംഗ്'],
      a: "നിങ്ങളുടെ ഗ്ലൂക്കോസ് ലോഗുകൾ പ്രകാരം, നിങ്ങളുടെ റീഡിംഗുകൾ 85-130 mg/dL ന് ഇടയിലാണ്. ട്രെൻഡുകൾ മനസ്സിലാക്കാൻ ഗ്ലൂക്കോസ് മോണിറ്റർ സന്ദർശിക്കുക. റീഡിംഗുകൾ വ്യത്യാസപ്പെട്ടാൽ ഡോക്ടറുമായി സംസാരിക്കുക.",
    },
    prescription: {
      q: ['മരുന്ന്', 'പ്രിസ്ക്രിപ്ഷൻ', 'ഗുളിക', 'എന്താണ് കഴിക്കുന്നത്'],
      a: "നിങ്ങളുടെ നിലവിലെ മരുന്നുകൾ 'മെഡിക്കേഷൻസ്' വിഭാഗത്തിൽ കാണാം. ഓരോ മരുന്നിന്റെയും സമയം, ഡോസ്, ഭക്ഷണ നിർദ്ദേശങ്ങൾ എന്നിവ ലഭ്യമാണ്. ഡോക്ടറുടെ നിർദ്ദേശമില്ലാതെ മരുന്നുകൾ മാറ്റരുത്.",
    },
    missed_dose: {
      q: ['മരുന്ന് മറന്നു', 'ഡോസ് നഷ്ടപ്പെട്ടു', 'ഗുളിക കഴിക്കാൻ മറന്നു'],
      a: "നിങ്ങൾ ഒരു ഡോസ് മറന്നുപോയാൽ, അടുത്ത തവണ ഇരട്ടി ഡോസ് കഴിക്കരുത്. സംശയങ്ങൾക്ക് ഫാർമസിസ്റ്റുമായി ബന്ധപ്പെടുക.",
    },
    lifestyle: {
      q: ['ഭക്ഷണം', 'ഡയറ്റ്', 'വ്യായാമം', 'നടത്തം', 'ഭാരം'],
      a: "പ്രമേഹ നിയന്ത്രണത്തിൽ നിത്യേനയുള്ള വ്യായാമവും നാരുകൾ അടങ്ങിയ സമീകൃതാഹാരവും വളരെ പ്രധാനമാണ്. ഇത് ലൈഫ്സ്റ്റൈൽ വിഭാഗത്തിൽ രേഖപ്പെടുത്താം.",
    },
    investigation: {
      q: ['എച്ച്ബിഎ1സി', 'പരിശോധന', 'ലാബ് ടെസ്റ്റ്', 'രക്തപരിശോധന'],
      a: "നിങ്ങളുടെ ലാബ് പരിശോധനാ ഫലങ്ങൾ ഇൻവെസ്റ്റിഗേഷൻസ് വിഭാഗത്തിൽ ലഭ്യമാണ്. മൂന്നു മാസത്തിലൊരിക്കൽ HbA1c പരിശോധന നടത്തുന്നത് നിർബന്ധമാണ്.",
    },
    reminder: {
      q: ['ഓർമ്മപ്പെടുത്തൽ', 'അപ്പോയിന്റ്മെന്റ്', 'പരിശോധന എപ്പോൾ'],
      a: "സ്ക്രീനിംഗ്, അപ്പോയിന്റ്മെന്റ് വിഭാഗങ്ങളിൽ കണ്ണ്, പാദം, വൃക്ക പരിശോധനാ തീയതികൾ പരിശോധിക്കാവുന്നതാണ്.",
    },
    greeting: {
      q: ['നമസ്കാരം', 'ഹലോ', 'സഹായം'],
      a: "നമസ്കാരം! ഞാൻ Latro AI അസിസ്റ്റന്റാണ്. നിങ്ങളുടെ ഗ്ലൂക്കോസ്, ഗുളികകൾ, ടെസ്റ്റ് റിമൈൻഡറുകൾ അല്ലെങ്കിൽ ഡയറ്റ് പ്ലാൻ എന്നിവയിൽ ഞാൻ എങ്ങനെ സഹായിക്കണം?",
    },
  },

  te: {
    glucose: {
      q: ['గ్లూకోజ్', 'షుగర్', 'బ్లడ్ షుగర్', 'చక్కెర', 'రీడింగ్'],
      a: "మీ గ్లూకోజ్ లాగ్‌ల ప్రకారం, మీ రీడింగ్‌లు 85-130 mg/dL మధ్య ఉన్నాయి. ట్రెండ్‌లను పరిశీలించడానికి గ్లూకోజ్ మానిటర్‌ను సందర్శించండి. రీడింగ్‌లు అసాధారణంగా ఉంటే వైద్యుడిని సంప్రదించండి.",
    },
    prescription: {
      q: ['మందులు', 'ప్రిస్క్రిప్షన్', 'టాబ్లెట్', 'ఏం వాడుతున్నాను', 'మాత్రలు'],
      a: "మీ ప్రస్తుత ప్రిస్క్రిప్షన్‌లను 'మెడికేషన్స్' విభాగంలో చూడవచ్చు. ప్రతి మందు డోస్ మరియు ఆహార సూచనలు ఉంటాయి. వైద్యుల అనుమతి లేకుండా మోతాదు మార్చవద్దు.",
    },
    missed_dose: {
      q: ['మందు మర్చిపోయాను', 'డోస్ మిస్సయింది', 'టాబ్లెట్ వేసుకోలేదు'],
      a: "మీరు డోస్ మిస్ అయితే, తదుపరిసారి డబుల్ డోస్ తీసుకోకండి. మీ ఫార్మసిస్ట్ లేదా డాక్టర్‌ను సంప్రదించండి.",
    },
    lifestyle: {
      q: ['ఆహారం', 'డైట్', 'వ్యాయామం', 'నడక', 'బరువు'],
      a: "రోజూ 30 నిమిషాల వ్యాయామం మరియు పీచు పదార్థాలు ఉన్న తక్కువ గ్లైసెమిక్ ఆహారం షుగర్ నియంత్రణకు ముఖ్యం. జీవనశైలి విభాగంలో వీటిని నమోదు చేయవచ్చు.",
    },
    investigation: {
      q: ['హెచ్‌బిఎ1సి', 'పరీక్ష', 'ల్యాబ్ టెస్ట్', 'రక్త పరీక్ష'],
      a: "మీ ల్యాబ్ పరీక్షల ఫలితాలు ఇన్వెస్టిగేషన్స్ విభాగంలో ఉన్నాయి. ప్రతి 3 నెలలకు ఒకసారి HbA1c పరీక్ష తప్పనిసరి.",
    },
    reminder: {
      q: ['రిమైండర్', 'అపాయింట్‌మెంట్', 'ఎప్పుడు రావాలి'],
      a: "మీ రాబోయే కంటి, పాదాల మరియు కిడ్నీ పరీక్షల షెడ్యూల్ కోసం స్క్రీనింగ్ మరియు అపాయింట్‌మెంట్స్ విభాగాలను చూడండి.",
    },
    greeting: {
      q: ['నమస్కారం', 'హలో', 'సహాయం'],
      a: "నమస్కారం! నేను Latro AI అసిస్టెంట్‌ని. మీ బ్లడ్ షుగర్, మందులు, ల్యాబ్ పరీక్షలు లేదా డైట్ ప్లాన్ గురించి మీకు ఎలా సహాయపడాలి?",
    },
  },

  kn: {
    glucose: {
      q: ['ಗ್ಲೂಕೋಸ್', 'ಸಕ್ಕರೆ', 'ಬ್ಲಡ್ ಶುಗರ್', 'ರೀಡಿಂಗ್', 'ರಕ್ತದ ಸಕ್ಕರೆ'],
      a: "ನಿಮ್ಮ ಗ್ಲೂಕೋಸ್ ಲಾಗ್ ಪ್ರಕಾರ, ನಿಮ್ಮ ರೀಡಿಂಗ್‌ಗಳು 85-130 mg/dL ನಡುವೆ ಇವೆ. ವಿವರಗಳಿಗಾಗಿ ಗ್ಲೂಕೋಸ್ ಮಾನಿಟರ್ ವಿಭಾಗವನ್ನು ನೋಡಿ. ವ್ಯತ್ಯಾಸಗಳಿದ್ದರೆ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    },
    prescription: {
      q: ['ಔಷಧಿ', 'ಮಾತ್ರೆ', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್', 'ಏನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ'],
      a: "ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಔಷಧಿಗಳನ್ನು 'ಮೆಡಿಕೇಶನ್ಸ್' ವಿಭಾಗದಲ್ಲಿ ನೋಡಬಹುದು. ಪ್ರತಿ ಔಷಧಿಯ ಡೋಸ್ ಮತ್ತು ಆಹಾರದ ನಿಯಮಗಳನ್ನು ಅನುಸರಿಸಿ. ವೈದ್ಯರ ಸಲಹೆ ಇಲ್ಲದೆ ಡೋಸ್ ಬದಲಿಸಬೇಡಿ.",
    },
    missed_dose: {
      q: ['ಮಾತ್ರೆ ಮರೆತುಹೋಯಿತು', 'ಡೋಸ್ ತಪ್ಪಿದೆ', 'ಔಷಧಿ ಮರೆತೆ'],
      a: "ನೀವು ಡೋಸ್ ತಪ್ಪಿಸಿಕೊಂಡರೆ, ಮುಂದಿನ ಬಾರಿ ಡಬಲ್ ಡೋಸ್ ತೆಗೆದುಕೊಳ್ಳಬೇಡಿ. ನಿಮ್ಮ ಫಾರ್ಮಸಿಸ್ಟ್ ಅವರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    },
    lifestyle: {
      q: ['ಆಹಾರ', 'ಡಯಟ್', 'ವ್ಯಾಯಾಮ', 'ನಡಿಗೆ', 'ತೂಕ'],
      a: "ದಿನಕ್ಕೆ 30 ನಿಮಿಷಗಳ ನಿಯಮಿತ ವ್ಯಾಯಾಮ ಮತ್ತು ನಾರಿನಂಶವಿರುವ ಸಮತೋಲಿತ ಆಹಾರ ಮಧುಮೇಹ ನಿಯಂತ್ರಣದಲ್ಲಿ ಅತ್ಯಗತ್ಯ. ಇದನ್ನು ಜೀವನಶೈಲಿ ವಿಭಾಗದಲ್ಲಿ ದಾಖಲಿಸಿ.",
    },
    investigation: {
      q: ['ಎಚ್‌ಬಿಎ1ಸಿ', 'ಪರೀಕ್ಷೆ', 'ಲ್ಯಾಬ್ ಟೆಸ್ಟ್', 'ರಕ್ತ ಪರೀಕ್ಷೆ'],
      a: "ನಿಮ್ಮ ಪರೀಕ್ಷಾ ವರದಿಗಳು ಇನ್ವೆಸ್ಟಿಗೇಷನ್ ವಿಭಾಗದಲ್ಲಿ ಲಭ್ಯವಿದೆ. 3 ತಿಂಗಳಿಗೊಮ್ಮೆ HbA1c ಪರೀಕ್ಷೆ ಮಾಡಿಸಿಕೊಳ್ಳುವುದು ಮುಖ್ಯ.",
    },
    reminder: {
      q: ['ನೆನಪಿಸುವಿಕೆ', 'ಅಪಾಯಿಂಟ್ಮೆಂಟ್', 'ಪರೀಕ್ಷೆ ಯಾವಾಗ'],
      a: "ನಿಮ್ಮ ಕಣ್ಣು, ಪಾದ ಮತ್ತು ಮೂತ್ರಪಿಂಡ ಪರೀಕ್ಷೆಗಳ ವಿವರಗಳನ್ನು ಸ್ಕ್ರೀನಿಂಗ್ ವಿಭಾಗದಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.",
    },
    greeting: {
      q: ['ನಮಸ್ಕಾರ', 'ಹಲೋ', 'ಸಹಾಯ'],
      a: "ನಮಸ್ಕಾರ! ನಾನು Latro AI ಸಹಾಯಕ. ನಿಮ್ಮ ರಕ್ತದ ಗ್ಲೂಕೋಸ್, ಮಾತ್ರೆಗಳು, ಪರೀಕ್ಷೆಗಳು ಅಥವಾ ಡಯಟ್ ಪ್ಲಾನ್ ಬಗ್ಗೆ ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    },
  },
};

const TOPICS = [
  { id: 'diabetes', label: { en: 'Diabetes & Endocrine', ta: 'நீரிழிவு & நாளமில்லா சுரப்பி', hi: 'मधुमेह और एंडोक्राइन', ml: 'പ്രമേഹം & എൻഡോക്രൈൻ', te: 'మధుమేహం & ఎండోక్రైన్', kn: 'ಮಧುಮೇಹ ಮತ್ತು ಎಂಡೋಕ್ರೈನ್' }, desc: 'General diabetes education and management' },
  { id: 'cardio', label: { en: 'Heart & Cardiovascular', ta: 'இதயம் & இருதய நலம்', hi: 'हृदय और कार्डियोवैस्कुलर', ml: 'ഹൃദയാരോഗ്യം', te: 'గుండె & కార్డియోవాస్కులర్', kn: 'ಹೃದಯ ಮತ್ತು ರಕ್ತಪರಿಚಲನೆ' }, desc: 'Heart health in diabetes' },
  { id: 'kidney', label: { en: 'Kidney Health', ta: 'சிறுநீரக நலம்', hi: 'किडनी स्वास्थ्य', ml: 'വൃക്ക സംരക്ഷണം', te: 'కిడ్నీ ఆరోగ్యం', kn: 'ಮೂತ್ರಪಿಂಡದ ಆರೋಗ್ಯ' }, desc: 'Kidney health monitoring' },
  { id: 'neuro', label: { en: 'Neuropathy & Nerves', ta: 'நரம்பு மண்டலம் & நரம்பியல்', hi: 'न्यूरोपैथी व तंत्रिका', ml: 'ന്യൂറോപ്പതി & ഞരമ്പ്', te: 'న్యూరోపతి & నరాలు', kn: 'ನರರೋಗ ಮತ್ತು ನರಗಳು' }, desc: 'Neuropathy and sensory care' },
  { id: 'eye', label: { en: 'Eye & Retinopathy', ta: 'கண் & விழித்திரை நலம்', hi: 'आंख व रेटिनोपैथी', ml: 'കണ്ണ് & റെറ്റിനോപ്പതി', te: 'కన్ను & రెటినోపతి', kn: 'ಕಣ್ಣು ಮತ್ತು ರೆಟಿನೋಪತಿ' }, desc: 'Diabetic retinopathy prevention' },
];

const UNMATCHED_QUERY_GUIDANCE = {
  en: "I'm not sure I can fully answer that question. As Latro AI, I can help explain general health and medication topics or walk through instructions on an uploaded prescription. For personal medical decisions, please consult your doctor or pharmacist.",
  ta: "அந்த கேள்விக்கு மருத்துவ வழிகாட்டுதல் தேவை. உங்கள் மருத்துவரிடம் ஆலோசிக்கவும் அல்லது மருந்தாளரிடம் ஆலோசனை அமர்வு கோரவும்.",
  hi: "मैं उस प्रश्न का पूरी तरह से उत्तर देने में असमर्थ हूँ। व्यक्तिगत मार्गदर्शन के लिए अपनी केयर टीम या डॉक्टर से संपर्क करें।",
  ml: "ആ ചോദ്യത്തിന് വ്യക്തിഗത വൈദ്യോപദേശം ആവശ്യമാണ്. നിങ്ങളുടെ ഡോക്ടറുമായി സംസാരിക്കുക അല്ലെങ്കിൽ കൗൺസിലിംഗ് അഭ്യർത്ഥിക്കുക.",
  te: "ఆ ప్రశ్నకు వ్యక్తిగత వైద్య సలహా అవసరం. దయచేసి మీ వైద్యుడిని లేదా ఫార్మసిస్ట్‌ను సంప్రదించండి.",
  kn: "ಆ ಪ್ರಶ್ನೆಗೆ ವೈದ್ಯಕೀಯ ಸಲಹೆ ಅಗತ್ಯವಿದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ ಅಥವಾ ಆಪ್ತಸಮಾಲೋಚನೆಗೆ ವಿನಂತಿಸಿ.",
};

export function getClinicalMedicineDetails(medicineName) {
  const name = (medicineName || '').toLowerCase().trim();

  if (!name || name === 'unclear' || name.includes('unclear') || name.includes('unreadable') || name.includes('illegible')) {
    return {
      name: medicineName || 'Unclear Item',
      isUnclear: true,
      category: 'Unclear Medication',
      adverseEffects: "Flagged as 'unclear' on prescription. LATROCORE safety guardrails strictly do not guess unreadable medicines.",
      lifestyleTips: "Do not take unverified medicines. Please have your clinical pharmacist or doctor verify this entry.",
      timingGuidance: "Unclear on document",
      warningSign: "Requires physician/pharmacist clarification"
    };
  }

  // Metformin (Biguanides)
  if (name.includes('metformin') || name.includes('glycomet') || name.includes('glucophage') || name.includes('riomet')) {
    return {
      name: medicineName,
      isUnclear: false,
      category: 'Biguanide (Insulin Sensitizer)',
      adverseEffects: 'Gastrointestinal upset (nausea, mild diarrhea, abdominal cramping, metallic taste). With long-term use: potential Vitamin B12 depletion. Rare: lactic acidosis.',
      lifestyleTips: 'Always take with or immediately after main meals (breakfast/dinner) to protect your stomach. Avoid binge alcohol consumption. Maintain balanced carbohydrate portions.',
      timingGuidance: 'With meals (usually twice daily with breakfast & dinner)',
      warningSign: 'Severe persistent stomach pain or extreme fatigue'
    };
  }

  // Sulfonylureas (Glimepiride, Gliclazide, Glipizide)
  if (name.includes('glimepiride') || name.includes('gliclazide') || name.includes('glipizide') || name.includes('amaryl') || name.includes('glycomet-gp')) {
    return {
      name: medicineName,
      isUnclear: false,
      category: 'Sulfonylurea (Insulin Secretagogue)',
      adverseEffects: 'Hypoglycemia (shakiness, cold sweat, lightheadedness, sudden hunger, rapid heartbeat), mild weight gain.',
      lifestyleTips: 'Never skip meals after taking this tablet. Always carry 15g fast-acting carbohydrates (glucose tablets, fruit juice, or candy) for emergency hypoglycemia management.',
      timingGuidance: '15 to 30 minutes before your main morning meal (breakfast)',
      warningSign: 'Blood glucose dropping below 70 mg/dL with sweating or tremors'
    };
  }

  // DPP-4 Inhibitors (Sitagliptin, Vildagliptin, Linagliptin, Teneligliptin)
  if (name.includes('sitagliptin') || name.includes('januvia') || name.includes('vildagliptin') || name.includes('galvus') || name.includes('linagliptin') || name.includes('trajenta') || name.includes('teneligliptin')) {
    return {
      name: medicineName,
      isUnclear: false,
      category: 'DPP-4 Inhibitor (Incretin Enhancer)',
      adverseEffects: 'Mild headache, nasopharyngitis (stuffy/runny nose), upper respiratory symptoms. Rare: severe joint pain or pancreatitis.',
      lifestyleTips: 'Can be taken with or without food. Follow a consistent daily schedule. Low hypoglycemia risk when used without sulfonylureas or insulin.',
      timingGuidance: 'Once daily in the morning',
      warningSign: 'Severe persistent abdominal pain that radiates to your back'
    };
  }

  // SGLT2 Inhibitors (Empagliflozin, Dapagliflozin, Canagliflozin)
  if (name.includes('empagliflozin') || name.includes('jardiance') || name.includes('dapagliflozin') || name.includes('forxiga') || name.includes('canagliflozin')) {
    return {
      name: medicineName,
      isUnclear: false,
      category: 'SGLT2 Inhibitor (Renal Glucose Excretion)',
      adverseEffects: 'Genital mycotic infections (yeast infections), urinary tract infections, increased urine output, mild orthostatic dizziness.',
      lifestyleTips: 'Maintain generous fluid intake (2.5 to 3 liters of water daily unless restricted by your doctor) to prevent dehydration. Practice meticulous perineal hygiene.',
      timingGuidance: 'Once daily in the morning with a full glass of water',
      warningSign: 'Burning during urination or severe lightheadedness upon standing'
    };
  }

  // Statins / Lipid Lowering (Atorvastatin, Rosuvastatin)
  if (name.includes('atorvastatin') || name.includes('atorva') || name.includes('rosuvastatin') || name.includes('lipitor') || name.includes('crestor') || name.includes('statin')) {
    return {
      name: medicineName,
      isUnclear: false,
      category: 'HMG-CoA Reductase Inhibitor (Vascular Protection)',
      adverseEffects: 'Myalgia (muscle soreness, tenderness, or stiffness), mild digestive upset. Rare: elevated liver enzymes.',
      lifestyleTips: 'Best taken once daily at bedtime (liver cholesterol synthesis peaks overnight). Avoid grapefruit. Emphasize high-soluble-fiber and low-saturated-fat foods.',
      timingGuidance: 'Bedtime (09:00 PM - 10:00 PM)',
      warningSign: 'Unexplained severe muscle pain or unusually dark (tea-colored) urine'
    };
  }

  // Insulin (Lantus, Glargine, Degludec, Lispro, Aspart, Regular)
  if (name.includes('insulin') || name.includes('lantus') || name.includes('glargine') || name.includes('degludec') || name.includes('lispro') || name.includes('novorapid') || name.includes('humalog') || name.includes('tresiba')) {
    return {
      name: medicineName,
      isUnclear: false,
      category: 'Exogenous Insulin Therapy',
      adverseEffects: 'Hypoglycemia, injection site lipohypertrophy (lumpy tissue from repeated injections), mild weight gain.',
      lifestyleTips: 'Rotate injection sites systematically across abdomen and thighs. Store unopened insulin in the refrigerator (2°C-8°C); in-use pens at room temperature (<30°C) for up to 28 days. Never freeze. Always carry fast-acting glucose.',
      timingGuidance: 'Strict fixed schedule (basal at bedtime, bolus 10-15 min before meals)',
      warningSign: 'Frequent hypoglycemic readings (< 70 mg/dL) or unrotated injection site swelling'
    };
  }

  // Blood Pressure / Cardio-Renal (Telmisartan, Losartan, Amlodipine, Ramipril)
  if (name.includes('telmisartan') || name.includes('losartan') || name.includes('amlodipine') || name.includes('ramipril') || name.includes('cilnidipine')) {
    return {
      name: medicineName,
      isUnclear: false,
      category: 'Antihypertensive / Cardio-Renal Protective',
      adverseEffects: 'Dizziness upon standing (postural hypotension), ankle swelling (amlodipine), dry cough (ACE inhibitors).',
      lifestyleTips: 'Stand up slowly from sitting or lying down. Limit dietary sodium to < 2000mg/day. Stay hydrated.',
      timingGuidance: 'Morning or bedtime as directed by your physician',
      warningSign: 'Pronounced dizziness upon standing or sudden facial swelling'
    };
  }

  // Generic fallback strictly bounded to the prescription
  return {
    name: medicineName,
    isUnclear: false,
    category: 'Prescribed Regimen',
    adverseEffects: 'Review package insert and consult your clinical pharmacist for potential drug-specific side effects.',
    lifestyleTips: 'Take strictly according to your prescription schedule. Maintain consistent meal timings and adequate hydration.',
    timingGuidance: 'As prescribed',
    warningSign: 'Any unexpected rash, difficulty breathing, or severe discomfort'
  };
}

export function formatPrescriptionInsights(medicines = []) {
  if (!medicines || medicines.length === 0) {
    return {
      medications: [],
      adverseEffects: [],
      lifestyleTips: [],
      schedules: [],
      warningSigns: [],
    };
  }

  const items = medicines.map(m => {
    const medName = typeof m === 'string' ? m : m.name;
    const info = getClinicalMedicineDetails(medName);
    const doseStr = typeof m === 'object' && m.dose ? m.dose : 'unclear';
    const timingStr = typeof m === 'object' && (m.meal_timing || m.foodInstruction || m.frequency) ? (m.meal_timing || m.foodInstruction || m.frequency) : info.timingGuidance;

    return {
      ...info,
      name: medName,
      dose: doseStr,
      timing: timingStr,
    };
  });

  const adverseEffects = items
    .filter(i => !i.isUnclear && i.adverseEffects)
    .map(i => ({
      medicine: `${i.name} (${i.dose})`,
      category: i.category,
      effects: [i.adverseEffects],
    }));

  const warningSigns = items
    .filter(i => !i.isUnclear && i.warningSign)
    .map(i => `${i.name}: ${i.warningSign}`);

  const lifestyleTips = items
    .filter(i => !i.isUnclear && i.lifestyleTips)
    .map(i => ({
      medicine: `${i.name} (${i.category})`,
      tip: i.lifestyleTips,
    }));

  const schedules = items
    .filter(i => !i.isUnclear)
    .map(i => ({
      medicine: `${i.name} (${i.dose})`,
      timing: i.timing,
      instruction: `${i.timingGuidance}. Food instruction: ${i.timing}`,
    }));

  return {
    medications: items,
    adverseEffects,
    lifestyleTips,
    schedules,
    warningSigns,
  };
}

const COMPANION_TOPIC_MATCHERS = [
  {
    topic: 'language-support',
    sources: ['ADA Standards of Care 2024', 'LATROCORE Tamil Language Support'],
    matches: (lower) => lower.includes('tamil') && (lower.includes('glucose') || lower.includes('sugar') || lower.includes('log')),
    text:
      '**குளுக்கோஸ் பதிவு (Glucose Log) விளக்கம்:**\n\n' +
      'குளுக்கோஸ் பதிவு என்பது உங்கள் தினசரி இரத்த சர்க்கரை அளவுகளை நேரம் மற்றும் உணவு விவரங்களுடன் தொடர்ந்து பதிவு செய்யும் ஒரு சுகாதார குறிப்பேடு ஆகும்.\n\n' +
      '• **எப்போது பதிவு செய்ய வேண்டும்:** வெறும் வயிற்றில் (Fasting), உணவுக்கு முன், மற்றும் உணவு முடிந்து 2 மணி நேரத்திற்குப் பிறகு.\n' +
      '• **எவற்றை குறிக்க வேண்டும்:** தேதி, நேரம், இரத்த சர்க்கரை அளவு (mg/dL), சாப்பிட்ட உணவு, மற்றும் எடுத்துக்கொண்ட மருந்து விவரம்.\n' +
      '• **பொதுவான இலக்கு (ADA):** உணவுக்கு முன் 80–130 mg/dL மற்றும் உணவு முடிந்து 2 மணி நேரத்தில் 180 mg/dL-க்கும் குறைவாக.\n\n' +
      'இந்தப் பதிவு உங்கள் மருத்துவர் சிகிச்சை மற்றும் உணவுத் திட்டத்தை பாதுகாப்பாக மேம்படுத்த உதவும்.',
  },
  {
    topic: 'visit-preparation',
    sources: ['ADA Standards of Care 2024', 'LATROCORE Pharmacy Guidance'],
    matches: (lower) => lower.includes('pharmacist') && (lower.includes('refill') || lower.includes('ask') || lower.includes('prescription')),
    text:
      '**Helpful Questions to Ask Your Pharmacist About Refills:**\n\n' +
      '• **Remaining Refills:** "How many refills are left on this prescription, and when should I request a doctor renewal?"\n' +
      '• **Timing & Synchronization:** "Can we align refill pickup dates or set advance alerts so I do not run out?"\n' +
      '• **Manufacturer Consistency:** "If the generic brand changes, is the active ingredient and strength identical?"\n' +
      '• **Meal Timing & Interactions:** "Are there any updates to food timing or over-the-counter interactions I should watch for?"\n\n' +
      'Bring your current medicine strips or bottle labels so your pharmacist can review them accurately.',
  },
  {
    topic: 'medicine-reminders',
    sources: ['LATROCORE Medication Adherence', 'ADA Standards of Care 2024'],
    matches: (lower) => lower.includes('refill reminder') || (lower.includes('refill') && lower.includes('reminder')),
    text:
      '**How Refill Reminders Work:**\n\n' +
      '• **Tracks Remaining Supply:** Using your prescribed daily schedule and start date, Latrocore estimates when your medicines, test strips, or insulin will run low.\n' +
      '• **Advance Notifications:** Reminders arrive several days before your supply ends so you have time to visit your pharmacy or request a prescription renewal.\n' +
      '• **Prevents Missed Doses:** Timely refills keep your daily treatment consistent between clinic appointments.\n\n' +
      'Once signed in, you can review prescriptions and refill dates anytime in your Medications section.',
  },
  {
    topic: 'glucose-logs',
    sources: ['ADA Standards of Care 2024', 'NIDDK Blood Glucose Monitoring'],
    matches: (lower) =>
      lower.includes('glucose log') &&
      (lower.includes('record') || lower.includes('what should') || lower.includes('track') || lower.includes('write')),
    text:
      '**What to Record in Your Glucose Log:**\n\n' +
      '• **Date, Time & Reading:** Note every glucometer or CGM reading in mg/dL with the exact time.\n' +
      '• **Meal Context:** Label readings as **Fasting** (before breakfast), **Pre-meal**, **Post-meal** (1–2 hours after eating), or **Bedtime**.\n' +
      '• **Food & Portions:** Briefly jot down meals or carbohydrate choices to see which foods raise glucose.\n' +
      '• **Medicines, Activity & Symptoms:** Log doses taken, walks or exercise, and symptoms like dizziness, sweating, or fatigue.\n\n' +
      'For many adults, general ADA targets are **80–130 mg/dL pre-meal** and **below 180 mg/dL post-meal**.',
  },
  {
    topic: 'lab-tests',
    sources: ['ADA Standards of Care 2024', 'NIDDK The A1C Test & Diabetes'],
    matches: (lower) =>
      (lower.includes('hba1c') || lower.includes('a1c') || lower.includes('glycated hemoglobin')) &&
      (lower.includes('mean') || lower.includes('what does') || lower.includes('what is') || lower.includes('explain')),
    text:
      '**What HbA1c Means:**\n\n' +
      'HbA1c (glycated hemoglobin) measures the percentage of sugar attached to your red blood cells, showing your **average blood glucose over the past 2 to 3 months**.\n\n' +
      '• **Below 5.7%:** Normal range\n' +
      '• **5.7% – 6.4%:** Prediabetes range\n' +
      '• **6.5% or higher:** Diabetes diagnostic range\n' +
      '• **Common Diabetes Target:** Below **7.0%** for many non-pregnant adults (ADA), though your doctor personalizes your goal.',
  },
  {
    topic: 'meal-planning',
    sources: ['ADA Diabetes Plate Method', 'NIN / ICMR Dietary Guidelines'],
    matches: (lower) =>
      (lower.includes('rice') && (lower.includes('dal') || lower.includes('vegetable'))) ||
      lower.includes('balanced meal') ||
      lower.includes('plate method'),
    text:
      '**Building a Balanced Plate with Rice, Dal & Vegetables:**\n\n' +
      '• **Half Plate (50%) Non-Starchy Vegetables:** Fill half your plate with high-fiber vegetables (greens, cucumber, broccoli, carrots, beans) to blunt post-meal sugar spikes.\n' +
      '• **Quarter Plate (25%) Protein-Rich Dal:** Add thick dal, sambar, chana, or legumes for protein and soluble fiber.\n' +
      '• **Quarter Plate (25%) Rice:** Measure cooked rice to one-quarter of the plate, choosing brown, hand-pounded, or portioned white rice.\n' +
      '• **Eating Order Tip:** Eat vegetables and dal before rice to slow carbohydrate absorption.',
  },
  {
    topic: 'daily-activity',
    sources: ['ADA Physical Activity Guidelines 2024', 'WHO Physical Activity Guidance'],
    matches: (lower) =>
      lower.includes('workday') ||
      ((lower.includes('short walk') || lower.includes('walks') || lower.includes('walking')) &&
        (lower.includes('fit') || lower.includes('work') || lower.includes('office') || lower.includes('desk'))),
    text:
      '**Fitting Short Walks Into Your Workday:**\n\n' +
      '• **10-Minute Post-Meal Walks:** A brisk 10–15 minute walk after lunch or dinner helps muscles clear blood sugar and flattens post-meal peaks.\n' +
      '• **Hourly Movement Breaks:** Stand up for a 3–5 minute hallway loop, climb one flight of stairs, or take routine calls while walking.\n' +
      '• **Split Your 30 Minutes:** Three short 10-minute walks (morning commute, lunch break, evening) meet your daily activity goal.\n\n' +
      'If you take insulin or sulfonylureas, keep a fast-acting carbohydrate snack nearby during activity.',
  },
];

function matchCompanionEducationalQuery(lower) {
  for (const matcher of COMPANION_TOPIC_MATCHERS) {
    if (matcher.matches(lower)) {
      return {
        text: matcher.text,
        topic: matcher.topic,
        matched: true,
        sources: matcher.sources,
      };
    }
  }
  return null;
}

const GENERAL_MEDICINE_INFO = {
  metformin: 'Metformin is commonly used to help lower blood sugar in people with type 2 diabetes (and is sometimes used for prediabetes or PCOS) by decreasing glucose production in the liver and helping the body respond better to insulin.',
  insulin: 'Insulin is a hormone medicine used to lower blood sugar when the body does not make enough insulin or cannot use it effectively.',
  glimepiride: 'Glimepiride is a sulfonylurea medicine commonly used in type 2 diabetes to help the pancreas release more insulin to lower blood sugar.',
  gliclazide: 'Gliclazide is a sulfonylurea medicine used to help control blood sugar in type 2 diabetes by stimulating insulin release from the pancreas.',
  glipizide: 'Glipizide is a sulfonylurea medicine commonly used to help lower blood sugar levels in adults with type 2 diabetes.',
  sitagliptin: 'Sitagliptin is a DPP-4 inhibitor used alongside diet and exercise to help control blood sugar in adults with type 2 diabetes.',
  empagliflozin: 'Empagliflozin is an SGLT2 inhibitor used to help lower blood sugar in type 2 diabetes and reduce heart and kidney risks in certain patients.',
  dapagliflozin: 'Dapagliflozin is an SGLT2 inhibitor used to treat type 2 diabetes and support heart and kidney health in eligible patients.',
  atorvastatin: 'Atorvastatin is a statin medicine commonly used to lower LDL ("bad") cholesterol and reduce the risk of heart attack and stroke.',
  rosuvastatin: 'Rosuvastatin is a statin medicine commonly used to lower cholesterol and triglycerides and reduce cardiovascular risk.',
  telmisartan: 'Telmisartan is an angiotensin receptor blocker (ARB) commonly used to treat high blood pressure and protect cardiovascular health.',
  losartan: 'Losartan is an angiotensin receptor blocker (ARB) commonly used to treat high blood pressure and help protect the kidneys in people with diabetes.',
  amlodipine: 'Amlodipine is a calcium channel blocker commonly used to treat high blood pressure and chest pain (angina).',
  aspirin: 'Aspirin is commonly used at low doses in specific patients to reduce blood clot risk, and at higher doses to relieve pain, fever, or inflammation.',
  warfarin: 'Warfarin is an anticoagulant (blood thinner) used to help prevent and treat harmful blood clots under close laboratory monitoring.',
  ibuprofen: 'Ibuprofen is a nonsteroidal anti-inflammatory drug (NSAID) commonly used to relieve mild-to-moderate pain, swelling, and fever.',
  paracetamol: 'Paracetamol (acetaminophen) is commonly used to relieve mild-to-moderate pain and reduce fever.',
  acetaminophen: 'Acetaminophen (paracetamol) is commonly used to relieve mild-to-moderate pain and reduce fever.',
  amoxicillin: 'Amoxicillin is a penicillin-type antibiotic commonly used to treat bacterial infections.',
  azithromycin: 'Azithromycin is a macrolide antibiotic commonly used to treat certain bacterial infections.',
  omeprazole: 'Omeprazole is a proton pump inhibitor (PPI) commonly used to reduce stomach acid in conditions such as acid reflux (GERD) and ulcers.',
  pantoprazole: 'Pantoprazole is a proton pump inhibitor (PPI) commonly used to reduce excess stomach acid and treat acid reflux or ulcers.',
  salbutamol: 'Salbutamol (albuterol) is a bronchodilator commonly used as a reliever inhaler to relax airway muscles and ease wheezing or shortness of breath in asthma or COPD.',
  albuterol: 'Albuterol (salbutamol) is a bronchodilator commonly used as a reliever inhaler to relax airway muscles and ease wheezing or shortness of breath in asthma or COPD.',
};

const GENERAL_CONDITION_INFO = {
  asthma: 'Asthma is a long-term lung condition in which the airways become inflamed, narrowed, and sensitive to triggers, causing symptoms such as wheezing, coughing, chest tightness, or shortness of breath.',
  'type 2 diabetes': 'Type 2 diabetes is a condition where blood sugar (glucose) stays higher than normal because the body does not respond well to insulin or does not make enough insulin.',
  'type 1 diabetes': 'Type 1 diabetes is an autoimmune condition where the pancreas makes little or no insulin, so insulin replacement is needed to manage blood sugar.',
  diabetes: 'Diabetes mellitus is a chronic condition characterized by elevated blood sugar (glucose) levels because the body either does not produce enough insulin or cannot use insulin effectively.',
  hypertension: 'Hypertension (high blood pressure) means the force of blood pushing against artery walls stays consistently above healthy levels, increasing long-term strain on the heart, brain, and kidneys.',
  'high blood pressure': 'High blood pressure (hypertension) occurs when blood flows through the arteries at persistently elevated pressure, which can strain the heart and blood vessels over time.',
  'high cholesterol': 'High cholesterol means having excess lipids (especially LDL cholesterol) in the blood, which can gradually build up inside blood vessels.',
  hyperlipidemia: 'Hyperlipidemia refers to elevated levels of fats (cholesterol or triglycerides) in the blood.',
  hypoglycemia: 'Hypoglycemia means abnormally low blood sugar (often below 70 mg/dL), which can cause shakiness, sweating, dizziness, or confusion and needs prompt treatment.',
  hyperglycemia: 'Hyperglycemia means elevated blood sugar levels, which over time can cause increased thirst, frequent urination, fatigue, and long-term organ strain.',
  neuropathy: 'Neuropathy refers to nerve damage — often causing tingling, numbness, or burning pain in the feet or hands — commonly monitored in people with diabetes.',
  nephropathy: 'Diabetic nephropathy is kidney strain or damage caused over time by high blood sugar or high blood pressure.',
  retinopathy: 'Diabetic retinopathy is damage to the small blood vessels of the eye’s retina, which is why regular dilated eye exams are recommended.',
};

function parsePrescriptionContextLines(prescriptionContext) {
  if (!prescriptionContext || typeof prescriptionContext !== 'string') return [];
  const lines = prescriptionContext.split('\n').filter((l) => l.trim().startsWith('-'));
  return lines.map((line) => {
    const clean = line.replace(/^-\s*/, '').trim();
    if (clean.includes('|')) {
      const parts = clean.split('|').map((p) => p.trim());
      const med = { name: parts[0] };
      for (const part of parts.slice(1)) {
        const idx = part.indexOf(':');
        if (idx === -1) continue;
        const k = part.slice(0, idx).trim().toLowerCase();
        const v = part.slice(idx + 1).trim();
        if (k === 'dose') med.dose = v;
        else if (k === 'route') med.route = v;
        else if (k === 'frequency') med.frequency = v;
        else if (k === 'schedule times') med.scheduleTimes = v === 'not specified' ? [] : v.split(',').map((s) => s.trim());
        else if (k === 'meal timing') med.mealTiming = v;
        else if (k === 'instructions') med.instructions = v;
      }
      return med;
    }
    const match = clean.match(/^([^(]+)(?:\((.*)\))?/);
    if (match) {
      const med = { name: match[1].trim(), raw: match[2] || '' };
      const doseMatch = med.raw.match(/Dose:\s*([^,]+)/i);
      const freqMatch = med.raw.match(/Frequency:\s*([^,]+)/i);
      const mealMatch = med.raw.match(/Meal Timing:\s*([^,)]+)/i);
      if (doseMatch) med.dose = doseMatch[1].trim();
      if (freqMatch) med.frequency = freqMatch[1].trim();
      if (mealMatch) med.mealTiming = mealMatch[1].trim();
      return med;
    }
    return { name: clean };
  });
}

function isMissingOrUnclear(val) {
  if (!val) return true;
  if (Array.isArray(val)) return val.length === 0;
  const s = String(val).trim().toLowerCase();
  return (
    !s ||
    s === 'not specified' ||
    s === 'unclear' ||
    s === 'unreadable' ||
    s === 'illegible' ||
    s === 'as directed' ||
    s === 'as prescribed' ||
    s === 'none'
  );
}

function getMedicineTimingValue(med) {
  const times = Array.isArray(med.scheduleTimes) && med.scheduleTimes.length > 0
    ? med.scheduleTimes.join(', ')
    : (Array.isArray(med.times) && med.times.length > 0 ? med.times.join(', ') : '');
  const meal = med.mealTiming || med.foodInstruction || med.meal_timing || med.timing || '';
  const freq = med.frequency || '';
  const instr = med.instructions || '';
  return {
    times: isMissingOrUnclear(times) ? null : times,
    meal: isMissingOrUnclear(meal) ? null : meal,
    freq: isMissingOrUnclear(freq) ? null : freq,
    instr: isMissingOrUnclear(instr) ? null : instr,
  };
}

function formatMissingCheckMessage(fieldLabel, medName) {
  return `The ${fieldLabel} for **${medName}** is not clearly specified or is unreadable on the uploaded prescription. Under Latro AI safety rules, I will not guess missing dosing instructions — please check with your pharmacist or prescriber.`;
}

export function getAssistantResponse(message, lang = 'en', prescriptionContext = null, activeMedicines = null, history = []) {
  const lower = (message || '').toLowerCase().trim();

  // Merge activeMedicines with parsed prescriptionContext lines so timing/dose/meal fields are preserved
  const parsedFromContext = parsePrescriptionContextLines(prescriptionContext);
  let meds = Array.isArray(activeMedicines) && activeMedicines.length > 0
    ? activeMedicines.map((m) => {
        const ctxMatch = parsedFromContext.find((c) => (c.name || '').toLowerCase() === (m.name || '').toLowerCase());
        return ctxMatch ? { ...ctxMatch, ...m } : m;
      })
    : parsedFromContext;

  const isMedicationAlterationRequest =
    /\b(should i|can i|shall i)\s+(start|stop|discontinue|change|increase|decrease|double|take)\b/.test(lower) ||
    /\b(increase|decrease|change|adjust)\s+(my|the)\s+(dose|dosage|medicine|medication)\b/.test(lower) ||
    /\bwhat dose should i take\b/.test(lower);

  const isGeneralInfoQuestion =
    /^(what is|what's|whats|what are|what does|tell me about|explain|define)\b/.test(lower) ||
    /\bused for\b/.test(lower) ||
    /\bwhat .* mean\b/.test(lower);

  // Strict Prescription Guardrail when user asks about taking/starting an outside drug with their prescription
  if (meds.length > 0 && isMedicationAlterationRequest) {
    const commonOutsideDrugs = ['aspirin', 'warfarin', 'ibuprofen', 'paracetamol', 'adderall', 'tramadol', 'digoxin', 'pantoprazole', 'amoxicillin', 'azithromycin', 'omeprazole'];
    const detectedNamesLower = meds.map((m) => (m.name || '').toLowerCase());
    const queriedOutsideDrug = commonOutsideDrugs.find((d) => lower.includes(d) && !detectedNamesLower.some((n) => n.includes(d)));

    if (queriedOutsideDrug) {
      return {
        text: `🔒 **Strict Prescription Guardrail Active:**\n\n**"${queriedOutsideDrug.toUpperCase()}"** is not listed in your synchronized Active Prescriptions.\n\nUnder LATROCORE clinical safety guardrails, I cannot advise starting, stopping, or taking outside medicines alongside your verified prescription (${meds.map((m) => m.name).join(', ')}). Please consult your physician or clinical pharmacist.`,
        topic: 'prescription',
        matched: true,
        sources: ['Strict Prescription Guardrail', 'Verified Prescription Context']
      };
    }

    return {
      text: 'For safety, I cannot advise starting, stopping, changing a medicine, or choosing a personal dose. Please consult your prescriber or pharmacist before making any changes to your treatment.',
      topic: 'safety',
      matched: true,
      sources: ['Latro AI Clinical Safety Guardrail']
    };
  }

  // General medicine / condition Q&A (available to everyone, with or without an uploaded prescription)
  if (isGeneralInfoQuestion) {
    for (const [cond, summary] of Object.entries(GENERAL_CONDITION_INFO)) {
      if (lower.includes(cond)) {
        return {
          text: `${summary}\n\nThis is general educational information. If you have questions about your own symptoms or care, please consult a qualified healthcare professional.`,
          topic: 'general-condition',
          matched: true,
          sources: ['Latro AI General Health Information']
        };
      }
    }

    for (const [drug, summary] of Object.entries(GENERAL_MEDICINE_INFO)) {
      if (lower.includes(drug)) {
        const isPrescribed = meds.some((m) => (m.name || '').toLowerCase().includes(drug));
        const outsideNote = meds.length > 0 && !isPrescribed
          ? `\n\n*Note: This is general information only — ${drug.charAt(0).toUpperCase() + drug.slice(1)} is not listed in your currently synced prescription.*`
          : '';
        return {
          text: `${summary}${outsideNote}\n\nNever start, stop, or change a dose without guidance from your prescriber or pharmacist.`,
          topic: 'general-medicine',
          matched: true,
          sources: ['Latro AI General Medication Information']
        };
      }
    }
  }

  // Resolve follow-up pronouns ("that medicine", "this medicine", "it") using conversation history
  const hasPronounFollowup = /\b(this medicine|that medicine|this medication|that medication|this drug|that drug|this tablet|that tablet|that one|this one)\b/.test(lower);
  const directMedMatches = meds.filter((m) => {
    const baseName = (m.name || '').toLowerCase().split(/\s+/)[0];
    return (m.name && lower.includes(m.name.toLowerCase())) || (baseName && baseName.length > 2 && lower.includes(baseName));
  });

  let historyResolvedMeds = [];
  if (hasPronounFollowup && directMedMatches.length === 0 && Array.isArray(history) && history.length > 0 && meds.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const histText = String(history[i]?.content || history[i]?.text || '').toLowerCase();
      if (!histText) continue;
      const foundInTurn = meds.filter((m) => {
        const baseName = (m.name || '').toLowerCase().split(/\s+/)[0];
        return (m.name && histText.includes(m.name.toLowerCase())) || (baseName && baseName.length > 2 && histText.includes(baseName));
      });
      if (foundInTurn.length === 1) {
        historyResolvedMeds = foundInTurn;
        break;
      }
    }
  }

  // Follow-up general question about "that medicine" when no prescription matched
  if (hasPronounFollowup && meds.length === 0 && Array.isArray(history) && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const histText = String(history[i]?.content || history[i]?.text || '').toLowerCase();
      for (const [drug, summary] of Object.entries(GENERAL_MEDICINE_INFO)) {
        if (histText.includes(drug)) {
          return {
            text: `Regarding **${drug.charAt(0).toUpperCase() + drug.slice(1)}**: ${summary}\n\nThis is general information only. Please consult your pharmacist or prescriber for personal dosing guidance.`,
            topic: 'general-medicine',
            matched: true,
            sources: ['Latro AI General Medication Information']
          };
        }
      }
    }
  }

  const companionMatch = matchCompanionEducationalQuery(lower);
  if (companionMatch) {
    return companionMatch;
  }

  if (meds.length > 0) {
    const isAdverseQuery = lower.includes('side effect') || lower.includes('adverse') || lower.includes('reaction') || lower.includes('risk');
    const isLifestyleQuery = lower.includes('lifestyle') || lower.includes('diet') || lower.includes('food') || lower.includes('eat') || lower.includes('exercise') || lower.includes('walking') || lower.includes('water') || lower.includes('hydration') || lower.includes('tip');
    const isTimingQuery = lower.includes('timing') || lower.includes('when to take') || lower.includes('when should') || lower.includes('schedule') || lower.includes('before food') || lower.includes('after food') || lower.includes('meal');
    const isMedQuery = isTimingQuery || lower.includes('medicine') || lower.includes('medication') || lower.includes('tablet') || lower.includes('prescription') || lower.includes('what am i taking') || lower.includes('dose') || lower.includes('dosage') || lower.includes('written');
    const isMissedDose = lower.includes('missed') || lower.includes('forgot') || lower.includes('skip');

    // Legacy guardrail check when user asks whether to take an unprescribed drug without general "what is" framing
    if (!isGeneralInfoQuestion) {
      const commonOutsideDrugs = ['aspirin', 'warfarin', 'ibuprofen', 'paracetamol', 'adderall', 'tramadol', 'digoxin', 'pantoprazole', 'amoxicillin', 'azithromycin', 'omeprazole'];
      const detectedNamesLower = meds.map((m) => (m.name || '').toLowerCase());
      const queriedOutsideDrug = commonOutsideDrugs.find((d) => lower.includes(d) && !detectedNamesLower.some((n) => n.includes(d)));
      if (queriedOutsideDrug) {
        return {
          text: `🔒 **Strict Prescription Guardrail Active:**\n\n**"${queriedOutsideDrug.toUpperCase()}"** is not listed in your synchronized Active Prescriptions.\n\nUnder LATROCORE clinical safety guardrails, our AI is strictly locked to your verified prescription medicines (${meds.map((m) => m.name).join(', ')}). We do not suggest unprescribed outside drugs without your physician or clinical pharmacist's verified order.`,
          topic: 'prescription',
          matched: true,
          sources: ['Strict Prescription Guardrail', 'Verified Prescription Context']
        };
      }
    }

    if (isAdverseQuery) {
      const targets = directMedMatches.length > 0 ? directMedMatches : (historyResolvedMeds.length > 0 ? historyResolvedMeds : meds);
      const adverseList = targets.map((m) => {
        const info = getClinicalMedicineDetails(m.name);
        if (info.isUnclear || (m.dose && String(m.dose).toLowerCase().includes('unclear'))) {
          return `• ⚠️ **${m.name || 'Unclear Item'}** (Dose: ${m.dose || 'unclear'})\n  Status: Entry was unreadable or unclear on prescription. Under LATROCORE strict safety guardrails, we do not guess medicines or dosages. Please have your pharmacist verify this item.`;
        }
        return `• **${m.name}** (${info.category})\n  - **Potential Adverse Effects:** ${info.adverseEffects}\n  - **Clinical Warning Sign:** ${info.warningSign}`;
      }).join('\n\n');

      return {
        text: `Based on your synchronized prescription, here are the potential adverse effects and safety precautions strictly for your detected medicines:\n\n${adverseList}\n\n🔒 **Strict Prescription Guardrail:** Only medications detected in your verified prescription are detailed above. Zero outside medications or unprescribed drugs are suggested. If any symptom is severe, inform your physician immediately.`,
        topic: 'prescription',
        matched: true,
        sources: ['Verified Electronic Prescription', 'ADA Standards of Care 2024']
      };
    }

    if (isLifestyleQuery) {
      const targets = directMedMatches.length > 0 ? directMedMatches : (historyResolvedMeds.length > 0 ? historyResolvedMeds : meds);
      const lifestyleList = targets.map((m) => {
        const info = getClinicalMedicineDetails(m.name);
        if (info.isUnclear) {
          return `• **${m.name || 'Unclear Item'}**: Entry marked unclear. Please check with your pharmacist or prescriber.`;
        }
        return `• **${m.name}** (${info.category})\n  - **Diet & Routine Tip:** ${info.lifestyleTips}`;
      }).join('\n\n');

      return {
        text: `Here is your personalized lifestyle and dietary guidance coordinated with your prescribed medications:\n\n${lifestyleList}\n\n🔒 **Strict Prescription Guardrail:** Tips are customized exclusively around your detected prescription medicines without hallucinating outside therapies.`,
        topic: 'lifestyle',
        matched: true,
        sources: ['Verified Electronic Prescription', 'ADA Medical Nutrition Therapy 2024']
      };
    }

    if (isMedQuery || isMissedDose) {
      // Ambiguous multi-medicine follow-up ("this medicine" / "that medicine" with >1 synced medicines)
      if (hasPronounFollowup && directMedMatches.length === 0 && historyResolvedMeds.length === 0 && meds.length > 1) {
        return {
          text: `You have multiple medicines on your prescription (${meds.map((m) => m.name).join(', ')}). Which medicine do you mean?`,
          topic: 'prescription',
          matched: true,
          sources: ['Verified Electronic Prescription']
        };
      }

      const targetMeds = directMedMatches.length > 0
        ? directMedMatches
        : (historyResolvedMeds.length > 0 ? historyResolvedMeds : meds);

      if (targetMeds.length === 1 && isTimingQuery) {
        const m = targetMeds[0];
        const t = getMedicineTimingValue(m);
        const doseStr = isMissingOrUnclear(m.dose) ? 'not clearly specified / unclear' : m.dose;
        const missingParts = [];
        if (!t.meal && !t.times && !t.instr) missingParts.push('timing / meal instruction');
        if (!t.freq) missingParts.push('frequency');

        if (!t.meal && !t.times && !t.instr) {
          return {
            text: `On your prescription for **${m.name}** (Dose: ${doseStr}${t.freq ? `, Frequency: ${t.freq}` : ''}), ${formatMissingCheckMessage('specific timing or meal instruction', m.name)}`,
            topic: 'prescription',
            matched: true,
            sources: ['Verified Electronic Prescription']
          };
        }

        const timingDetails = [t.freq, t.meal, t.times, t.instr].filter(Boolean).join(' · ');
        const unclearExtra = missingParts.length > 0
          ? ` Note: The ${missingParts.join(' and ')} is missing or unclear on the document — please confirm with your pharmacist or prescriber.`
          : '';
        return {
          text: `According to your uploaded prescription for **${m.name}**:\n• **Dose:** ${doseStr}\n• **Written Timing / Instructions:** ${timingDetails}.${unclearExtra}`,
          topic: 'prescription',
          matched: true,
          sources: ['Verified Electronic Prescription']
        };
      }

      const scheduleList = targetMeds.map((m) => {
        const t = getMedicineTimingValue(m);
        const doseStr = isMissingOrUnclear(m.dose) ? 'unclear / not specified on document' : m.dose;
        const timingParts = [t.freq, t.meal, t.times, t.instr].filter(Boolean);
        const timingStr = timingParts.length > 0
          ? timingParts.join(' · ')
          : 'Timing not clearly specified on document — please check with your pharmacist or prescriber';
        return `• **${m.name}**\n  - Dose: ${doseStr}\n  - Written Timing & Instructions: ${timingStr}`;
      }).join('\n\n');

      return {
        text: `Here are the details from your uploaded prescription:\n\n${scheduleList}\n\n` +
          (isMissedDose ? `⚠️ **Missed Dose Rule:** If you miss a dose, check the written label or ask your pharmacist/prescriber before deciding when to take it, and never take a double dose to compensate.\n\n` : '') +
          `🔒 **Strict Prescription Guardrail:** Only medications and instructions present in your prescription are listed above. Any missing or unreadable details should be verified with your pharmacist or prescriber.`,
        topic: 'prescription',
        matched: true,
        sources: ['Verified Electronic Prescription', 'ADA Standards of Care 2024']
      };
    }
  }

  const langResponses = RESPONSES[lang] || RESPONSES.en;

  for (const [key, item] of Object.entries(langResponses)) {
    if (item.q.some(keyword => lower.includes(keyword.toLowerCase()))) {
      return { text: item.a, topic: key, matched: true, sources: ['ADA Standards of Care 2024'] };
    }
  }

  // Check English fallback keywords
  if (lang !== 'en') {
    for (const [key, item] of Object.entries(RESPONSES.en)) {
      if (item.q.some(keyword => lower.includes(keyword.toLowerCase()))) {
        return { text: langResponses[key]?.a || item.a, topic: key, matched: true, sources: ['ADA Standards of Care 2024'] };
      }
    }
  }

  return { text: UNMATCHED_QUERY_GUIDANCE[lang] || UNMATCHED_QUERY_GUIDANCE.en, topic: 'general', matched: false, sources: ['ADA Clinical Guidelines 2024'] };
}

export function getSuggestedQuestions(lang = 'en') {
  const suggestions = {
    en: [
      'How are my glucose levels trending?',
      'What medicines am I taking?',
      'I missed a dose, what should I do?',
      'When is my next HbA1c test due?',
    ],
    ta: [
      'என் குளுக்கோஸ் அளவுகள் எப்படி உள்ளன?',
      'நான் என்ன மருந்துகள் எடுக்கிறேன்?',
      'மருந்தை தவறவிட்டால் என்ன செய்ய வேண்டும்?',
      'அடுத்த HbA1c பரிசோதனை எப்போது?',
    ],
    hi: [
      'मेरा ग्लूकोज लेवल कैसा चल रहा है?',
      'मेरी निर्धारित दवाएं कौन सी हैं?',
      'खुराक छूट जाने पर क्या करें?',
      'अगली HbA1c जांच कब है?',
    ],
    ml: [
      'എന്റെ ഗ്ലൂക്കോസ് നില എങ്ങനെയുണ്ട്?',
      'ഞാൻ കഴിക്കുന്ന മരുന്നുകൾ ഏതെല്ലാമാണ്?',
      'ഗുളിക കഴിക്കാൻ മറന്നാൽ എന്ത് ചെയ്യണം?',
      'അടുത്ത HbA1c പരിശോധന എപ്പോഴാണ്?',
    ],
    te: [
      'నా బ్లడ్ షుగర్ స్థాయిలు ఎలా ఉన్నాయి?',
      'నేను ఏ మందులు వాడుతున్నాను?',
      'డోస్ మిస్ అయితే ఏం చేయాలి?',
      'తదుపరి HbA1c పరీక్ష ఎప్పుడు?',
    ],
    kn: [
      'ನನ್ನ ರಕ್ತದ ಸಕ್ಕರೆ ಮಟ್ಟ ಹೇಗಿದೆ?',
      'ನಾನು ಯಾವ ಔಷಧಿಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ?',
      'ಮಾತ್ರೆ ತಪ್ಪಿಸಿಕೊಂಡರೆ ಏನು ಮಾಡಬೇಕು?',
      'ಮುಂದಿನ HbA1c ಪರೀಕ್ಷೆ ಯಾವಾಗ?',
    ],
  };
  return suggestions[lang] || suggestions.en;
}

export { TOPICS, RESPONSES };
