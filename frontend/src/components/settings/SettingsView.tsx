import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Moon, Shield, Save, RefreshCw, Plus, X, Key, Server, Database, Eye } from 'lucide-react';
import { GetSettings, SaveSettings } from '@/api/app';
import { useTranslation } from '@/lib/i18n';

// 匹配后端 dto/httpapi.go SettingsDTO 完整字段
interface SettingsData {
  config_path: string;
  
  deepseek_api_key_set: boolean;
  deepseek_base_url: string;
  deepseek_model: string;
  
  siliconflow_api_key_set: boolean;
  siliconflow_base_url: string;
  siliconflow_embedding_model: string;
  siliconflow_reranker_model: string;
  
  db_path: string;
  diff_enabled: boolean;
  diff_watch_paths: string[];
  browser_enabled: boolean;
  browser_history_path: string;
  
  privacy_enabled: boolean;
  privacy_patterns: string[];
}

// 匹配后端 SaveSettingsRequestDTO
interface SaveSettingsRequest {
  deepseek_api_key?: string;
  deepseek_base_url?: string;
  deepseek_model?: string;
  
  siliconflow_api_key?: string;
  siliconflow_base_url?: string;
  siliconflow_embedding_model?: string;
  siliconflow_reranker_model?: string;
  
  db_path?: string;
  diff_enabled?: boolean;
  diff_watch_paths?: string[];
  browser_enabled?: boolean;
  browser_history_path?: string;
  
  privacy_enabled?: boolean;
  privacy_patterns?: string[];
}

