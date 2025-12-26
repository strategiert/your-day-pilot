import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { saveLanguagePreference, getLanguageName, getLanguageFlag, type SupportedLanguage } from '@/i18n/detectLanguage';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'de', 'es', 'fr', 'it'];

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language as SupportedLanguage;

  const handleLanguageChange = (newLanguage: string) => {
    const lang = newLanguage as SupportedLanguage;
    i18n.changeLanguage(lang);
    saveLanguagePreference(lang);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">
        Language / Sprache
      </label>
      <Select value={currentLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{getLanguageFlag(currentLanguage)}</span>
              <span>{getLanguageName(currentLanguage)}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang} value={lang}>
              <span className="flex items-center gap-2">
                <span>{getLanguageFlag(lang)}</span>
                <span>{getLanguageName(lang)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
