const translations = {
  en: {
    nav_home: "Public Portal",
    nav_manual: "User Manual",
    nav_login: "Login",
    nav_register: "Register",
    nav_settings: "Settings",
    search_heading: "Find Active Public Works in Your Locality",
    state: "State",
    district: "District",
    taluk: "Taluk",
    village: "Village",
    search_btn: "Search Works",
    tender_contractor: "Contractor Working:",
    budget: "Sanctioned Budget",
    download_doc: "Download Contract File"
  },
  hi: {
    nav_home: "सार्वजनिक पोर्टल",
    nav_manual: "उपयोगकर्ता नियमावली",
    nav_login: "लॉग इन करें",
    nav_register: "पंजीकरण",
    nav_settings: "सेटिंग्स",
    search_heading: "अपने इलाके में सक्रिय सरकारी विकास कार्यों की खोज करें",
    state: "राज्य",
    district: "ज़िला",
    taluk: "तालुका",
    village: "गाँव",
    search_btn: "कार्य खोजें",
    tender_contractor: "कार्यरत ठेकेदार:",
    budget: "स्वीकृत बजट",
    download_doc: "अनुबंध फ़ाइल डाउनलोड करें"
  },
  kn: {
    nav_home: "ಸಾರ್ವಜನಿಕ ಪೋರ್ಟಲ್",
    nav_manual: "ಬಳಕೆದಾರರ ಕೈಪಿಡಿ",
    nav_login: "ಲಾಗಿನ್",
    nav_register: "ನೋಂದಣಿ",
    nav_settings: "ಸೆಟ್ಟಿಂಗ್ಸ್",
    search_heading: "ನಿಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ನಡೆಯುತ್ತಿರುವ ಸರ್ಕಾರಿ ಕಾಮಗಾರಿಗಳನ್ನು ಹುಡುಕಿ",
    state: "ರಾಜ್ಯ",
    district: "ಜಿಲ್ಲೆ",
    taluk: "ತಾಲೂಕು",
    village: "ಗ್ರಾಮ",
    search_btn: "ಕಾಮಗಾರಿ ಹುಡುಕಿ",
    tender_contractor: "ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿರುವ ಗುತ್ತಿಗೆದಾರರು:",
    budget: "ಮಂಜೂರಾದ ಮೊತ್ತ",
    download_doc: "ಒಪ್ಪಂದದ ಕಡತ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ"
  },
  ta: {
    nav_home: "பொது தளம்",
    nav_manual: "பயனர் கையேடு",
    nav_login: "உள்நுழைவு",
    nav_register: "பதிவு",
    nav_settings: "அமைப்புகள்",
    search_heading: "உங்கள் பகுதியில் செயல்படும் அரசு திட்டங்களை அறியவும்",
    state: "மாநிலம்",
    district: "மாவட்டம்",
    taluk: "வட்டம்",
    village: "கிராமம்",
    search_btn: "தேடுக",
    tender_contractor: "செயல்படுத்தும் ஒப்பந்ததாரர்:",
    budget: "ஒதுக்கப்பட்ட நிதி",
    download_doc: "ஒப்பந்த கோப்பைப் பதிவிறக்குக"
  }
};

function changeLanguage(lang) {
  localStorage.setItem('portal_lang', lang);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.innerText = translations[lang][key];
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('portal_lang') || 'en';
  const selector = document.getElementById('langSelect');
  if (selector) selector.value = savedLang;
  changeLanguage(savedLang);
});
