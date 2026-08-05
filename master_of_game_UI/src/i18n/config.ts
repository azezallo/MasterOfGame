import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ukTranslations from './locales/uk.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      uk: {
        translation: ukTranslations
      }
    },
    lng: 'uk', // default language
    fallbackLng: 'uk',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
