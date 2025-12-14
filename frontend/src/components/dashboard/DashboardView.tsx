import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ArrowRight } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

// Mock data - 后续对接真实 API
const FOCUS_DATA = [
  { name: '编码', value: 75, color: '#6366f1' },
  { name: '阅读', value: 15, color: '#0ea5e9' },
  { name: '会议', value: 10, color: '#f59e0b' },
];

const HEATMAP_DATA = Array.from({ length: 60 }, () => Math.random());

interface DashboardViewProps {
  onNavigate?: (tab: string) => void;
  sessionCount?: number;
  evidenceCoverage?: number;
  hasDailyReport?: boolean;
}

export default function DashboardView({
  onNavigate,
  sessionCount = 12,
  evidenceCoverage = 88,
  hasDailyReport = true,
}: DashboardViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Session Counter */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <h3 className="text-zinc-400 text-sm font-medium mb-1">今日会话</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{sessionCount}</span>
              <span className="text-sm text-emerald-500">+2 新增</span>
            </div>
            <div className="mt-4 text-xs text-zinc-500">最近会话: 15 分钟前</div>
          </CardContent>
        </Card>

        {/* Evidence Coverage */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <h3 className="text-zinc-400 text-sm font-medium mb-1">证据覆盖率</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400">{evidenceCoverage}%</span>
              <span className="text-sm text-zinc-500">高可信度</span>
            </div>
            <p className="mt-4 text-xs text-zinc-500">会话已关联原始 Diff / 日志</p>
          </CardContent>
        </Card>

        {/* Focus Distribution */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <h3 className="text-zinc-400 text-sm font-medium mb-2">专注分布</h3>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={FOCUS_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={35}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {FOCUS_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-xs">
                {FOCUS_DATA.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.name} ({item.value}%)
                  </div>
                ))}
              </div>
            </div>
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

      {/* Activity Heatmap */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-200 text-base font-medium">
              活动热力图
            </CardTitle>
            <select className="bg-zinc-950 border border-zinc-800 text-xs rounded px-2 py-1 text-zinc-400">
              <option>最近 30 天</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {HEATMAP_DATA.map((intensity, i) => {
              let color = 'bg-zinc-800';
              if (intensity > 0.8) color = 'bg-emerald-500';
              else if (intensity > 0.6) color = 'bg-emerald-600/80';
              else if (intensity > 0.3) color = 'bg-emerald-900/40';
              return (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-sm ${color}`}
                  title="活动"
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
