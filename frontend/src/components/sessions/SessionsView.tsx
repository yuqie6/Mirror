import { useState, useEffect, useRef, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Sparkles, Cog, AlertTriangle, ChevronDown, ChevronRight, FileCode, Plus, Minus, MonitorSmartphone, Globe, Clock, GripVertical, Calendar, ExternalLink, Code, Search, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GetSessionsByDate, GetSessionDetail, GetSessionEvents, GetDiffDetail } from '@/api/app';
import { SessionDTO, SessionDetailDTO, SessionWindowEventDTO } from '@/types/session';
import { parseLocalISODate, todayLocalISODate } from '@/lib/date';
import { useTranslation } from '@/lib/i18n';

interface DiffDetail {
  id: number;
  file_name: string;
  language: string;
  diff_content: string;
  insight: string;
  skills: string[];
  lines_added: number;
  lines_deleted: number;
  timestamp: number;
}

// 活动分段类型
interface ActivitySegment {
  type: 'deep_work' | 'fragmented' | 'break';
  startTime: number;
  endTime: number;
  events: SessionWindowEventDTO[];
  primaryApp: string;
  switchCount: number;
  totalDuration: number;
}

// 时间轴常量（用于热力图）
const DAY_START_HOUR = 6;   // 06:00 开始
const DAY_END_HOUR = 24;    // 24:00 结束

// 聚合窗口事件为活动分段
function aggregateToSegments(events: SessionWindowEventDTO[]): ActivitySegment[] {
  if (events.length === 0) return [];

  const segments: ActivitySegment[] = [];
  let currentSegment: ActivitySegment | null = null;

  // 按时间排序
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  for (const evt of sorted) {
    if (!currentSegment) {
      // 开始新分段
      currentSegment = {
        type: 'deep_work',
        startTime: evt.timestamp,
        endTime: evt.timestamp + (evt.duration * 1000),
        events: [evt],
        primaryApp: evt.app_name,
        switchCount: 0,
        totalDuration: evt.duration,
      };
      continue;
    }

    const gap = evt.timestamp - currentSegment.endTime;
    const isNewApp = evt.app_name !== currentSegment.events[currentSegment.events.length - 1]?.app_name;

    // 如果间隔 > 5分钟，视为休息，结束当前分段
    if (gap > 5 * 60 * 1000) {
      // 完成当前分段
      currentSegment.type = currentSegment.switchCount > 8 ? 'fragmented' : 'deep_work';
      segments.push(currentSegment);

      // 如果间隔很长，插入休息分段
      if (gap > 10 * 60 * 1000) {
        segments.push({
          type: 'break',
          startTime: currentSegment.endTime,
          endTime: evt.timestamp,
          events: [],
          primaryApp: '',
          switchCount: 0,
          totalDuration: gap / 1000,
        });
      }

      // 开始新分段
      currentSegment = {
        type: 'deep_work',
        startTime: evt.timestamp,
        endTime: evt.timestamp + (evt.duration * 1000),
        events: [evt],
        primaryApp: evt.app_name,
        switchCount: 0,
        totalDuration: evt.duration,
      };
    } else {
      // 继续当前分段
      currentSegment.events.push(evt);
      currentSegment.endTime = evt.timestamp + (evt.duration * 1000);
      currentSegment.totalDuration += evt.duration;
      if (isNewApp) {
        currentSegment.switchCount++;
      }
      // 更新主要应用（用时最长的）
      const appDurations = new Map<string, number>();
      for (const e of currentSegment.events) {
        appDurations.set(e.app_name, (appDurations.get(e.app_name) || 0) + e.duration);
      }
      let maxDur = 0;
      for (const [app, dur] of appDurations) {
        if (dur > maxDur) {
          maxDur = dur;
          currentSegment.primaryApp = app;
        }
      }
    }
  }

  // 完成最后一个分段
  if (currentSegment) {
    currentSegment.type = currentSegment.switchCount > 8 ? 'fragmented' : 'deep_work';
    segments.push(currentSegment);
  }

  return segments;
}

interface SessionsViewProps {
  initialDate?: string;
  selectedSessionId?: number | null;
  onOpenSession?: (sessionId: number, date: string) => void;
  onCloseSession?: (date: string) => void;
  onDateChange?: (date: string, sessionId?: number | null) => void;
}

