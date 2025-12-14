import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ArrowRight, AlertTriangle } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { GetTrends, GetAppStats, GetTodaySummary, GetStatus } from '@/api/app';
import { EvidenceStatusDTO } from '@/types/status';

interface TrendData {
  daily_stats: Array<{
    date: string;
    total_diffs: number;
    total_coding_minutes: number;
    session_count: number;
  }>;
  total_diffs: number;
  total_coding_minutes: number;
  total_sessions: number;
}

interface AppStat {
  app_name: string;
  total_duration: number;
  category: string;
}

interface DashboardViewProps {
  onNavigate?: (tab: string) => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [appStats, setAppStats] = useState<AppStat[]>([]);
  const [evidence, setEvidence] = useState<EvidenceStatusDTO | null>(null);
  const [hasDailyReport, setHasDailyReport] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [trendsData, appData, summaryData, statusData] = await Promise.all([
          GetTrends(30),
          GetAppStats(),
          GetTodaySummary().catch(() => null),
          GetStatus(),
        ]);
        setTrends(trendsData);
        setAppStats(appData || []);
        setHasDailyReport(!!summaryData?.summary);
        setEvidence(statusData?.evidence || null);
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 计算专注分布
  const focusData = (() => {
    if (!appStats || appStats.length === 0) return [];
    const colors = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#f43f5e'];
    const totalDuration = appStats.reduce((sum, app) => sum + app.total_duration, 0);
    return appStats.slice(0, 5).map((app, idx) => ({
      name: app.app_name,
      value: totalDuration > 0 ? Math.round((app.total_duration / totalDuration) * 100) : 0,
      color: colors[idx % colors.length],
    }));
  })();

  // 计算今日会话数
  const todaySessions = trends?.daily_stats?.find(
    (d) => d.date === new Date().toISOString().slice(0, 10)
  )?.session_count || 0;

  // 证据覆盖率：使用后端 evidence 数据（PRD 口径）
  const evidenceCoverage = (() => {
    if (!evidence || evidence.sessions_24h === 0) return 0;
    // 覆盖率 = (有 diff 或 browser 的会话数) / 总会话数
    const covered = evidence.with_diff + evidence.with_browser - evidence.with_diff_and_browser;
    return Math.min(100, Math.round((covered / evidence.sessions_24h) * 100));
  })();

  const weakEvidenceCount = evidence?.weak_evidence || 0;

  // 生成热力图数据（30天）
  const heatmapData = (() => {
    if (!trends?.daily_stats) return Array.from({ length: 30 }, () => 0);
    const maxDiffs = Math.max(...trends.daily_stats.map((d) => d.total_diffs), 1);
    
    const result: number[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const stat = trends.daily_stats.find((d) => d.date === dateStr);
      result.push(stat ? stat.total_diffs / maxDiffs : 0);
    }
    return result;
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        加载仪表盘数据...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Session Counter */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <h3 className="text-zinc-400 text-sm font-medium mb-1">今日会话</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{todaySessions}</span>
              <span className="text-sm text-zinc-500">/ 30天共 {trends?.total_sessions || 0}</span>
            </div>
            <div className="mt-4 text-xs text-zinc-500">
              30天代码变更: {trends?.total_diffs || 0} 次
            </div>
          </CardContent>
        </Card>

        {/* Evidence Coverage - 使用后端真实数据 */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <h3 className="text-zinc-400 text-sm font-medium mb-1">证据覆盖率</h3>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${
                evidenceCoverage >= 70 ? 'text-emerald-400' : 
                evidenceCoverage >= 40 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {evidenceCoverage}%
              </span>
              <span className="text-sm text-zinc-500">
                {evidenceCoverage >= 70 ? '高可信度' : evidenceCoverage >= 40 ? '中等' : '需提升'}
              </span>
            </div>
            {weakEvidenceCount > 0 && (
              <div className="mt-4 text-xs text-amber-500 flex items-center gap-1">
                <AlertTriangle size={12} /> {weakEvidenceCount} 个弱证据会话
              </div>
            )}
            {evidence && (
              <div className="mt-2 text-xs text-zinc-600">
                24h: {evidence.sessions_24h} 会话 | 
                有Diff: {evidence.with_diff} | 
                有浏览: {evidence.with_browser}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Focus Distribution */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <h3 className="text-zinc-400 text-sm font-medium mb-2">专注分布</h3>
            {focusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={focusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={35}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {focusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 text-xs flex-1">
                  {focusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                      <span className="text-zinc-500 ml-auto">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-zinc-500 text-sm">暂无应用使用数据</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Report Quick Action */}
      {hasDailyReport && (
        <div
          onClick={() => onNavigate?.('reports')}
          className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-indigo-500/40 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-indigo-100 font-medium">每日总结已生成</h3>
              <p className="text-sm text-zinc-400">
                查看今日自动生成的工作回顾
              </p>
            </div>
          </div>
          <ArrowRight size={20} className="text-indigo-400" />
        </div>
      )}

      {/* Activity Heatmap - 真实数据 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-200 text-base font-medium">
              活动热力图
            </CardTitle>
            <span className="text-xs text-zinc-500">最近 30 天</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {heatmapData.map((intensity, i) => {
              let color = 'bg-zinc-800';
              if (intensity > 0.8) color = 'bg-emerald-500';
              else if (intensity > 0.6) color = 'bg-emerald-600/80';
              else if (intensity > 0.3) color = 'bg-emerald-700/60';
              else if (intensity > 0) color = 'bg-emerald-900/40';
              
              const date = new Date();
              date.setDate(date.getDate() - (29 - i));
              const dateStr = date.toISOString().slice(5, 10);
              
              return (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-sm ${color} cursor-pointer hover:ring-1 hover:ring-zinc-600`}
                  title={`${dateStr}: ${Math.round(intensity * 100)}% 活跃度`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-zinc-600">
            <span>30天前</span>
            <span>今天</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
