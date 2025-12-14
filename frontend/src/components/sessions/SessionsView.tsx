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
import { Sparkles, Cog, AlertTriangle, ArrowRight, ChevronDown, ChevronRight, FileCode, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GetSessionsByDate, GetSessionDetail } from '@/api/app';
import { ISession, SessionDTO, SessionDetailDTO, toISession } from '@/types/session';

interface SessionsViewProps {
  date?: string;
}

export default function SessionsView({ date }: SessionsViewProps) {
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetailDTO | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<number>>(new Set());

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
    } catch (e) {
      console.error('Failed to load session detail:', e);
    }
  };

  const toggleDiffExpand = (diffId: number) => {
    setExpandedDiffs(prev => {
      const next = new Set(prev);
      if (next.has(diffId)) {
        next.delete(diffId);
      } else {
        next.add(diffId);
      }
      return next;
    });
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
        <SheetContent className="w-[600px] bg-zinc-950 border-zinc-800 overflow-y-auto">
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

              {/* Code Activity - 详细 Diff 展开 */}
              <section className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                  <span className="text-emerald-500">●</span> 代码变更 (Diff)
                </h3>
                {selectedSession.diffs.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSession.diffs.map((diff) => {
                      const isExpanded = expandedDiffs.has(diff.id);
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
                                {diff.insight ? (
                                  <div className="mb-3 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded text-sm text-indigo-200">
                                    <span className="text-indigo-400 font-medium">AI 洞察：</span> {diff.insight}
                                  </div>
                                ) : null}
                                <div className="font-mono text-xs space-y-1">
                                  <div className="text-zinc-500">// 文件路径: {diff.file_name}</div>
                                  <div className="text-emerald-400">+ {diff.lines_added} 行添加</div>
                                  <div className="text-rose-400">- {diff.lines_deleted} 行删除</div>
                                  {diff.skills && diff.skills.length > 0 && (
                                    <div className="mt-2 flex gap-1 flex-wrap">
                                      <span className="text-zinc-500">涉及技能：</span>
                                      {diff.skills.map((skill: string) => (
                                        <span key={skill} className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[10px]">
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm italic">无 Diff 记录</div>
                )}
              </section>

              {/* App Usage */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
                  <span className="text-indigo-500">●</span> 应用使用
                </h3>
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
                          <div className="w-10 text-xs text-zinc-500">{percent}%</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm italic">无应用使用数据</div>
                )}
              </section>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
