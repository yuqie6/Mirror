import React, { useMemo } from 'react';

export interface DailySummary {
    date: string;
    summary: string;
    highlights: string;
    struggles: string;
    skills_gained: string[];
    total_coding: number;
    total_diffs: number;
}

export interface AppStat {
    app_name: string;
    total_duration: number;
    event_count: number;
}

export interface SkillNode {
    key: string;
    name: string;
    category: string;
}

interface SummaryViewProps {
    summary: DailySummary | null;
    loading: boolean;
    error: string | null;
    onGenerate: () => void;
    skills?: SkillNode[];
    appStats?: AppStat[];
}

// 判断是否为编码应用
const isCodeEditor = (appName: string): boolean => {
    const codeEditors = ['code', 'cursor', 'goland', 'idea', 'pycharm', 'webstorm', 'vim', 'nvim', 'sublime', 'atom', 'vscode', 'android studio'];
    const lower = appName.toLowerCase();
    return codeEditors.some(editor => lower.includes(editor));
};

// 统计卡片组件
const StatCard: React.FC<{
    value: string | number;
    label: string;
    icon?: React.ReactNode;
}> = ({ value, label, icon }) => (
    <div className="stat-card">
        <div className="flex items-center gap-2 text-gray-400">
            {icon}
            <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-4xl font-bold text-gray-900 tracking-tight">{value}</div>
    </div>
);

