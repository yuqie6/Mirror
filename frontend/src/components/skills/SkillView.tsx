import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  FileCode,
  History,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GetSkillTree, GetSkillEvidence, GetSkillSessions } from '@/api/app';
import { ISkillNode, SkillNodeDTO, buildSkillTree } from '@/types/skill';

interface SkillEvidence {
  source: string;
  evidence_id: number;
  timestamp: number;
  contribution_context: string;
  file_name: string;
}

interface SkillSession {
  id: number;
  category: string;
  summary: string;
  time_range: string;
  date: string;
}

interface SkillTreeItemProps {
  node: ISkillNode;
  selectedId: string | null;
  onSelect: (node: ISkillNode) => void;
  depth?: number;
}

function SkillTreeItem({ node, selectedId, onSelect, depth = 0 }: SkillTreeItemProps) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const isRecent = node.lastActive === 'Today' || node.lastActive === 'Yesterday' || node.lastActive === '今天' || node.lastActive === '昨天';
  const nameColor = isRecent ? 'text-zinc-200' : 'text-zinc-500';

  const TrendIcon = node.trend === 'up' ? TrendingUp : node.trend === 'down' ? TrendingDown : Minus;
  const trendColor = node.trend === 'up' ? 'text-emerald-500' : node.trend === 'down' ? 'text-rose-500' : 'text-zinc-500';

  return (
    <li>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors',
            isSelected ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'hover:bg-zinc-900 border-l-2 border-transparent'
          )}
          onClick={() => onSelect(node)}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <button className="text-[10px] w-4 text-center text-zinc-600 hover:text-zinc-400">
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            </CollapsibleTrigger>
          ) : (
            <span className="text-[10px] w-4 text-center text-zinc-600">•</span>
          )}

          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className={cn('text-sm font-medium', nameColor, node.type === 'domain' && 'uppercase tracking-wider text-xs font-bold')}>
                {node.name}
              </span>
              <div className="flex items-center gap-2">
                <TrendIcon size={12} className={trendColor} />
                <span className="text-[10px] font-mono text-zinc-600">Lv.{node.level}</span>
              </div>
            </div>
            {node.type !== 'domain' && (
              <Progress value={node.progress} className="h-0.5 mt-1" />
            )}
          </div>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            <ul className="pl-4 mt-1 space-y-1 border-l border-zinc-800/50">
              {node.children!.map((child: ISkillNode) => (
                <SkillTreeItem key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
              ))}
            </ul>
          </CollapsibleContent>
        )}
      </Collapsible>
    </li>
  );
}

interface SkillViewProps {
  onNavigateToSession?: (sessionId: number) => void;
}

