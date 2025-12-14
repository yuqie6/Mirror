import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Sparkles, Cog, AlertTriangle, ArrowRight, ChevronDown, ChevronRight, FileCode, Plus, Minus, MonitorSmartphone, Globe, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GetSessionsByDate, GetSessionDetail, GetSessionEvents, GetDiffDetail } from '@/api/app';
import { ISession, SessionDTO, SessionDetailDTO, SessionWindowEventDTO, toISession } from '@/types/session';

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

interface SessionsViewProps {
  date?: string;
}

export default function SessionsView({ date }: SessionsViewProps) {
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetailDTO | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<number>>(new Set());
  
  // 窗口事件
  const [windowEvents, setWindowEvents] = useState<SessionWindowEventDTO[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Diff 详情（包含完整 diff_content）
  const [diffDetails, setDiffDetails] = useState<Map<number, DiffDetail>>(new Map());
  const [loadingDiff, setLoadingDiff] = useState<number | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      try {
        const targetDate = date || new Date().toISOString().slice(0, 10);
        const data: SessionDTO[] = await GetSessionsByDate(targetDate);
        setSessions(data.map(toISession));
      } catch (e) {
        console.error('Failed to load sessions:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [date]);

  const handleSessionClick = async (session: ISession) => {
    try {
      const detail: SessionDetailDTO = await GetSessionDetail(session.id);
      setSelectedSession(detail);
      setDrawerOpen(true);
      setExpandedDiffs(new Set());
      setWindowEvents([]);
      setDiffDetails(new Map());
      
      // 同时加载窗口事件
      loadWindowEvents(session.id);
    } catch (e) {
      console.error('Failed to load session detail:', e);
    }
  };

  const loadWindowEvents = async (sessionId: number) => {
    setLoadingEvents(true);
    try {
      const events = await GetSessionEvents(sessionId, 100);
      // 过滤出窗口事件（后端返回的是混合事件，需要过滤）
      const windowEvts = (events?.window_events || events || []) as SessionWindowEventDTO[];
      setWindowEvents(windowEvts);
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
        // 加载详情
        loadDiffDetail(diffId);
      }
      return next;
    });
  };

  const formatTimestamp = (ts: number): string => {
    if (!ts) return '--';
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        加载会话中...
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-4 animate-in slide-in-from-bottom-2 duration-500">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-zinc-200 font-medium">时间轴</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 rounded hover:text-white transition-colors">
              筛选
            </button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">
            当前日期无会话记录
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSessionClick(session)}
              className={cn(
                'group relative pl-4 border-l-2 cursor-pointer hover:bg-zinc-900/50 rounded-r-lg p-4 transition-all',
                session.type === 'ai' ? 'border-indigo-500' : 'border-zinc-700'
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-500">
                    {session.duration}
                  </span>
                  <span title={session.type === 'ai' ? 'AI 分析' : '规则生成'}>
                    {session.type === 'ai' ? (
                      <Sparkles size={14} className="text-indigo-400" />
                    ) : (
                      <Cog size={14} className="text-zinc-600" />
                    )}
                  </span>
                </div>
                <div className="flex gap-1">
                  {session.tags?.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <h4 className="text-zinc-200 font-medium group-hover:text-white transition-colors flex items-center gap-2">
                {session.title}
                <ArrowRight
                  size={14}
                  className="text-zinc-600 group-hover:translate-x-1 transition-transform"
                />
              </h4>
              <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                {session.summary}
              </p>
              {session.evidenceStrength === 'weak' && (
                <div className="mt-2 text-xs text-amber-500 flex items-center gap-1">
                  <AlertTriangle size={12} /> 弱证据
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Session Detail Sheet (Drawer) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[700px] bg-zinc-950 border-zinc-800 overflow-y-auto">
          {selectedSession && (
            <>
              <SheetHeader className="border-b border-zinc-800 pb-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={selectedSession.summary ? 'default' : 'secondary'}>
                    {selectedSession.summary ? 'AI 分析' : '规则生成'}
                  </Badge>
                  <Badge variant="outline">{selectedSession.time_range}</Badge>
                </div>
                <SheetTitle className="text-xl text-white">
                  {selectedSession.category || '会话详情'}
                </SheetTitle>
                <p className="text-zinc-400 text-sm mt-2">{selectedSession.summary}</p>
              </SheetHeader>

              {/* Tabs: 代码变更、时间轴、应用使用 */}
              <Tabs defaultValue="diffs" className="w-full">
                <TabsList className="w-full bg-zinc-900 border border-zinc-800 p-1">
                  <TabsTrigger value="diffs" className="flex-1 text-xs">
                    <FileCode size={12} className="mr-1" /> 代码变更
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="flex-1 text-xs">
                    <Clock size={12} className="mr-1" /> 活动时间轴
                  </TabsTrigger>
                  <TabsTrigger value="apps" className="flex-1 text-xs">
                    <MonitorSmartphone size={12} className="mr-1" /> 应用使用
                  </TabsTrigger>
                </TabsList>

                {/* 代码变更 Tab */}
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
                                  <span className="text-emerald-500 text-xs flex items-center gap-0.5">
                                    <Plus size={10} /> {diff.lines_added}
                                  </span>
                                  <span className="text-rose-500 text-xs flex items-center gap-0.5">
                                    <Minus size={10} /> {diff.lines_deleted}
                                  </span>
                                  {isExpanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="border-t border-zinc-800 p-3 bg-zinc-950">
                                  {loadingDiff === diff.id ? (
                                    <div className="text-zinc-500 text-sm">加载中...</div>
                                  ) : (
                                    <>
                                      {(detail?.insight || diff.insight) && (
                                        <div className="mb-3 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded text-sm text-indigo-200">
                                          <span className="text-indigo-400 font-medium">AI 洞察：</span> {detail?.insight || diff.insight}
                                        </div>
                                      )}
                                      {/* Diff 内容 */}
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
                                          <span className="text-zinc-500 text-xs">涉及技能：</span>
                                          {diff.skills.map((skill: string) => (
                                            <span key={skill} className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px]">
                                              {skill}
                                            </span>
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
                    <div className="text-zinc-500 text-sm italic text-center py-8">无 Diff 记录</div>
                  )}
                </TabsContent>

                {/* 活动时间轴 Tab - 使用 GetSessionEvents */}
                <TabsContent value="timeline" className="mt-4">
                  {loadingEvents ? (
                    <div className="text-zinc-500 text-sm text-center py-8">加载中...</div>
                  ) : windowEvents.length > 0 ? (
                    <div className="space-y-1">
                      {windowEvents.map((evt, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-zinc-900 border border-zinc-800 rounded text-sm">
                          <span className="text-xs font-mono text-zinc-600 w-12">
                            {formatTimestamp(evt.timestamp)}
                          </span>
                          <MonitorSmartphone size={12} className="text-zinc-500" />
                          <span className="text-zinc-300 truncate flex-1">{evt.app_name}</span>
                          <span className="text-xs text-zinc-500 truncate max-w-[200px]">{evt.title}</span>
                          {evt.duration > 0 && (
                            <span className="text-xs text-zinc-600">{Math.round(evt.duration / 60)}分钟</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-zinc-500 text-sm italic text-center py-8">
                      无窗口事件记录
                    </div>
                  )}

                  {/* 浏览器事件 */}
                  {selectedSession.browser && selectedSession.browser.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">浏览器活动</h4>
                      <div className="space-y-1">
                        {selectedSession.browser.slice(0, 20).map((evt, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-zinc-900 border border-zinc-800 rounded text-sm">
                            <span className="text-xs font-mono text-zinc-600 w-12">
                              {formatTimestamp(evt.timestamp)}
                            </span>
                            <Globe size={12} className="text-sky-500" />
                            <span className="text-zinc-400">{evt.domain}</span>
                            <span className="text-xs text-zinc-500 truncate flex-1">{evt.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* 应用使用 Tab */}
                <TabsContent value="apps" className="mt-4">
                  {selectedSession.app_usage.length > 0 ? (
                    <div className="space-y-3">
                      {selectedSession.app_usage.map((app, idx: number) => {
                        const totalDuration = selectedSession.app_usage.reduce(
                          (sum: number, a: { total_duration: number }) => sum + a.total_duration,
                          0
                        );
                        const percent = totalDuration > 0
                          ? Math.round((app.total_duration / totalDuration) * 100)
                          : 0;
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="flex-1 text-sm text-zinc-400 text-right w-24">
                              {app.app_name}
                            </div>
                            <div className="flex-[3]">
                              <Progress value={percent} className="h-2" />
                            </div>
                            <div className="w-12 text-xs text-zinc-500">{percent}%</div>
                            <div className="w-16 text-xs text-zinc-600 text-right">
                              {Math.round(app.total_duration / 60)}分钟
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-zinc-500 text-sm italic text-center py-8">无应用使用数据</div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
