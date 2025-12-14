import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GetSkillTree } from '@/api/app';
import { ISkillNode, SkillNodeDTO, buildSkillTree } from '@/types/skill';

// Mock radar data
const SKILL_BALANCE_DATA = [
  { subject: '并发编程', value: 85 },
  { subject: '框架使用', value: 60 },
  { subject: '测试', value: 45 },
  { subject: '安全', value: 70 },
  { subject: '性能优化', value: 50 },
];

// 递归树节点组件
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

  // 热度衰减：3天内白色，7天以上暗灰
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
              <span
                className={cn(
                  'text-sm font-medium',
                  nameColor,
                  node.type === 'domain' && 'uppercase tracking-wider text-xs font-bold'
                )}
              >
                {node.name}
              </span>
              <div className="flex items-center gap-2">
                <TrendIcon size={12} className={trendColor} />
                <span className="text-[10px] font-mono text-zinc-600">Lv.{node.level}</span>
              </div>
            </div>
            {node.type !== 'domain' && (
              <Progress value={(node.xp / node.maxXp) * 100} className="h-0.5 mt-1" />
            )}
          </div>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            <ul className="pl-4 mt-1 space-y-1 border-l border-zinc-800/50">
              {node.children!.map((child: ISkillNode) => (
                <SkillTreeItem
                  key={child.id}
                  node={child}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  depth={depth + 1}
                />
              ))}
            </ul>
          </CollapsibleContent>
        )}
      </Collapsible>
    </li>
  );
}

export default function SkillView() {
  const [skills, setSkills] = useState<ISkillNode[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<ISkillNode | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSkills = async () => {
      setLoading(true);
      try {
        const data: SkillNodeDTO[] = await GetSkillTree();
        const tree = buildSkillTree(data);
        setSkills(tree);
        // 默认选中第一个子节点
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

  const getTrendText = (trend: string) => {
    if (trend === 'up') return '↗ 上升中';
    if (trend === 'down') return '↘ 下降中';
    return '→ 稳定';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        加载技能树中...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-in fade-in duration-500">
      {/* Tree Explorer (1/3) */}
      <div className="w-1/3 border-r border-zinc-800 pr-4 overflow-y-auto">
        <ul className="space-y-2">
          {skills.map((node) => (
            <SkillTreeItem
              key={node.id}
              node={node}
              selectedId={selectedSkill?.id ?? null}
              onSelect={setSelectedSkill}
            />
          ))}
        </ul>
      </div>

      {/* Detail Pane (2/3) */}
      <div className="flex-1 overflow-y-auto">
        {selectedSkill ? (
          <>
            {/* Header Card */}
            <Card className="bg-zinc-900 border-zinc-800 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 font-bold text-9xl select-none">
                XP
              </div>
              <CardContent className="p-8 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-white">{selectedSkill.name}</h2>
                  <Badge variant="default">Lv.{selectedSkill.level}</Badge>
                </div>
                <p className="text-zinc-400 mb-6">
                  证据来源于最近的会话记录
                </p>

                <div className="flex gap-8 mb-6">
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">总经验值</div>
                    <div className="text-2xl font-mono text-indigo-400">
                      {selectedSkill.xp}{' '}
                      <span className="text-sm text-zinc-600">/ {selectedSkill.maxXp}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">趋势</div>
                    <div className={cn(
                      'text-2xl font-mono',
                      selectedSkill.trend === 'up' ? 'text-emerald-500' : 'text-zinc-400'
                    )}>
                      {getTrendText(selectedSkill.trend)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">最近活跃</div>
                    <div className="text-2xl font-mono text-zinc-300">
                      {selectedSkill.lastActive}
                    </div>
                  </div>
                </div>

                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${(selectedSkill.xp / selectedSkill.maxXp) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Skill Balance (仅 Branch) */}
            {selectedSkill.type !== 'topic' && (
              <Card className="bg-zinc-900 border-zinc-800 mb-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                    技能分布
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SKILL_BALANCE_DATA.map((item) => (
                    <div key={item.subject} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">{item.subject}</span>
                        <span className="text-zinc-500">{item.value}%</span>
                      </div>
                      <Progress value={item.value} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Contextual Evidence */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                  语境证据
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer">
                  <div className="font-mono text-xs text-indigo-400 mb-1">会话 #101</div>
                  大量修改了 <code className="bg-zinc-900 px-1 rounded">pkg/auth/middleware.go</code>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer">
                  <div className="font-mono text-xs text-indigo-400 mb-1">会话 #98</div>
                  阅读文档 30 分钟
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-zinc-500 text-center mt-20">
            选择一个技能查看详情
          </div>
        )}
      </div>
    </div>
  );
}
