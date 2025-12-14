import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp, Sparkles, ChevronLeft, ChevronRight, Calendar, List, Lightbulb, Target, RefreshCw } from 'lucide-react';
import { GetTodaySummary, GetDailySummary, GetPeriodSummary, ListSummaryIndex, ListPeriodSummaryIndex } from '@/api/app';

// 匹配后端 DailySummaryDTO
interface DailySummary {
  date: string;
  summary: string;
  highlights: string;
  struggles: string;
  skills_gained: string[];
  total_coding: number;
  total_diffs: number;
}

// 匹配后端 PeriodSummaryDTO
interface PeriodSummary {
  type: string;
  start_date: string;
  end_date: string;
  overview: string;
  achievements: string[];
  patterns: string;
  suggestions: string;
  top_skills: string[];
  total_coding: number;
  total_diffs: number;
}

interface SummaryIndexItem {
  date: string;
  has_summary: boolean;
  preview: string;
}

interface PeriodIndexItem {
  type: string;
  start_date: string;
  end_date: string;
}

export default function ReportsView() {
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'daily' | 'week' | 'month'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [showIndex, setShowIndex] = useState(false);
  const [dailyIndex, setDailyIndex] = useState<SummaryIndexItem[]>([]);
  const [periodIndex, setPeriodIndex] = useState<PeriodIndexItem[]>([]);
  const [loadingIndex, setLoadingIndex] = useState(false);

  // 计算周/月开始日期
  const getStartDate = (type: 'week' | 'month', date: string): string => {
    const d = new Date(date);
    if (type === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff)).toISOString().slice(0, 10);
    } else {
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    }
  };

  // 加载日报
  useEffect(() => {
    if (viewType !== 'daily') return;
    const loadDailySummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const isToday = currentDate === new Date().toISOString().slice(0, 10);
        const data = isToday ? await GetTodaySummary() : await GetDailySummary(currentDate);
        setDailySummary(data);
      } catch (e: any) {
        console.error('Failed to load daily summary:', e);
        setError(e?.message || '加载失败');
        setDailySummary(null);
      } finally {
        setLoading(false);
      }
    };
    loadDailySummary();
  }, [viewType, currentDate]);

  // 加载周报/月报 - 使用正确的 type 参数: week/month
  const loadPeriodSummary = async (force = false) => {
    if (viewType === 'daily') return;
    setLoading(true);
    setError(null);
    try {
      const startDate = getStartDate(viewType, currentDate);
      const data = await GetPeriodSummary(viewType, startDate, force);
      setPeriodSummary(data);
    } catch (e: any) {
      console.error('Failed to load period summary:', e);
      setError(e?.message || '加载失败');
      setPeriodSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewType !== 'daily') {
      loadPeriodSummary(false);
    }
  }, [viewType, currentDate]);

  // 强制生成
  const handleForceGenerate = () => {
    if (viewType === 'daily') {
      // 日报强制生成
      setLoading(true);
      setError(null);
      const isToday = currentDate === new Date().toISOString().slice(0, 10);
      (isToday ? GetTodaySummary(true) : GetDailySummary(currentDate, true))
        .then(setDailySummary)
        .catch((e) => setError(e?.message || '生成失败'))
        .finally(() => setLoading(false));
    } else {
      loadPeriodSummary(true);
    }
  };

  const loadIndex = async () => {
    setLoadingIndex(true);
    try {
      if (viewType === 'daily') {
        const data = await ListSummaryIndex(30);
        setDailyIndex(data || []);
      } else {
        const data = await ListPeriodSummaryIndex(viewType, 10);
        setPeriodIndex(data || []);
      }
    } catch (e) {
      console.error('Failed to load index:', e);
    } finally {
      setLoadingIndex(false);
    }
  };

  const toggleIndex = () => {
    if (!showIndex) loadIndex();
    setShowIndex(!showIndex);
  };

  const navigateDate = (direction: number) => {
    const date = new Date(currentDate);
    if (viewType === 'daily') {
      date.setDate(date.getDate() + direction);
    } else if (viewType === 'week') {
      date.setDate(date.getDate() + direction * 7);
    } else {
      date.setMonth(date.getMonth() + direction);
    }
    setCurrentDate(date.toISOString().slice(0, 10));
  };

  const selectFromIndex = (date: string) => {
    setCurrentDate(date);
    setShowIndex(false);
  };

  const parseList = (text: string | undefined): string[] => {
    if (!text) return [];
    return text.split(/\n|;|。/).filter(Boolean).map((h) => h.trim()).filter(h => h.length > 0);
  };

  const summary = viewType === 'daily' ? dailySummary : null;
  const period = viewType !== 'daily' ? periodSummary : null;

  const getPeriodLabel = () => {
    if (viewType === 'daily') return currentDate.slice(5);
    if (viewType === 'week' && period) return `${period.start_date.slice(5)}~${period.end_date.slice(5)}`;
    if (viewType === 'month' && period) return `${period.start_date.slice(0, 7)}`;
    return getStartDate(viewType as 'week' | 'month', currentDate).slice(5);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* View Toggle + Date Navigation */}
      <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <div className="flex gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => { setViewType('daily'); setShowIndex(false); setError(null); }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${viewType === 'daily' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >日报</button>
          <button
            onClick={() => { setViewType('week'); setShowIndex(false); setError(null); }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${viewType === 'week' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >周报</button>
          <button
            onClick={() => { setViewType('month'); setShowIndex(false); setError(null); }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${viewType === 'month' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >月报</button>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={toggleIndex} className={`p-2 rounded-lg border transition-colors ${showIndex ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`} title="历史索引">
            <List size={16} />
          </button>
          
          <div className="flex items-center gap-2 text-zinc-400 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
            <button onClick={() => navigateDate(-1)} className="p-1 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
            <span className="text-sm min-w-[80px] text-center flex items-center gap-1">
              <Calendar size={12} /> {getPeriodLabel()}
            </span>
            <button onClick={() => navigateDate(1)} className="p-1 hover:text-white transition-colors" disabled={currentDate >= new Date().toISOString().slice(0, 10)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64 text-zinc-500">
          <RefreshCw size={20} className="animate-spin mr-2" /> 
          {viewType === 'daily' ? '生成日报中...' : viewType === 'week' ? '生成周报中...' : '生成月报中...'}
        </div>
      )}

      {/* Error with Generate Button */}
      {!loading && error && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <div className="text-amber-500 mb-4">{error}</div>
            <button
              onClick={handleForceGenerate}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={14} /> 点击生成{viewType === 'daily' ? '日报' : viewType === 'week' ? '周报' : '月报'}
            </button>
            <div className="text-xs text-zinc-500 mt-4">
              {viewType !== 'daily' && '需要先有该周期内的日报数据'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 历史索引面板 */}
      {showIndex && !loading && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">
              {viewType === 'daily' ? '日报历史' : viewType === 'week' ? '周报历史' : '月报历史'}
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
                    className={`p-2 rounded text-xs transition-colors ${item.has_summary ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30' : 'bg-zinc-950 text-zinc-600 hover:text-zinc-400 border border-zinc-800'} ${item.date === currentDate ? 'ring-1 ring-indigo-500' : ''}`}
                  >
                    <div className="font-mono">{item.date.slice(5)}</div>
                    {item.preview && <div className="text-[10px] text-zinc-500 truncate">{item.preview}</div>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {periodIndex.length === 0 ? (
                  <div className="text-zinc-500 text-sm">暂无历史记录</div>
                ) : periodIndex.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectFromIndex(item.start_date)}
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded text-left hover:border-zinc-700 transition-colors"
                  >
                    <div className="text-xs text-zinc-500 font-mono">{item.start_date} ~ {item.end_date}</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Report */}
      {!loading && !error && viewType === 'daily' && summary && !showIndex && (
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800 p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"><Sparkles size={12} className="mr-1" /> AI 生成</Badge>
                  <span className="text-zinc-500 text-sm">{summary.date}</span>
                </div>
                <CardTitle className="text-2xl font-bold text-white">每日工作回顾</CardTitle>
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
                {parseList(summary.highlights).length > 0 ? parseList(summary.highlights).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <p className="text-zinc-200">{item}</p>
                  </div>
                )) : <p className="text-zinc-500 italic">无亮点记录</p>}
              </div>
              
              {summary.struggles && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Target size={16} className="text-amber-500" /> 挑战与困难
                  </h3>
                  <p className="text-zinc-400 text-sm">{summary.struggles}</p>
                </div>
              )}
            </div>

            <div className="p-8">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" /> 技能增长
              </h3>
              <div className="space-y-4 mb-8">
                {summary.skills_gained?.length > 0 ? summary.skills_gained.map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-zinc-300">{skill}</span>
                    <div className="text-sm text-emerald-400">+经验</div>
                  </div>
                )) : <p className="text-zinc-500 italic">无技能记录</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="text-2xl font-bold text-indigo-400">{Math.round((summary.total_coding || 0) / 60)}小时</div>
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

      {/* Week/Month Report */}
      {!loading && !error && viewType !== 'daily' && period && !showIndex && (
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <CardHeader className="border-b border-zinc-800 p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                    <Sparkles size={12} className="mr-1" /> {viewType === 'week' ? '周报' : '月报'}
                  </Badge>
                  <span className="text-zinc-500 text-sm">{period.start_date} ~ {period.end_date}</span>
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                  {viewType === 'week' ? '本周工作回顾' : '本月工作回顾'}
                </CardTitle>
              </div>
            </div>
            <p className="text-zinc-300 text-lg leading-relaxed">{period.overview}</p>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 border-r border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" /> 
                {viewType === 'week' ? '本周成就' : '本月成就'}
              </h3>
              <div className="space-y-4">
                {period.achievements?.length > 0 ? period.achievements.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    <p className="text-zinc-200">{item}</p>
                  </div>
                )) : <p className="text-zinc-500 italic">无成就记录</p>}
              </div>

              {period.patterns && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Target size={16} className="text-sky-500" /> 工作模式
                  </h3>
                  <p className="text-zinc-400 text-sm">{period.patterns}</p>
                </div>
              )}
            </div>

            <div className="p-8">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" /> 核心技能
              </h3>
              <div className="space-y-4 mb-6">
                {period.top_skills?.length > 0 ? period.top_skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-zinc-300">{skill}</span>
                    <div className="text-sm text-purple-400">重点</div>
                  </div>
                )) : <p className="text-zinc-500 italic">无技能记录</p>}
              </div>

              {period.suggestions && (
                <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded">
                  <h4 className="text-xs font-semibold text-indigo-400 uppercase mb-2 flex items-center gap-1">
                    <Lightbulb size={12} /> 建议
                  </h4>
                  <p className="text-zinc-300 text-sm">{period.suggestions}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-center mt-6">
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="text-2xl font-bold text-indigo-400">{Math.round((period.total_coding || 0) / 60)}小时</div>
                  <div className="text-xs text-zinc-500">编码时间</div>
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
    </div>
  );
}
