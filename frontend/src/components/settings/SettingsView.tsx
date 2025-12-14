import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Moon, Globe, Shield } from 'lucide-react';

export default function SettingsView() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h2 className="text-xl font-semibold text-zinc-100 mb-6">设置</h2>

      {/* Appearance */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Moon size={18} /> 外观
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">深色模式</div>
              <div className="text-xs text-zinc-500">当前已启用</div>
            </div>
            <Badge variant="secondary">跟随系统</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Shield size={18} /> 隐私
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">URL 脱敏</div>
              <div className="text-xs text-zinc-500">隐藏敏感 URL 模式</div>
            </div>
            <Badge variant="default">已启用</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">正则规则</div>
              <div className="text-xs text-zinc-500">自定义过滤规则</div>
            </div>
            <span className="text-sm text-zinc-500 font-mono">12 条激活</span>
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
            <Globe size={18} /> 数据与存储
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">数据库位置</div>
              <div className="text-xs text-zinc-500 font-mono">~/.mirror/data.db</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-300">导出数据</div>
              <div className="text-xs text-zinc-500">下载所有数据</div>
            </div>
            <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              导出
            </button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
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
