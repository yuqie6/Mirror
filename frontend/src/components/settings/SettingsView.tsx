import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Moon, Globe, Shield, Save, RefreshCw, Plus, X, Key, Server } from 'lucide-react';
import { GetSettings, SaveSettings } from '@/api/app';

// 匹配后端 dto/httpapi.go SettingsDTO
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

// 匹配后端 SaveSettingsRequestDTO (使用 *pointer 语义，仅发送修改的字段)
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
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<SaveSettingsRequest>({});
  const [newApiKey, setNewApiKey] = useState('');
  const [newWatchPath, setNewWatchPath] = useState('');

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
        alert('设置已保存，部分更改需要重启应用后生效');
      } else {
        alert('设置已保存');
      }
      setPendingChanges({});
      // 重新加载设置
      const data = await GetSettings();
      setSettings(data);
    } catch (e) {
      alert(`保存失败: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const updatePending = <K extends keyof SaveSettingsRequest>(key: K, value: SaveSettingsRequest[K]) => {
    setPendingChanges((prev) => ({ ...prev, [key]: value }));
  };

  const addWatchPath = () => {
    if (!newWatchPath.trim()) return;
    const current = pendingChanges.diff_watch_paths || settings?.diff_watch_paths || [];
    updatePending('diff_watch_paths', [...current, newWatchPath.trim()]);
    setNewWatchPath('');
  };

  const removeWatchPath = (path: string) => {
    const current = pendingChanges.diff_watch_paths || settings?.diff_watch_paths || [];
    updatePending('diff_watch_paths', current.filter((p) => p !== path));
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        加载设置中...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        无法加载设置
      </div>
    );
  }

  const displayWatchPaths = pendingChanges.diff_watch_paths ?? settings.diff_watch_paths;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-zinc-100">设置</h2>
        {hasPendingChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            保存更改
          </button>
        )}
      </div>

      {/* DeepSeek AI 配置 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Server size={18} /> DeepSeek AI 配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">API Key</div>
              <div className="text-xs text-zinc-500">
                {settings.deepseek_api_key_set ? '已配置' : '未配置'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {settings.deepseek_api_key_set ? (
                <Badge variant="default" className="text-xs">
                  <Key size={10} className="mr-1" /> 已设置
                </Badge>
              ) : (
                <input
                  type="password"
                  placeholder="输入 API Key"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  onBlur={() => {
                    if (newApiKey) {
                      updatePending('deepseek_api_key', newApiKey);
                    }
                  }}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 w-48"
                />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">Base URL</div>
            <input
              type="text"
              defaultValue={settings.deepseek_base_url}
              onBlur={(e) => updatePending('deepseek_base_url', e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 font-mono w-64"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">模型</div>
            <input
              type="text"
              defaultValue={settings.deepseek_model}
              onBlur={(e) => updatePending('deepseek_model', e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 font-mono w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* 数据采集 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Moon size={18} /> 数据采集
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">Diff 监控</div>
              <div className="text-xs text-zinc-500">监控 Git 代码变更</div>
            </div>
            <Switch
              checked={pendingChanges.diff_enabled ?? settings.diff_enabled}
              onCheckedChange={(checked) => updatePending('diff_enabled', checked)}
            />
          </div>
          
          {/* Diff 监控路径 */}
          <div>
            <div className="text-sm text-zinc-300 mb-2">监控路径</div>
            <div className="space-y-1 mb-2">
              {displayWatchPaths.map((path) => (
                <div key={path} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs">
                  <span className="font-mono text-zinc-400 truncate">{path}</span>
                  <button 
                    onClick={() => removeWatchPath(path)}
                    className="text-zinc-600 hover:text-rose-400 ml-2"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="添加监控路径"
                value={newWatchPath}
                onChange={(e) => setNewWatchPath(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
              />
              <button
                onClick={addWatchPath}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">浏览器监控</div>
              <div className="text-xs text-zinc-500">采集浏览器历史</div>
            </div>
            <Switch
              checked={pendingChanges.browser_enabled ?? settings.browser_enabled}
              onCheckedChange={(checked) => updatePending('browser_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 隐私 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Shield size={18} /> 隐私
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">隐私过滤</div>
              <div className="text-xs text-zinc-500">脱敏敏感 URL 和内容</div>
            </div>
            <Switch
              checked={pendingChanges.privacy_enabled ?? settings.privacy_enabled}
              onCheckedChange={(checked) => updatePending('privacy_enabled', checked)}
            />
          </div>
          {settings.privacy_patterns && settings.privacy_patterns.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3 max-h-32 overflow-y-auto">
              <div className="text-xs text-zinc-500 mb-1">过滤规则 ({settings.privacy_patterns.length} 条)</div>
              {settings.privacy_patterns.map((pattern, idx) => (
                <div key={idx} className="text-xs font-mono text-zinc-400 py-0.5 truncate">
                  {pattern}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 存储 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Globe size={18} /> 数据与存储
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">配置文件</div>
            <span className="text-xs font-mono text-zinc-500 truncate max-w-[200px]">{settings.config_path}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">数据库</div>
            <span className="text-xs font-mono text-zinc-500 truncate max-w-[200px]">{settings.db_path}</span>
          </div>
        </CardContent>
      </Card>

      {/* 关于 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <SettingsIcon size={18} /> 关于
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-400">
            Project Mirror v0.2-alpha
            <br />
            <span className="text-zinc-600">构建日期: 2024-12-14</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