function parseOrToday(s: string | undefined): string {
  if (typeof s === 'string' && s.trim() !== '' && parseLocalISODate(s)) return s;
  return todayLocalISODate();
}

export default function SessionsView({
  initialDate,
  selectedSessionId,
  onOpenSession,
  onCloseSession,
  onDateChange,
}: SessionsViewProps) {
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetailDTO | null>(null);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<number>>(new Set());
  const [currentDate, setCurrentDate] = useState(() => parseOrToday(initialDate));
  const { t, locale } = useTranslation();
  
  // 窗口事件
  const [windowEvents, setWindowEvents] = useState<SessionWindowEventDTO[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Diff 详情
  const [diffDetails, setDiffDetails] = useState<Map<number, DiffDetail>>(new Map());
  const [loadingDiff, setLoadingDiff] = useState<number | null>(null);

  // 可拖拽分栏
  const [leftWidth, setLeftWidth] = useState(40);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // 计算每小时活动强度（热力图数据）
  const hourlyHeatmap = useMemo(() => {
    const heatmap: number[] = Array(24).fill(0);
    for (const session of sessions) {
      const startHour = new Date(session.start_time).getHours();
      const endHour = new Date(session.end_time).getHours();
      const startMin = new Date(session.start_time).getMinutes();
      const endMin = new Date(session.end_time).getMinutes();

      for (let h = startHour; h <= endHour && h < 24; h++) {
        // 计算该小时内的分钟数
        let mins = 60;
        if (h === startHour) mins = 60 - startMin;
        if (h === endHour) mins = Math.min(mins, endMin);
        if (h === startHour && h === endHour) mins = endMin - startMin;
        heatmap[h] += mins;
      }
    }
    // 归一化到 0-1
    const maxMins = Math.max(...heatmap, 1);
    return heatmap.map(m => m / maxMins);
  }, [sessions]);

  // 计算活动分段（用于右侧时间轴）
  const activitySegments = useMemo(() => {
    return aggregateToSegments(windowEvents);
  }, [windowEvents]);

  // 加载会话列表
  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      try {
        const data: SessionDTO[] = await GetSessionsByDate(currentDate);
        setSessions(data);
      } catch (e) {
        console.error('Failed to load sessions:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [currentDate]);

  useEffect(() => {
    const d = typeof initialDate === 'string' && initialDate.trim() !== '' ? initialDate : '';
    if (d && d !== currentDate && parseLocalISODate(d)) {
      setCurrentDate(d);
    }
  }, [currentDate, initialDate]);

  const openSessionByID = async (sessionId: number) => {
    setSelectedSession(null);
    setExpandedDiffs(new Set());
    setWindowEvents([]);
    setDiffDetails(new Map());
    try {
      const detail: SessionDetailDTO = await GetSessionDetail(sessionId);
      setSelectedSession(detail);
      loadWindowEvents(sessionId);
    } catch (e) {
      console.error('Failed to load session detail:', e);
    }
  };

  // URL 选中态：打开/关闭会话详情
  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedSession(null);
      return;
    }
    void openSessionByID(selectedSessionId);
  }, [selectedSessionId]);

  const handleSessionClick = async (session: SessionDTO) => {
    if (onOpenSession) {
      onOpenSession(session.id, currentDate);
      return;
    }
    await openSessionByID(session.id);
  };

  const loadWindowEvents = async (sessionId: number) => {
    setLoadingEvents(true);
    try {
      const events = await GetSessionEvents(sessionId, 100);
      setWindowEvents(events);
    } catch (e) {
      console.error('Failed to load window events:', e);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadDiffDetail = async (diffId: number) => {
    if (diffDetails.has(diffId)) return;
    setLoadingDiff(diffId);
    try {
      const detail: DiffDetail = await GetDiffDetail(diffId);
      setDiffDetails((prev) => new Map(prev).set(diffId, detail));
    } catch (e) {
      console.error('Failed to load diff detail:', e);
    } finally {
      setLoadingDiff(null);
    }
  };

  const toggleDiffExpand = async (diffId: number) => {
    setExpandedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(diffId)) {
        next.delete(diffId);
      } else {
        next.add(diffId);
        loadDiffDetail(diffId);
      }
      return next;
    });
  };

  const formatTimestamp = (ts: number): string => {
    if (!ts) return '--';
    const localeTag = locale === 'zh' ? 'zh-CN' : 'en';
    return new Date(ts).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDuration = (seconds: number): string => {
    const sec = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    if (sec < 60) return `${sec}${t('common.seconds')}`;
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const remainSec = sec % 60;
    if (hours > 0) {
      if (minutes > 0) return `${hours}${t('common.hours')}${minutes}${t('common.minutes')}`;
      return `${hours}${t('common.hours')}`;
    }
    if (minutes > 0 && remainSec > 0) return `${minutes}${t('common.minutes')}${remainSec}${t('common.seconds')}`;
    return `${minutes}${t('common.minutes')}`;
  };

  const navigateDate = (direction: number) => {
    const base = parseLocalISODate(currentDate) || new Date();
    base.setDate(base.getDate() + direction);
    const next = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
    setCurrentDate(next);
    setSelectedSession(null);
    setExpandedDiffs(new Set());
    setWindowEvents([]);
    setDiffDetails(new Map());
    // 切换日期时清空选中态，避免 URL 指向不一致
    onDateChange?.(next, null);
  };

  // 拖拽逻辑
  const handleMouseDown = () => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.max(25, Math.min(70, newWidth)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-zinc-500">{t('sessions.loading')}</div>;
  }

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-8rem)] animate-in slide-in-from-bottom-2 duration-500">
      {/* 左侧：时间刻度泳道图 */}
      <div style={{ width: `${leftWidth}%` }} className="pr-2 overflow-y-auto border-r border-zinc-800 flex flex-col">
        {/* 日期选择 - sticky header */}
        <div className="sticky top-0 bg-zinc-950 py-2 z-10 border-b border-zinc-800/50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-zinc-200 font-medium text-sm">{t('sessions.timeline')}</h3>
            <div className="flex items-center gap-2 text-zinc-400 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
              <button onClick={() => navigateDate(-1)} className="p-1 hover:text-white transition-colors">
                <ChevronRight size={14} className="rotate-180" />
              </button>
              <span className="text-xs font-mono flex items-center gap-1">
                <Calendar size={12} /> {currentDate.slice(5)}
              </span>
              <button
                onClick={() => navigateDate(1)}
                className="p-1 hover:text-white transition-colors disabled:opacity-30"
                disabled={currentDate >= todayLocalISODate()}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* 迷你热力条 */}
          {sessions.length > 0 && (
            <div className="flex items-end gap-px h-6 px-1">
              {hourlyHeatmap.slice(DAY_START_HOUR, DAY_END_HOUR).map((intensity, i) => {
                const hour = DAY_START_HOUR + i;
                return (
                  <div
                    key={hour}
                    className="flex-1 group relative"
                    title={`${String(hour).padStart(2, '0')}:00`}
                  >
                    <div
                      className={cn(
                        'w-full rounded-sm transition-all',
                        intensity > 0.7 ? 'bg-emerald-500' :
                        intensity > 0.3 ? 'bg-emerald-500/60' :
                        intensity > 0 ? 'bg-emerald-500/30' : 'bg-zinc-800'
                      )}
                      style={{ height: Math.max(intensity * 20, 2) }}
                    />
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block">
                      <div className="bg-zinc-800 text-zinc-300 text-[9px] font-mono px-1 py-0.5 rounded whitespace-nowrap">
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">{t('sessions.noRecords')}</div>
        ) : (
          /* 流式时间线信息流 - 类似 Git 提交历史 */
          <div className="flex-1 overflow-y-auto py-4 px-2">
            <div className="flex flex-col">
              {sessions.map((session, idx) => {
                const isAI = session.semantic_source === 'ai';
                const isPending = session.degraded_reason === 'diff_insight_pending';
                const isSelected = (selectedSessionId && selectedSessionId === session.id) || selectedSession?.id === session.id;
                const title = session.category || session.primary_app || t('reports.uncategorized');
                const summaryText = session.summary || (isPending ? t('sessions.diffInsightPendingSummary') : t('reports.noSummary'));

                // 证据强度
                const evidenceStrength =
                  session.diff_count > 0 && session.browser_count > 0
                    ? 'strong'
                    : session.diff_count > 0 || session.browser_count > 0
                      ? 'medium'
                      : 'weak';

                // 计算与下一个会话的间隔（分钟）
                const nextSession = sessions[idx + 1];
                const gapMinutes = nextSession
                  ? Math.round((nextSession.start_time - session.end_time) / 60000)
                  : 0;

                // 主题色
                const theme = isPending
                  ? { border: 'border-l-amber-500', dot: 'border-amber-500', text: 'text-amber-400' }
                  : isAI
                    ? { border: 'border-l-indigo-500', dot: 'border-indigo-500', text: 'text-indigo-400' }
                    : { border: 'border-l-zinc-600', dot: 'border-zinc-600', text: 'text-zinc-500' };

                return (
                  <div key={session.id}>
                    {/* 会话卡片行 */}
                    <div className="group relative flex gap-4">
                      {/* 1. 左侧时间轴 (The Spine) */}
                      <div className="flex flex-col items-center w-10 shrink-0">
                        {/* 时间戳 */}
                        <span className="text-[10px] font-mono text-zinc-500 mb-1">
                          {session.time_range?.split('-')[0] || formatTimestamp(session.start_time)}
                        </span>
                        {/* 时间轴节点圆点 */}
                        <div className={cn(
                          'w-3 h-3 rounded-full border-2 z-10 bg-zinc-950',
                          theme.dot,
                          isSelected && 'shadow-[0_0_8px_rgba(99,102,241,0.5)] border-indigo-400'
                        )} />
                        {/* 垂直连线 */}
                        <div className="w-px bg-zinc-800 flex-1 -mt-0.5" />
                      </div>

                      {/* 2. 右侧卡片内容 */}
                      <div className="flex-1 pb-4 min-w-0">
                        <div
                          onClick={() => handleSessionClick(session)}
                          className={cn(
                            'relative rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden',
                            isSelected
                              ? 'border-zinc-700 bg-zinc-900 shadow-lg'
                              : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/50'
                          )}
                        >
                          {/* 左侧彩色装饰条 */}
                          <div className={cn('absolute left-0 top-0 bottom-0 w-1', theme.border)} />

                          <div className="p-3 pl-4">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-1.5">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {isPending ? (
                                  <Clock size={12} className={theme.text} />
                                ) : isAI ? (
                                  <Sparkles size={12} className={theme.text} />
                                ) : (
                                  <Cog size={12} className={theme.text} />
                                )}
                                <h3 className={cn(
                                  'text-sm font-medium truncate',
                                  isSelected ? 'text-zinc-100' : 'text-zinc-300'
                                )}>
                                  {title}
                                </h3>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-600 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded shrink-0 ml-2">
                                {session.time_range?.split('-')[1] || formatTimestamp(session.end_time)}
                              </span>
                            </div>

                            {/* Summary */}
                            <p className={cn(
                              'text-xs text-zinc-500 leading-relaxed mb-2',
                              isSelected ? 'line-clamp-3' : 'line-clamp-2'
                            )}>
                              {summaryText}
                            </p>

                            {/* Footer / Meta */}
                            <div className="flex items-center justify-between gap-2">
                              {/* 标签/技能 */}
                              <div className="flex gap-1.5 flex-wrap flex-1 min-w-0">
                                {session.skills_involved?.slice(0, 2).map((skill: string) => (
                                  <span key={skill} className="text-[10px] text-zinc-500 bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800/50 truncate max-w-[80px]">
                                    {skill}
                                  </span>
                                ))}
                              </div>

                              {/* 证据数据 */}
                              <div className="flex items-center gap-2 shrink-0">
                                {session.diff_count > 0 && (
                                  <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-500/80 bg-emerald-500/5 px-1.5 py-0.5 rounded-full">
                                    <FileCode size={10} />
                                    <span>{session.diff_count}</span>
                                  </div>
                                )}
                                {session.browser_count > 0 && (
                                  <div className="flex items-center gap-1 text-[10px] font-mono text-sky-500/80 bg-sky-500/5 px-1.5 py-0.5 rounded-full">
                                    <Globe size={10} />
                                    <span>{session.browser_count}</span>
                                  </div>
                                )}
                                {evidenceStrength === 'weak' && (
                                  <AlertTriangle size={12} className="text-amber-500" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Hover Action 箭头 */}
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600">
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 休息间隔指示器 */}
                    {gapMinutes > 15 && (
                      <div className="flex items-center gap-4 py-1">
                        {/* 左侧虚线对齐 */}
                        <div className="w-10 flex flex-col items-center">
                          <div className="w-px border-l border-dashed border-zinc-700/50 h-6" />
                        </div>
                        {/* 休息标签 */}
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/50 border border-dashed border-zinc-800 text-[10px] text-zinc-500 font-mono">
                          <Coffee size={10} />
                          <span>
                            {gapMinutes >= 60
                              ? `${Math.floor(gapMinutes / 60)}h ${gapMinutes % 60}m`
                              : `${gapMinutes}m`
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 时间线结束标记 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center w-10">
                  <div className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-700" />
                </div>
                <div className="text-[10px] text-zinc-600 font-mono py-1">
                  {t('sessions.endOfDay') || 'End of timeline'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 拖拽手柄 */}
      <div
        onMouseDown={handleMouseDown}
        className="w-2 flex items-center justify-center cursor-col-resize hover:bg-zinc-800 transition-colors group flex-shrink-0"
      >
        <GripVertical size={12} className="text-zinc-600 group-hover:text-zinc-400" />
      </div>

      {/* 右侧：会话详情 */}
      <div style={{ width: `${100 - leftWidth - 1}%` }} className="pl-2 overflow-y-auto">
        {selectedSessionId && (!selectedSession || selectedSession.id !== selectedSessionId) ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            {t('sessions.loadingDetail')}
          </div>
        ) : selectedSession ? (
          <div className="space-y-4">
            {/* 会话头部 */}
            <div className="border-b border-zinc-800 pb-4">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setSelectedSession(null);
                    onCloseSession?.(currentDate);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  {t('sessions.backToList')}
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {selectedSession.degraded_reason === 'diff_insight_pending' ? (
                  <Badge variant="secondary">{t('sessions.diffInsightPending')}</Badge>
                ) : (
                  <Badge variant={selectedSession.semantic_source === 'ai' ? 'default' : 'secondary'}>
                    {selectedSession.semantic_source === 'ai' ? t('sessions.aiAnalysis') : t('sessions.ruleGenerated')}
                  </Badge>
                )}
                <Badge variant="outline">{selectedSession.time_range}</Badge>
              </div>
              <h2 className="text-xl font-bold text-white">{selectedSession.category || t('sessions.sessionDetail')}</h2>
              <p className="text-zinc-400 text-sm mt-2">{selectedSession.summary}</p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="diffs" className="w-full">
              <TabsList className="w-full bg-zinc-900 border border-zinc-800 p-1">
                <TabsTrigger value="diffs" className="flex-1 text-xs">
                  <FileCode size={12} className="mr-1" /> {t('sessions.codeChanges')}
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex-1 text-xs">
                  <Clock size={12} className="mr-1" /> {t('sessions.activityTimeline')}
                </TabsTrigger>
                <TabsTrigger value="browser" className="flex-1 text-xs">
                  <Globe size={12} className="mr-1" /> {t('sessions.browserActivity')}
                </TabsTrigger>
                <TabsTrigger value="apps" className="flex-1 text-xs">
                  <MonitorSmartphone size={12} className="mr-1" /> {t('sessions.appUsage')}
                </TabsTrigger>
              </TabsList>

              {/* 代码变更 */}
              <TabsContent value="diffs" className="mt-4">
                {selectedSession.diffs.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSession.diffs.map((diff) => {
                      const isExpanded = expandedDiffs.has(diff.id);
                      const detail = diffDetails.get(diff.id);
                      return (
                        <Collapsible key={diff.id} open={isExpanded} onOpenChange={() => toggleDiffExpand(diff.id)}>
                          <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
                            <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                              <div className="flex items-center gap-2 font-mono text-xs">
                                <FileCode size={14} className="text-indigo-400" />
                                <span className="text-zinc-300">{diff.file_name}</span>
                                <span className="text-zinc-600">{diff.language}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-emerald-500 text-xs flex items-center gap-0.5"><Plus size={10} /> {diff.lines_added}</span>
                                <span className="text-rose-500 text-xs flex items-center gap-0.5"><Minus size={10} /> {diff.lines_deleted}</span>
                                {isExpanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t border-zinc-800 p-3 bg-zinc-950">
                                {loadingDiff === diff.id ? (
                                  <div className="text-zinc-500 text-sm">{t('common.loading')}</div>
                                ) : (
                                  <>
                                    {(detail?.insight || diff.insight) && (
                                      <div className="mb-3 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded text-sm text-indigo-200">
                                        <span className="text-indigo-400 font-medium">{t('sessions.aiInsight')}</span> {detail?.insight || diff.insight}
                                      </div>
                                    )}
                                    {detail?.diff_content && (
                                      <pre className="text-xs font-mono bg-zinc-900 border border-zinc-800 rounded p-3 overflow-x-auto max-h-64 overflow-y-auto">
                                        {detail.diff_content.split('\n').map((line, idx) => (
                                          <div
                                            key={idx}
                                            className={cn(
                                              line.startsWith('+') && !line.startsWith('+++') ? 'text-emerald-400 bg-emerald-500/10' :
                                              line.startsWith('-') && !line.startsWith('---') ? 'text-rose-400 bg-rose-500/10' :
                                              line.startsWith('@@') ? 'text-sky-400' : 'text-zinc-400'
                                            )}
                                          >
                                            {line}
                                          </div>
                                        ))}
                                      </pre>
                                    )}
                                    {diff.skills && diff.skills.length > 0 && (
                                      <div className="mt-2 flex gap-1 flex-wrap">
                                        <span className="text-zinc-500 text-xs">{t('sessions.relatedSkills')}</span>
                                        {diff.skills.map((skill: string) => (
                                          <span key={skill} className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px]">{skill}</span>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm italic text-center py-8">{t('sessions.noDiffRecords')}</div>
                )}
              </TabsContent>

              {/* 活动时间轴 - 分段聚合视图 */}
              <TabsContent value="timeline" className="mt-4">
                {loadingEvents ? (
                  <div className="text-zinc-500 text-sm text-center py-8">{t('common.loading')}</div>
                ) : activitySegments.length > 0 ? (
                  <div className="space-y-3">
                    {activitySegments.map((segment, idx) => {
                      const startTime = formatTimestamp(segment.startTime);
                      const endTime = formatTimestamp(segment.endTime);

                      // 计算该分段内各应用的用时分布
                      const appDurations = new Map<string, number>();
                      for (const evt of segment.events) {
                        appDurations.set(evt.app_name, (appDurations.get(evt.app_name) || 0) + evt.duration);
                      }
                      const sortedApps = [...appDurations.entries()].sort((a, b) => b[1] - a[1]);
                      const maxAppDur = sortedApps[0]?.[1] || 1;

                      if (segment.type === 'break') {
                        return (
                          <div key={idx} className="flex items-center gap-2 py-2 px-3 text-zinc-600">
                            <Coffee size={12} />
                            <span className="text-xs font-mono">{startTime} - {endTime}</span>
                            <span className="text-xs">{t('sessions.breakTime') || '休息'}</span>
                            <span className="text-xs font-mono ml-auto">{formatDuration(segment.totalDuration)}</span>
                          </div>
                        );
                      }

                      return (
                        <Collapsible key={idx}>
                          <div className={cn(
                            'bg-zinc-900 border rounded overflow-hidden',
                            segment.type === 'deep_work' ? 'border-emerald-500/30' : 'border-amber-500/30'
                          )}>
                            <CollapsibleTrigger className="w-full p-3 hover:bg-zinc-800/50 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-zinc-500">{startTime} - {endTime}</span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px]',
                                      segment.type === 'deep_work'
                                        ? 'border-emerald-500/50 text-emerald-400'
                                        : 'border-amber-500/50 text-amber-400'
                                    )}
                                  >
                                    {segment.type === 'deep_work' ? (
                                      <><Code size={10} className="mr-1" /> {t('sessions.deepWork') || '深度工作'}</>
                                    ) : (
                                      <><Search size={10} className="mr-1" /> {t('sessions.fragmented') || '碎片切换'}</>
                                    )}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                  <span className="font-mono">{formatDuration(segment.totalDuration)}</span>
                                  {segment.switchCount > 0 && (
                                    <span className="text-zinc-600">({segment.switchCount} {t('sessions.switches') || '次切换'})</span>
                                  )}
                                  <ChevronRight size={14} className="text-zinc-600" />
                                </div>
                              </div>

                              {/* 应用分布条 */}
                              <div className="space-y-1.5">
                                {sortedApps.slice(0, 3).map(([app, dur]) => (
                                  <div key={app} className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400 w-24 truncate text-left">{app}</span>
                                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          'h-full rounded-full',
                                          segment.type === 'deep_work' ? 'bg-emerald-500' : 'bg-amber-500'
                                        )}
                                        style={{ width: `${(dur / maxAppDur) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-mono text-zinc-600 w-12 text-right">
                                      {formatDuration(dur)}
                                    </span>
                                  </div>
                                ))}
                                {sortedApps.length > 3 && (
                                  <div className="text-[10px] text-zinc-600 text-left">
                                    +{sortedApps.length - 3} {t('sessions.moreApps') || '更多应用'}
                                  </div>
                                )}
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="border-t border-zinc-800 p-3 bg-zinc-950 space-y-1.5 max-h-64 overflow-y-auto">
                                {segment.events.map((evt, evtIdx) => (
                                  <div key={evtIdx} className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="font-mono text-zinc-600 w-10 shrink-0">{formatTimestamp(evt.timestamp)}</span>
                                      <MonitorSmartphone size={10} className="text-zinc-500 shrink-0" />
                                      <span className="text-zinc-300 truncate">{evt.app_name}</span>
                                      {evt.duration > 0 && (
                                        <span className="font-mono text-zinc-600 shrink-0 ml-auto">{formatDuration(evt.duration)}</span>
                                      )}
                                    </div>
                                    {evt.title && (
                                      <div className="text-[10px] text-zinc-500 pl-[52px] truncate" title={evt.title}>
                                        {evt.title}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}

                    {/* 碎片化警告 */}
                    {activitySegments.filter(s => s.type === 'fragmented').length > activitySegments.filter(s => s.type === 'deep_work').length && (
                      <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400 text-xs">
                        <AlertTriangle size={14} />
                        <span>{t('sessions.fragmentedWarning') || '本会话碎片切换较多，可能注意力分散'}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm italic text-center py-8">{t('sessions.noWindowEvents')}</div>
                )}
              </TabsContent>

              {/* 浏览器证据 */}
              <TabsContent value="browser" className="mt-4">
                {selectedSession.browser && selectedSession.browser.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSession.browser.slice(0, 100).map((evt, idx) => (
                      <div key={idx} className="p-2 bg-zinc-900 border border-zinc-800 rounded text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-zinc-600 w-12">{formatTimestamp(evt.timestamp)}</span>
                          <Globe size={12} className="text-sky-500" />
                          <span className="text-zinc-400">{evt.domain}</span>
                          {evt.duration > 0 && <span className="text-xs text-zinc-600">{formatDuration(evt.duration)}</span>}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 pl-[60px] space-y-1">
                          {evt.title && <div className="truncate">{evt.title}</div>}
                          {evt.url && (
                            <a
                              href={evt.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 truncate max-w-full"
                              title={evt.url}
                            >
                              <ExternalLink size={12} />
                              <span className="truncate">{evt.url}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedSession.browser.length > 100 && (
                      <div className="text-xs text-zinc-600 text-center py-2">{t('sessions.browserEvidenceTruncated')}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm italic text-center py-8">{t('sessions.noBrowserEvents')}</div>
                )}
              </TabsContent>

              {/* 应用使用 */}
              <TabsContent value="apps" className="mt-4">
                {selectedSession.app_usage.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSession.app_usage.map((app, idx: number) => {
                      const totalDuration = selectedSession.app_usage.reduce((sum: number, a: { total_duration: number }) => sum + a.total_duration, 0);
                      const percent = totalDuration > 0 ? Math.round((app.total_duration / totalDuration) * 100) : 0;
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="flex-1 text-sm text-zinc-400 text-right w-24">{app.app_name}</div>
                          <div className="flex-[3]"><Progress value={percent} className="h-2" /></div>
                          <div className="w-12 text-xs text-zinc-500">{percent}%</div>
                          <div className="w-24 text-xs text-zinc-600 text-right whitespace-nowrap">{formatDuration(app.total_duration)}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm italic text-center py-8">{t('sessions.noAppUsageData')}</div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            {t('sessions.selectSession')}
          </div>
        )}
      </div>
    </div>
  );
}