// 主卡片组件 - 深色背景
const MainCard: React.FC<{
    title: string;
    subtitle: string;
    value: string;
}> = ({ title, subtitle, value }) => (
    <div className="card-dark h-full">
        {/* 装饰曲线 */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
            <defs>
                <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#F6C343" stopOpacity="0.1" />
                </linearGradient>
            </defs>
            <path
                d="M0,150 Q100,50 200,100 T400,80"
                fill="none"
                stroke="url(#curveGradient)"
                strokeWidth="2"
            />
            <path
                d="M0,180 Q150,100 300,120 T400,100"
                fill="none"
                stroke="url(#curveGradient)"
                strokeWidth="1.5"
                opacity="0.5"
            />
        </svg>
        
        <div className="relative z-10">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{subtitle}</p>
            <h3 className="text-xl font-semibold text-white mb-6">{title}</h3>
            <div className="text-3xl font-bold text-gradient">{value}</div>
        </div>
    </div>
);

// 活动时间线
const ActivityItem: React.FC<{
    time: string;
    title: string;
    subtitle?: string;
}> = ({ time, title, subtitle }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
        <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium w-16">{time}</span>
            <div>
                <p className="text-sm font-medium text-gray-900">{title}</p>
                {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
            </div>
        </div>
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    </div>
);

// 系统提醒卡片
const AlertCard: React.FC<{
    alerts: { title: string; subtitle: string }[];
    total: number;
}> = ({ alerts, total }) => (
    <div className="card-dark">
        <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white">系统提醒</span>
            <span className="text-2xl font-bold text-white">{alerts.length}/{total}</span>
        </div>
        <div className="space-y-3">
            {alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">{alert.title}</p>
                        <p className="text-xs text-gray-400">{alert.subtitle}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SummaryView: React.FC<SummaryViewProps> = ({ summary, loading, error, onGenerate, skills = [], appStats = [] }) => {
    // 计算编码专注度
    const focusStats = useMemo(() => {
        if (!appStats.length) return { focusPercent: 0, codingTime: 0, totalTime: 0 };
        
        let codingTime = 0;
        let totalTime = 0;
        
        for (const stat of appStats) {
            totalTime += stat.total_duration;
            if (isCodeEditor(stat.app_name)) {
                codingTime += stat.total_duration;
            }
        }
        
        const focusPercent = totalTime > 0 ? Math.round((codingTime / totalTime) * 100) : 0;
        return { focusPercent, codingTime, totalTime };
    }, [appStats]);

    // 计算技能分布
    const skillDistribution = useMemo(() => {
        if (!skills.length) return [];
        
        const categoryCount: Record<string, number> = {};
        for (const skill of skills) {
            const cat = skill.category || 'other';
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        }
        
        const total = skills.length;
        const categoryLabels: Record<string, string> = {
            language: '编程语言',
            framework: '框架',
            database: '数据库',
            devops: 'DevOps',
            tool: '工具',
            concept: '概念',
            other: '其他',
        };
        
        return Object.entries(categoryCount)
            .map(([cat, count]) => ({
                category: cat,
                label: categoryLabels[cat] || cat,
                count,
                percent: Math.round((count / total) * 100),
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3); // 只显示前3个
    }, [skills]);

    // 空状态
    if (!summary && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in">
                <div className="relative">
                    <div className="absolute inset-0 bg-accent-gold/20 blur-3xl rounded-full"></div>
                    <h2 className="text-4xl font-bold text-gray-900 relative z-10 tracking-tight">
                        Welcome back, <span className="text-gradient">Developer</span>
                    </h2>
                </div>
                <p className="text-gray-500 text-lg max-w-md">
                    Mirror 将分析您的代码足迹，生成深度的成长见解。
                </p>
                
                <button 
                    className="btn-gold flex items-center gap-2" 
                    onClick={onGenerate}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                    生成今日总结
                </button>
                
                {error && (
                    <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    // 加载状态
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
                <div className="w-12 h-12 border-2 border-gray-200 border-t-accent-gold rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm tracking-wider uppercase">Analyzing Codebase...</p>
            </div>
        );
    }

    if (!summary) return null;

    return (
        <div className="space-y-8 pb-12 animate-slide-up">
            {/* 欢迎区 + 进度条 */}
            <header className="space-y-6">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                            Welcome back, <span className="text-gradient">Developer</span>
                        </h1>
                    </div>
                    {/* 右侧统计 */}
                    <div className="flex items-center gap-8">
                        <StatCard value={`${Math.round(summary.total_coding / 60)}h`} label="专注时间" />
                        <StatCard value={summary.total_diffs} label="代码变更" />
                        <StatCard value={summary.skills_gained?.length || 0} label="技能增长" />
                    </div>
                </div>
                
                {/* 进度条区域 */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">编码专注度</span>
                        <span className="text-sm font-medium text-gray-900">{focusStats.focusPercent}%</span>
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-gold transition-all duration-500" style={{ width: `${focusStats.focusPercent}%` }} />
                    </div>
                </div>
            </header>

            {/* 卡片网格 */}
            <div className="grid grid-cols-12 gap-5">
                {/* 主卡片 */}
                <div className="col-span-4 row-span-2">
                    <MainCard
                        title="今日概览"
                        subtitle="Daily Overview"
                        value={summary.date}
                    />
                </div>

                {/* 专注度卡片 - 使用真实数据 */}
                <div className="col-span-3">
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs text-gray-400 uppercase tracking-wider">编码专注</span>
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                        </div>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-2xl font-bold text-gray-900">{focusStats.focusPercent > 70 ? 'High' : focusStats.focusPercent > 40 ? 'Medium' : 'Low'}</span>
                            <span className="px-2 py-0.5 bg-accent-gold/20 text-accent-gold text-xs font-medium rounded-full">{focusStats.focusPercent}%</span>
                        </div>
                        {/* 显示应用时长分布 */}
                        <div className="text-xs text-gray-500">
                            编码 {Math.round(focusStats.codingTime / 60)} 分钟 / 总计 {Math.round(focusStats.totalTime / 60)} 分钟
                        </div>
                    </div>
                </div>

                {/* 时间卡片 */}
                <div className="col-span-2">
                    <div className="card h-full flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-400 uppercase tracking-wider mb-2">专注时长</span>
                        <div className="relative w-20 h-20">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="16" fill="none" stroke="#E5E7EB" strokeWidth="2" />
                                <circle cx="18" cy="18" r="16" fill="none" stroke="#D4AF37" strokeWidth="2" strokeDasharray={`${focusStats.focusPercent} ${100 - focusStats.focusPercent}`} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-bold text-gray-900">{Math.round(summary.total_coding / 60)}h</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 技能分布卡片 - 使用真实数据 */}
                <div className="col-span-3">
                    <div className="card">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">技能分布</span>
                        <div className="mt-3 space-y-2">
                            {skillDistribution.length > 0 ? skillDistribution.map((item, i) => (
                                <div key={item.category}>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">{item.label}</span>
                                        <span className="font-medium">{item.percent}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                                        <div className="h-full bg-accent-gold rounded-full transition-all duration-500" style={{ width: `${item.percent}%`, opacity: 1 - i * 0.2 }} />
                                    </div>
                                </div>
                            )) : (
                                <div className="text-sm text-gray-400">暂无技能数据</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 最近活动 */}
                <div className="col-span-5">
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-900">核心总结</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">{summary.summary}</p>
                    </div>
                </div>

                {/* 系统提醒 */}
                <div className="col-span-3">
                    <AlertCard
                        alerts={[
                            { title: '高光时刻', subtitle: summary.highlights?.slice(0, 30) + '...' || '暂无' },
                            { title: '待改进', subtitle: summary.struggles?.slice(0, 30) + '...' || '无' },
                        ]}
                        total={2}
                    />
                </div>

                {/* 技能标签 */}
                <div className="col-span-12">
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-900">今日习得技能</span>
                            <span className="text-xs text-gray-400">{summary.skills_gained?.length || 0} skills</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {summary.skills_gained?.map((skill, i) => (
                                <span key={i} className="pill hover:pill-active transition-colors cursor-default">
                                    {skill}
                                </span>
                            ))}
                            {(!summary.skills_gained || summary.skills_gained.length === 0) && (
                                <span className="text-sm text-gray-400">暂无新技能</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryView;
