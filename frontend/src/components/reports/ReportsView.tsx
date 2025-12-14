import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp, Sparkles, ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react';
import { GetTodaySummary, GetDailySummary, GetPeriodSummary, ListSummaryIndex, ListPeriodSummaryIndex } from '@/api/app';

interface DailySummary {
  date: string;
  summary: string;
  highlights: string;
  struggles: string;
  skills_gained: string[];
  total_coding: number;
  total_diffs: number;
}

interface PeriodSummary {
  period_type: string;
  start_date: string;
  end_date: string;
  summary: string;
  theme: string;
  highlights: string;
  key_skills: string[];
  total_sessions: number;
  total_diffs: number;
}

interface SummaryIndexItem {
  date: string;
  has_summary: boolean;
  session_count: number;
}

interface PeriodIndexItem {
  period_type: string;
  start_date: string;
  end_date: string;
  theme: string;
}

export default function ReportsView() {
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<'daily' | 'weekly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().slice(0, 10));
  
  // 历史索引
  const [showIndex, setShowIndex] = useState(false);
  const [dailyIndex, setDailyIndex] = useState<SummaryIndexItem[]>([]);
  const [periodIndex, setPeriodIndex] = useState<PeriodIndexItem[]>([]);
  const [loadingIndex, setLoadingIndex] = useState(false);

  // 加载日报
  useEffect(() => {
    if (viewType !== 'daily') return;
    const loadDailySummary = async () => {
      setLoading(true);
      try {
        const isToday = currentDate === new Date().toISOString().slice(0, 10);
        const data = isToday ? await GetTodaySummary() : await GetDailySummary(currentDate);
        setDailySummary(data);
      } catch (e) {
        console.error('Failed to load daily summary:', e);
        setDailySummary(null);
      } finally {
        setLoading(false);
      }
    };
    loadDailySummary();
  }, [viewType, currentDate]);

  // 加载周报
  useEffect(() => {
    if (viewType !== 'weekly') return;
    const loadWeeklySummary = async () => {
      setLoading(true);
      try {
        const date = new Date(currentDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(date.setDate(diff)).toISOString().slice(0, 10);
        
        const data = await GetPeriodSummary('weekly', weekStart);
        setPeriodSummary(data);
      } catch (e) {
        console.error('Failed to load weekly summary:', e);
        setPeriodSummary(null);
      } finally {
        setLoading(false);
      }
    };
    loadWeeklySummary();
  }, [viewType, currentDate]);

  // 加载历史索引
  const loadIndex = async () => {
    setLoadingIndex(true);
    try {
      if (viewType === 'daily') {
        const data = await ListSummaryIndex(30);
        setDailyIndex(data || []);
      } else {
        const data = await ListPeriodSummaryIndex('weekly', 10);
        setPeriodIndex(data || []);
      }
    } catch (e) {
      console.error('Failed to load index:', e);
    } finally {
      setLoadingIndex(false);
    }
  };

  const toggleIndex = () => {
    if (!showIndex) {
      loadIndex();
    }
    setShowIndex(!showIndex);
  };

  const navigateDate = (direction: number) => {
    const date = new Date(currentDate);
    if (viewType === 'daily') {
      date.setDate(date.getDate() + direction);
    } else {
      date.setDate(date.getDate() + direction * 7);
    }
    setCurrentDate(date.toISOString().slice(0, 10));
  };

  const selectFromIndex = (date: string) => {
    setCurrentDate(date);
    setShowIndex(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        生成总结中...
      </div>
    );
  }

  const parseHighlights = (highlights: string | undefined): string[] => {
    if (!highlights) return [];
    return highlights.split(/\n|;|。/).filter(Boolean).map((h) => h.trim()).filter(h => h.length > 0);
  };

  const summary = viewType === 'daily' ? dailySummary : null;
  const period = viewType === 'weekly' ? periodSummary : null;

  const productivityScore = summary
    ? Math.min(100, Math.round((summary.total_diffs / 20) * 100 + (summary.total_coding / 240) * 50))
    : period
    ? Math.min(100, Math.round((period.total_diffs / 100) * 100 + (period.total_sessions / 50) * 50))
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* View Toggle + Date Navigation */}
      <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <div className="flex gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => { setViewType('daily'); setShowIndex(false); }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              viewType === 'daily' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            日报
          </button>
          <button
            onClick={() => { setViewType('weekly'); setShowIndex(false); }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              viewType === 'weekly' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            周报
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 历史索引按钮 */}
          <button
            onClick={toggleIndex}
            className={`p-2 rounded-lg border transition-colors ${
              showIndex ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="历史索引"
          >
            <List size={16} />
          </button>
          
          {/* 日期导航 */}
          <div className="flex items-center gap-2 text-zinc-400 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
            <button 
              onClick={() => navigateDate(-1)} 
              className="p-1 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm min-w-[100px] text-center flex items-center gap-1">
              <Calendar size={12} />
              {viewType === 'weekly' && period ? `${period.start_date.slice(5)}~${period.end_date.slice(5)}` : currentDate.slice(5)}
            </span>
            <button 
              onClick={() => navigateDate(1)} 
              className="p-1 hover:text-white transition-colors"
              disabled={currentDate >= new Date().toISOString().slice(0, 10)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 历史索引面板 */}
      {showIndex && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">
              {viewType === 'daily' ? '日报历史' : '周报历史'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingIndex ? (
              <div className="text-zinc-500 text-sm">加载中...</div>
            ) : viewType === 'daily' ? (
              <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                {dailyIndex.map((item) => (
                  <button
                    key={item.date}
                    onClick={() => selectFromIndex(item.date)}
                    className={`p-2 rounded text-xs transition-colors ${
                      item.has_summary 
                        ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30' 
                        : 'bg-zinc-950 text-zinc-600 hover:text-zinc-400 border border-zinc-800'
                    } ${item.date === currentDate ? 'ring-1 ring-indigo-500' : ''}`}
                  >
                    <div className="font-mono">{item.date.slice(5)}</div>
                    <div className="text-[10px] text-zinc-500">{item.session_count} 会话</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {periodIndex.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectFromIndex(item.start_date)}
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded text-left hover:border-zinc-700 transition-colors"
                  >
                    <div className="text-sm text-zinc-300">{item.theme || '周报'}</div>
                    <div className="text-xs text-zinc-500 font-mono">{item.start_date} ~ {item.end_date}</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Report */}
      {viewType === 'daily' && summary && !showIndex && (
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800 p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                    <Sparkles size={12} className="mr-1" /> AI 生成
                  </Badge>
                  <span className="text-zinc-500 text-sm">{summary.date}</span>
                </div>
                <CardTitle className="text-2xl font-bold text-white">每日工作回顾</CardTitle>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-400">{productivityScore}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">生产力评分</div>
              </div>
            </div>
            <p className="text-zinc-300 text-lg leading-relaxed">{summary.summary}</p>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 border-r border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" /> 主要成就
              </h3>
              <div className="space-y-4">
                {parseHighlights(summary.highlights).length > 0 ? (
                  parseHighlights(summary.highlights).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <p className="text-zinc-200">{item}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-500 italic">无亮点记录</p>
                )}
              </div>
            </div>

            <div className="p-8">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" /> 技能增长
              </h3>
              <div className="space-y-4 mb-8">
                {summary.skills_gained?.length > 0 ? (
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

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="text-2xl font-bold text-indigo-400">
                    {Math.round((summary.total_coding || 0) / 60)}小时
                  </div>
                  <div className="text-xs text-zinc-500">编码时间</div>
                </div>
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="text-2xl font-bold text-emerald-400">{summary.total_diffs || 0}</div>
                  <div className="text-xs text-zinc-500">代码变更</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Weekly Report */}
      {viewType === 'weekly' && period && !showIndex && (
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800 p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                    <Sparkles size={12} className="mr-1" /> 周报
                  </Badge>
                  <span className="text-zinc-500 text-sm">{period.start_date} ~ {period.end_date}</span>
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                  {period.theme || '本周工作回顾'}
                </CardTitle>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-400">{productivityScore}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">综合评分</div>
              </div>
            </div>
            <p className="text-zinc-300 text-lg leading-relaxed">{period.summary}</p>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 border-r border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" /> 本周亮点
              </h3>
              <div className="space-y-4">
                {parseHighlights(period.highlights).length > 0 ? (
                  parseHighlights(period.highlights).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      <p className="text-zinc-200">{item}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-500 italic">无亮点记录</p>
                )}
              </div>
            </div>

            <div className="p-8">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" /> 核心技能
              </h3>
              <div className="space-y-4 mb-8">
                {period.key_skills?.length > 0 ? (
                  period.key_skills.map((skill, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-zinc-300">{skill}</span>
                      <div className="text-sm text-purple-400">重点</div>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-500 italic">无技能记录</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="text-2xl font-bold text-indigo-400">{period.total_sessions || 0}</div>
                  <div className="text-xs text-zinc-500">会话数</div>
                </div>
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="text-2xl font-bold text-emerald-400">{period.total_diffs || 0}</div>
                  <div className="text-xs text-zinc-500">代码变更</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!loading && !summary && viewType === 'daily' && !showIndex && (
        <div className="text-center text-zinc-500 py-12">暂无日报，请稍后重试</div>
      )}
      {!loading && !period && viewType === 'weekly' && !showIndex && (
        <div className="text-center text-zinc-500 py-12">暂无周报，请稍后重试</div>
      )}
    </div>
  );
}
