import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import zhLocale from '@/locales/zh.json';
import enLocale from '@/locales/en.json';

// 支持的语言类型
export type Locale = 'zh' | 'en';

// 语言包类型 (使用中文语言包作为类型模板)
type LocaleMessages = typeof zhLocale;

// 语言包映射
const locales: Record<Locale, LocaleMessages> = {
  zh: zhLocale,
  en: enLocale,
};

// 获取嵌套对象的值，支持 'nav.dashboard' 格式
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let result: unknown = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path; // 找不到则返回 key 本身
    }
  }
  return typeof result === 'string' ? result : path;
}

// 检测浏览器语言
function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'zh';
  const lang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || 'zh';
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
}

// 从 localStorage 读取语言设置
function getStoredLocale(): Locale | null {
  if (typeof localStorage === 'undefined') return null;
  const stored = localStorage.getItem('workmirror-locale');
  if (stored === 'zh' || stored === 'en') return stored;
  return null;
}

// 保存语言设置到 localStorage
function setStoredLocale(locale: Locale): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('workmirror-locale', locale);
}

// Context 类型
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

// 创建 Context
const I18nContext = createContext<I18nContextType | null>(null);

// Provider Props
interface I18nProviderProps {
  children: ReactNode;
}

// Provider 组件
export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // 优先使用存储的语言，否则检测浏览器语言
    return getStoredLocale() || detectBrowserLocale();
  });

  // 切换语言
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setStoredLocale(newLocale);
    // 更新 html lang 属性
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale === 'zh' ? 'zh-CN' : 'en';
    }
  }, []);

  // 翻译函数
  const t = useCallback((key: string): string => {
    return getNestedValue(locales[locale] as unknown as Record<string, unknown>, key);
  }, [locale]);

  // 初始化时设置 html lang
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    }
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook: 获取 i18n context
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// Hook: 只获取翻译函数 (更轻量)
export function useTranslation(): { t: (key: string) => string; locale: Locale } {
  const { t, locale } = useI18n();
  return { t, locale };
}
