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
      a: "Hello! I am the LATROCORE Clinical AI Assistant. How can I assist you with your glucose records, prescribed tablets, test reminders, or diet plan today?",
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
      a: "வணக்கம்! நான் LATROCORE கிளினிக்கல் AI உதவியாளர். உங்கள் ரத்த சர்க்கரை, மாத்திரைகள், பரிசோதனை நினைவூட்டல் அல்லது உணவு முறையில் நான் எவ்வாறு உதவ வேண்டும்?",
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
      a: "नमस्ते! मैं LATROCORE क्लिनिकल AI सहायक हूँ। आज मैं आपकी रक्त शर्करा, दवाओं, टेस्ट रिमाइंडर या डाइट प्लान में कैसे मदद कर सकता हूँ?",
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
      a: "നമസ്കാരം! ഞാൻ LATROCORE ക്ലിനിക്കൽ AI അസിസ്റ്റന്റാണ്. നിങ്ങളുടെ ഗ്ലൂക്കോസ്, ഗുളികകൾ, ടെസ്റ്റ് റിമൈൻഡറുകൾ അല്ലെങ്കിൽ ഡയറ്റ് പ്ലാൻ എന്നിവയിൽ ഞാൻ എങ്ങനെ സഹായിക്കണം?",
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
      a: "నమస్కారం! నేను LATROCORE క్లినికల్ AI అసిస్టెంట్‌ని. మీ బ్లడ్ షుగర్, మందులు, ల్యాబ్ పరీక్షలు లేదా డైట్ ప్లాన్ గురించి మీకు ఎలా సహాయపడాలి?",
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
      a: "ನಮಸ್ಕಾರ! ನಾನು LATROCORE ಕ್ಲಿನಿಕಲ್ AI ಸಹಾಯಕ. ನಿಮ್ಮ ರಕ್ತದ ಗ್ಲೂಕೋಸ್, ಮಾತ್ರೆಗಳು, ಪರೀಕ್ಷೆಗಳು ಅಥವಾ ಡಯಟ್ ಪ್ಲಾನ್ ಬಗ್ಗೆ ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
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

const FALLBACK = {
  en: "I'm not sure I can fully answer that question. As a clinical AI copilot, my responses are grounded in ADA 2024 Standards. I recommend consulting your doctor or requesting a counselling session.",
  ta: "அந்த கேள்விக்கு மருத்துவ வழிகாட்டுதல் தேவை. உங்கள் மருத்துவரிடம் ஆலோசிக்கவும் அல்லது மருந்தாளரிடம் ஆலோசனை அமர்வு கோரவும்.",
  hi: "मैं उस प्रश्न का पूरी तरह से उत्तर देने में असमर्थ हूँ। व्यक्तिगत मार्गदर्शन के लिए अपनी केयर टीम या डॉक्टर से संपर्क करें।",
  ml: "ആ ചോദ്യത്തിന് വ്യക്തിഗത വൈദ്യോപദേശം ആവശ്യമാണ്. നിങ്ങളുടെ ഡോക്ടറുമായി സംസാരിക്കുക അല്ലെങ്കിൽ കൗൺസിലിംഗ് അഭ്യർത്ഥിക്കുക.",
  te: "ఆ ప్రశ్నకు వ్యక్తిగత వైద్య సలహా అవసరం. దయచేసి మీ వైద్యుడిని లేదా ఫార్మసిస్ట్‌ను సంప్రదించండి.",
  kn: "ಆ ಪ್ರಶ್ನೆಗೆ ವೈದ್ಯಕೀಯ ಸಲಹೆ ಅಗತ್ಯವಿದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ ಅಥವಾ ಆಪ್ತಸಮಾಲೋಚನೆಗೆ ವಿನಂತಿಸಿ.",
};

export function getAssistantResponse(message, lang = 'en') {
  const lower = (message || '').toLowerCase();
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

  return { text: FALLBACK[lang] || FALLBACK.en, topic: 'general', matched: false, sources: ['ADA Clinical Guidelines 2024'] };
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
