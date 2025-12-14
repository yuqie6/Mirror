import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { GetTodaySummary } from '@/api/app';

interface DailySummary {
  date: string;
  summary: string;
  highlights: string;
  struggles: string;
  skills_gained: string[];
  total_coding: number;
  total_diffs: number;
}

export default function ReportsView() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      try {
        const data = await GetTodaySummary();
        setSummary(data);
      } catch (e) {
        console.error('Failed to load summary:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        生成总结中...
      </div>
    );
  }

  // 解析 highlights 为列表
  const highlightsList = summary?.highlights
    ? summary.highlights.split(/\n|;/).filter(Boolean).map((h) => h.trim())
    : [];

  // 计算生产力分数 (简单估算)
  const productivityScore = summary
    ? Math.min(100, Math.round((summary.total_diffs / 20) * 100 + (summary.total_coding / 240) * 50))
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* View Toggle */}
      <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <div className="flex gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setViewType('daily')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              viewType === 'daily' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            日报
          </button>
          <button
            onClick={() => setViewType('weekly')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              viewType === 'weekly' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            周报
          </button>
        </div>
        <div className="flex items-center gap-2 text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
          <span className="text-sm">{summary?.date || new Date().toISOString().slice(0, 10)}</span>
        </div>
      </div>

      {/* Report Card */}
      {summary ? (
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800 p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                    <Sparkles size={12} className="mr-1" /> AI 生成
                  </Badge>
                  <span className="text-zinc-500 text-sm">
                    生成于 {new Date().toLocaleTimeString().slice(0, 5)}
                  </span>
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                  每日工作回顾
                </CardTitle>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-400">{productivityScore}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">
                  生产力评分
                </div>
              </div>
            </div>
            <p className="text-zinc-300 text-lg leading-relaxed">{summary.summary}</p>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Key Achievements */}
            <div className="p-8 border-r border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" /> 主要成就
              </h3>
              <div className="space-y-4">
                {highlightsList.length > 0 ? (
                  highlightsList.map((item, idx) => (
                    <div key={idx} className="group flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <p className="text-zinc-200">{item}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-500 italic">无亮点记录</p>
                )}
              </div>
            </div>

            {/* Skills & Trends */}
            <div className="p-8">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" /> 技能增长
              </h3>
              <div className="space-y-4 mb-8">
                {summary.skills_gained.length > 0 ? (
                  summary.skills_gained.map((skill, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-zinc-300">{skill}</span>
                      <div className="text-sm text-emerald-400">+经验</div>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-500 italic">无技能记录</p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="text-2xl font-bold text-indigo-400">
                    {Math.round(summary.total_coding / 60)}小时
                  </div>
                  <div className="text-xs text-zinc-500">编码时间</div>
                </div>
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="text-2xl font-bold text-emerald-400">{summary.total_diffs}</div>
                  <div className="text-xs text-zinc-500">代码变更</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-zinc-950 p-4 border-t border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>基于 {summary.total_diffs} 次变更 • {Math.round(summary.total_coding / 60)} 小时活动</span>
            <div className="flex gap-4">
              <button className="hover:text-zinc-300 transition-colors">分享报告</button>
              <button className="hover:text-zinc-300 transition-colors">导出 Markdown</button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="text-center text-zinc-500 py-12">
          暂无总结，请从仪表盘生成
        </div>
      )}
    </div>
  );
}