export default function SkillView({ onNavigateToSession }: SkillViewProps) {
  const [skills, setSkills] = useState<ISkillNode[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<ISkillNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [evidence, setEvidence] = useState<SkillEvidence[]>([]);
  const [sessions, setSessions] = useState<SkillSession[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  
  // 可拖拽分栏
  const [leftWidth, setLeftWidth] = useState(33);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const loadSkills = async () => {
      setLoading(true);
      try {
        const data: SkillNodeDTO[] = await GetSkillTree();
        const tree = buildSkillTree(data);
        setSkills(tree);
        if (tree.length > 0 && tree[0].children && tree[0].children.length > 0) {
          setSelectedSkill(tree[0].children[0]);
        }
      } catch (e) {
        console.error('Failed to load skills:', e);
      } finally {
        setLoading(false);
      }
    };
    loadSkills();
  }, []);

  useEffect(() => {
    if (!selectedSkill) return;
    
    const loadEvidence = async () => {
      setLoadingEvidence(true);
      try {
        const [evidenceData, sessionsData] = await Promise.all([
          GetSkillEvidence(selectedSkill.id).catch(() => []),
          GetSkillSessions(selectedSkill.id).catch(() => []),
        ]);
        setEvidence(evidenceData || []);
        setSessions(sessionsData || []);
      } catch (e) {
        console.error('Failed to load evidence:', e);
      } finally {
        setLoadingEvidence(false);
      }
    };
    loadEvidence();
  }, [selectedSkill]);

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
      setLeftWidth(Math.max(20, Math.min(60, newWidth)));
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

  const getTrendText = (trend: string) => {
    if (trend === 'up') return '↗ 上升中';
    if (trend === 'down') return '↘ 下降中';
    return '→ 稳定';
  };

  const formatTimestamp = (ts: number): string => {
    if (!ts) return '--';
    return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-zinc-500">加载技能树中...</div>;
  }

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-8rem)] animate-in fade-in duration-500">
      {/* Tree Explorer - 可拖拽宽度 */}
      <div style={{ width: `${leftWidth}%` }} className="pr-2 overflow-y-auto border-r border-zinc-800">
        <ul className="space-y-2">
          {skills.map((node) => (
            <SkillTreeItem key={node.id} node={node} selectedId={selectedSkill?.id ?? null} onSelect={setSelectedSkill} />
          ))}
        </ul>
      </div>

      {/* 拖拽手柄 */}
      <div
        onMouseDown={handleMouseDown}
        className="w-2 flex items-center justify-center cursor-col-resize hover:bg-zinc-800 transition-colors group"
      >
        <GripVertical size={12} className="text-zinc-600 group-hover:text-zinc-400" />
      </div>

      {/* Detail Pane */}
      <div style={{ width: `${100 - leftWidth - 1}%` }} className="pl-2 overflow-y-auto">
        {selectedSkill ? (
          <>
            {/* Header Card */}
            <Card className="bg-zinc-900 border-zinc-800 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 font-bold text-9xl select-none">XP</div>
              <CardContent className="p-8 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-white">{selectedSkill.name}</h2>
                  <Badge variant="default">Lv.{selectedSkill.level}</Badge>
                </div>

                <div className="flex gap-8 mb-6">
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">总经验值</div>
                    <div className="text-2xl font-mono text-indigo-400">
                      {selectedSkill.xp} <span className="text-sm text-zinc-600">({selectedSkill.progress}%)</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">趋势</div>
                    <div className={cn('text-2xl font-mono', selectedSkill.trend === 'up' ? 'text-emerald-500' : 'text-zinc-400')}>
                      {getTrendText(selectedSkill.trend)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">最近活跃</div>
                    <div className="text-2xl font-mono text-zinc-300">{selectedSkill.lastActive}</div>
                  </div>
                </div>

                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${selectedSkill.progress}%` }} />
                </div>
              </CardContent>
            </Card>

            {/* 相关会话 - 可点击跳转 */}
            <Card className="bg-zinc-900 border-zinc-800 mb-6">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <History size={14} /> 相关会话
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingEvidence ? (
                  <div className="text-zinc-500 text-sm">加载中...</div>
                ) : sessions.length > 0 ? (
                  sessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      onClick={() => onNavigateToSession?.(session.id)}
                      className="p-3 bg-zinc-950 border border-zinc-800 rounded text-sm cursor-pointer hover:bg-zinc-900 hover:border-zinc-700 transition-colors group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono text-xs text-indigo-400 mb-1">会话 #{session.id} • {session.date}</div>
                          <div className="text-zinc-300">{session.category || session.summary}</div>
                          <div className="text-xs text-zinc-500 mt-1">{session.time_range}</div>
                        </div>
                        <ExternalLink size={14} className="text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-zinc-500 text-sm italic">暂无相关会话</div>
                )}
              </CardContent>
            </Card>

            {/* 代码证据 - 使用后端正确字段 */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <FileCode size={14} /> 代码证据
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingEvidence ? (
                  <div className="text-zinc-500 text-sm">加载中...</div>
                ) : evidence.length > 0 ? (
                  evidence.slice(0, 10).map((ev) => (
                    <Collapsible key={ev.evidence_id}>
                      <div className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden">
                        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors text-left">
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <FileCode size={14} className="text-emerald-400" />
                            <span className="text-zinc-300 truncate max-w-[200px]">{ev.file_name || ev.source}</span>
                            <Badge variant="outline" className="text-[10px]">{ev.source}</Badge>
                          </div>
                          <ChevronDown size={14} className="text-zinc-500" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t border-zinc-800 p-3">
                            {ev.contribution_context && (
                              <div className="mb-2 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded text-sm text-indigo-200">
                                <span className="text-indigo-400 font-medium">上下文：</span> {ev.contribution_context}
                              </div>
                            )}
                            <div className="text-xs text-zinc-500">
                              来源 ID: {ev.evidence_id}
                              <br />
                              时间: {formatTimestamp(ev.timestamp)}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))
                ) : (
                  <div className="text-zinc-500 text-sm italic">暂无代码证据</div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-zinc-500 text-center mt-20">选择一个技能查看详情</div>
        )}
      </div>
    </div>
  );
}
