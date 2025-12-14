import { useI18n, Locale } from '@/lib/i18n';
import { Globe } from 'lucide-react';

// 语言切换按钮组件
export function LanguageSwitch() {
  const { locale, setLocale } = useI18n();

  const toggleLocale = () => {
    const next: Locale = locale === 'zh' ? 'en' : 'zh';
    setLocale(next);
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors rounded hover:bg-zinc-800"
      title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      <Globe size={14} />
      <span className="font-medium">{locale === 'zh' ? 'EN' : '中'}</span>
    </button>
  );
}