export default function SettingsView() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<SaveSettingsRequest>({});
  
  // 输入状态
  const [newDeepSeekApiKey, setNewDeepSeekApiKey] = useState('');
  const [newSiliconFlowApiKey, setNewSiliconFlowApiKey] = useState('');
  const [newWatchPath, setNewWatchPath] = useState('');
  const [newPrivacyPattern, setNewPrivacyPattern] = useState('');
  const [privacySample, setPrivacySample] = useState(
    'https://example.com/callback?token=abc123&email=user@example.com#access_token=xyz987'
  );

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const data = await GetSettings();
        setSettings(data);
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    setSaving(true);
    try {
      const resp = await SaveSettings(pendingChanges as any);
      if (resp.restart_required) {
        alert(t('settings.settingsSavedRestart'));
      } else {
        alert(t('settings.settingsSaved'));
      }
      setPendingChanges({});
      const data = await GetSettings();
      setSettings(data);
    } catch (e) {
      alert(`${t('settings.saveFailed')}: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const updatePending = <K extends keyof SaveSettingsRequest>(key: K, value: SaveSettingsRequest[K]) => {
    setPendingChanges((prev) => ({ ...prev, [key]: value }));
  };

  // 监控路径管理
  const displayWatchPaths = pendingChanges.diff_watch_paths ?? settings?.diff_watch_paths ?? [];
  const addWatchPath = () => {
    if (!newWatchPath.trim()) return;
    updatePending('diff_watch_paths', [...displayWatchPaths, newWatchPath.trim()]);
    setNewWatchPath('');
  };
  const removeWatchPath = (path: string) => {
    updatePending('diff_watch_paths', displayWatchPaths.filter((p) => p !== path));
  };

  // 隐私规则管理
  const displayPrivacyPatterns = pendingChanges.privacy_patterns ?? settings?.privacy_patterns ?? [];
  const addPrivacyPattern = () => {
    if (!newPrivacyPattern.trim()) return;
    updatePending('privacy_patterns', [...displayPrivacyPatterns, newPrivacyPattern.trim()]);
    setNewPrivacyPattern('');
  };
  const removePrivacyPattern = (pattern: string) => {
    updatePending('privacy_patterns', displayPrivacyPatterns.filter((p) => p !== pattern));
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;
  const privacyEnabled = pendingChanges.privacy_enabled ?? settings?.privacy_enabled ?? false;

  const previewPrivacy = (text: string): string => {
    const input = typeof text === 'string' ? text : '';
    if (!privacyEnabled) return input;

    // 最小口径：默认去掉 URL query/fragment，避免直接暴露 token/email 等
    let out = input.replace(/(https?:\/\/[^\s?#]+)\?[^\s#]*/g, '$1?***');
    out = out.replace(/(https?:\/\/[^\s?#]+)#[^\s]*/g, '$1#***');

    for (const p of displayPrivacyPatterns) {
      const pattern = typeof p === 'string' ? p.trim() : '';
      if (!pattern) continue;
      try {
        const re = new RegExp(pattern, 'gi');
        out = out.replace(re, '***');
      } catch {
        // 忽略无效正则（后端保存时会校验路径等；正则本身允许用户自定义）
      }
    }
    return out;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-zinc-500">{t('settings.loadingSettings')}</div>;
  }

  if (!settings) {
    return <div className="flex items-center justify-center h-64 text-zinc-500">{t('settings.loadFailed')}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-zinc-100">{t('settings.title')}</h2>
        <button
          onClick={handleSave}
          disabled={saving || !hasPendingChanges}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
            hasPendingChanges
              ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          } disabled:opacity-50`}
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {hasPendingChanges ? t('settings.saveChanges') : t('settings.noChanges')}
        </button>
      </div>

      {/* 新手引导（最小可重复口径：强提示 diff watch paths） */}
      {(pendingChanges.diff_enabled ?? settings.diff_enabled) &&
        (pendingChanges.diff_watch_paths ?? settings.diff_watch_paths).length === 0 && (
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
                <Eye size={14} /> {t('settings.firstTimeSetup')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-amber-200/80 space-y-2">
              <div>{t('settings.firstTimeHint')}</div>
              <div>{t('settings.firstTimeAdvice')}</div>
            </CardContent>
          </Card>
        )}

      {/* DeepSeek AI 配置 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Server size={18} /> {t('settings.deepseekConfig')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">{t('settings.apiKey')}</div>
            <div className="flex items-center gap-2">
              {settings.deepseek_api_key_set ? (
                <Badge variant="default" className="text-xs"><Key size={10} className="mr-1" /> {t('settings.apiKeySet')}</Badge>
              ) : (
                <input
                  type="password"
                  placeholder={t('settings.enterApiKey')}
                  value={newDeepSeekApiKey}
                  onChange={(e) => setNewDeepSeekApiKey(e.target.value)}
                  onBlur={() => { if (newDeepSeekApiKey) updatePending('deepseek_api_key', newDeepSeekApiKey); }}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 w-48"
                />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">{t('settings.baseUrl')}</div>
            <input
              type="text"
              defaultValue={settings.deepseek_base_url}
              onBlur={(e) => { if (e.target.value !== settings.deepseek_base_url) updatePending('deepseek_base_url', e.target.value); }}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 font-mono w-64"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">{t('settings.model')}</div>
            <input
              type="text"
              defaultValue={settings.deepseek_model}
              onBlur={(e) => { if (e.target.value !== settings.deepseek_model) updatePending('deepseek_model', e.target.value); }}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 font-mono w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* SiliconFlow 配置 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Server size={18} /> {t('settings.siliconflowConfig')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">{t('settings.apiKey')}</div>
            <div className="flex items-center gap-2">
              {settings.siliconflow_api_key_set ? (
                <Badge variant="default" className="text-xs"><Key size={10} className="mr-1" /> {t('settings.apiKeySet')}</Badge>
              ) : (
                <input
                  type="password"
                  placeholder={t('settings.enterApiKey')}
                  value={newSiliconFlowApiKey}
                  onChange={(e) => setNewSiliconFlowApiKey(e.target.value)}
                  onBlur={() => { if (newSiliconFlowApiKey) updatePending('siliconflow_api_key', newSiliconFlowApiKey); }}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 w-48"
                />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">{t('settings.baseUrl')}</div>
            <input
              type="text"
              defaultValue={settings.siliconflow_base_url}
              onBlur={(e) => { if (e.target.value !== settings.siliconflow_base_url) updatePending('siliconflow_base_url', e.target.value); }}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 font-mono w-64"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">{t('settings.embeddingModel')}</div>
            <input
              type="text"
              defaultValue={settings.siliconflow_embedding_model}
              onBlur={(e) => { if (e.target.value !== settings.siliconflow_embedding_model) updatePending('siliconflow_embedding_model', e.target.value); }}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 font-mono w-48"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">{t('settings.rerankerModel')}</div>
            <input
              type="text"
              defaultValue={settings.siliconflow_reranker_model}
              onBlur={(e) => { if (e.target.value !== settings.siliconflow_reranker_model) updatePending('siliconflow_reranker_model', e.target.value); }}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 font-mono w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* 数据采集 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Moon size={18} /> {t('settings.dataCollection')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">{t('settings.diffMonitor')}</div>
              <div className="text-xs text-zinc-500">{t('settings.diffMonitorHint')}</div>
            </div>
            <Switch
              checked={pendingChanges.diff_enabled ?? settings.diff_enabled}
              onCheckedChange={(checked: boolean) => updatePending('diff_enabled', checked)}
            />
          </div>
          
          <div>
            <div className="text-sm text-zinc-300 mb-2">{t('settings.watchPaths')}</div>
            <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
              {displayWatchPaths.map((path) => (
                <div key={path} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs">
                  <span className="font-mono text-zinc-400 truncate">{path}</span>
                  <button onClick={() => removeWatchPath(path)} className="text-zinc-600 hover:text-rose-400 ml-2"><X size={12} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('settings.addWatchPath')}
                value={newWatchPath}
                onChange={(e) => setNewWatchPath(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addWatchPath(); }}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
              />
              <button onClick={addWatchPath} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300"><Plus size={12} /></button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">{t('settings.browserMonitor')}</div>
              <div className="text-xs text-zinc-500">{t('settings.browserMonitorHint')}</div>
            </div>
            <Switch
              checked={pendingChanges.browser_enabled ?? settings.browser_enabled}
              onCheckedChange={(checked: boolean) => updatePending('browser_enabled', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">{t('settings.browserHistoryPath')}</div>
            <input
              type="text"
              defaultValue={settings.browser_history_path}
              onBlur={(e) => { if (e.target.value !== settings.browser_history_path) updatePending('browser_history_path', e.target.value); }}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 font-mono w-64"
            />
          </div>
        </CardContent>
      </Card>

      {/* 隐私 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Shield size={18} /> {t('settings.privacy')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">{t('settings.privacyFilter')}</div>
              <div className="text-xs text-zinc-500">{t('settings.privacyFilterHint')}</div>
            </div>
            <Switch
              checked={pendingChanges.privacy_enabled ?? settings.privacy_enabled}
              onCheckedChange={(checked: boolean) => updatePending('privacy_enabled', checked)}
            />
          </div>
          
          <div>
            <div className="text-sm text-zinc-300 mb-2 flex items-center gap-2">
              <Eye size={14} /> {t('settings.privacyRules')}
            </div>
            <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
              {displayPrivacyPatterns.map((pattern, idx) => (
                <div key={idx} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs">
                  <span className="font-mono text-zinc-400 truncate">{pattern}</span>
                  <button onClick={() => removePrivacyPattern(pattern)} className="text-zinc-600 hover:text-rose-400 ml-2"><X size={12} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('settings.addRegexRule')}
                value={newPrivacyPattern}
                onChange={(e) => setNewPrivacyPattern(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addPrivacyPattern(); }}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
              />
              <button onClick={addPrivacyPattern} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300"><Plus size={12} /></button>
            </div>
          </div>

          {/* 脱敏预览（P0 验收点：可预览规则效果） */}
          <div className="space-y-2">
            <div className="text-sm text-zinc-300 flex items-center gap-2">
              <Eye size={14} /> {t('settings.privacyPreview')}
            </div>
            <textarea
              value={privacySample}
              onChange={(e) => setPrivacySample(e.target.value)}
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono"
              placeholder={t('settings.privacyPreviewHint')}
            />
            <div className="text-xs text-zinc-500">{t('settings.privacyPreviewResult')}</div>
            <pre className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 whitespace-pre-wrap break-words">
              {previewPrivacy(privacySample) || t('settings.empty')}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* 存储 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Database size={18} /> {t('settings.dataStorage')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">{t('settings.configFile')}</div>
            <span className="text-xs font-mono text-zinc-500 truncate max-w-[250px]">{settings.config_path}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">{t('settings.databasePath')}</div>
            <span className="text-xs font-mono text-zinc-500 truncate max-w-[250px]">{settings.db_path}</span>
          </div>
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <SettingsIcon size={18} /> {t('settings.about')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-400">
            {t('app.name')} {t('app.version')}
            <br />
            <span className="text-zinc-600">{t('settings.buildDate')}: 2024-12-14</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
