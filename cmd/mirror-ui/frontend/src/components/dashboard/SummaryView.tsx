import React from 'react';

export interface DailySummary {
    date: string;
    summary: string;
    highlights: string;
    struggles: string;
    skills_gained: string[];
    total_coding: number;
    total_diffs: number;
}

interface SummaryViewProps {
    summary: DailySummary | null;
    loading: boolean;
    error: string | null;
    onGenerate: () => void;
}

// SVG 图标
const Icons = {
    sparkle: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
    ),
    refresh: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
    ),
};

// 玻璃拟态卡片组件
const GlassCard: React.FC<{ 
    children: React.ReactNode; 
    className?: string; 
    title?: string;
    accentColor?: string;
}> = ({ children, className = '', title, accentColor }) => (
    <div className={`glass p-6 rounded-2xl relative overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 ${className}`}>
        {/* 左侧强调色条 */}
        {accentColor && (
            <div className="accent-bar" style={{ backgroundColor: accentColor }} />
        )}
        
        {title && (
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-widest mb-4 pl-3">
                {title}
            </h3>
        )}
        <div className={accentColor ? 'pl-3' : ''}>
            {children}
        </div>
    </div>
);

const SummaryView: React.FC<SummaryViewProps> = ({ summary, loading, error, onGenerate }) => {
    if (!summary && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in">
                <div className="relative">
                    <div className="absolute inset-0 bg-[#0A84FF]/20 blur-3xl rounded-full"></div>
                    <h2 className="text-4xl font-semibold text-white relative z-10 tracking-tight">
                        准备好回顾今天了吗？
                    </h2>
                </div>
                <p className="text-zinc-400 text-lg max-w-md">
                    Mirror 将分析您的代码足迹，生成深度的成长见解。
                </p>
                
                <button 
                    className="group relative px-8 py-3 bg-[#0A84FF] text-white font-medium rounded-full overflow-hidden transition-all hover:bg-[#0A84FF]/90 active:scale-95 shadow-lg shadow-[#0A84FF]/30" 
                    onClick={onGenerate}
                >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <span className="relative flex items-center gap-2">
                        {Icons.sparkle}
                        生成今日总结
                    </span>
                </button>
                {error && (
                    <div className="glass px-4 py-2 rounded-lg text-red-400 text-sm border-red-500/20 bg-red-500/5">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
                <div className="w-12 h-12 border-2 border-white/10 border-t-[#0A84FF] rounded-full animate-spin"></div>
                <p className="text-white/40 text-sm tracking-wider uppercase">Analyzing Codebase...</p>
            </div>
        );
    }

    if (!summary) return null;

    return (
        <div className="space-y-6 pb-20 animate-slide-up">
            <header className="flex justify-between items-end mb-8">
                <div className="space-y-1">
                    <h2 className="text-5xl font-semibold tracking-tight text-white">{summary.date}</h2>
                    <p className="text-white/40">Daily Review</p>
                </div>
                <button 
                    className="flex items-center gap-2 text-sm text-white/50 hover:text-white px-4 py-2 rounded-full border border-white/10 hover:border-white/20 transition-colors" 
                    onClick={onGenerate}
                >
                    {Icons.refresh}
                    重新生成
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 核心数据卡片 */}
                <GlassCard title="专注时间" className="lg:col-span-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-light text-white tracking-tighter">
                            {summary.total_coding}
                        </span>
                        <span className="text-xl text-white/40">min</span>
                    </div>
                </GlassCard>
                
                <GlassCard title="代码变更" className="lg:col-span-2">
                     <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-light text-[#0A84FF] tracking-tighter">
                            {summary.total_diffs}
                        </span>
                        <span className="text-xl text-white/40">changes</span>
                    </div>
                </GlassCard>

                {/* 总结 */}
                <GlassCard className="md:col-span-2 lg:col-span-4" title="核心总结" accentColor="#0A84FF">
                    <p className="text-white/80 leading-relaxed text-lg font-light">{summary.summary}</p>
                </GlassCard>

                {/* 亮点 */}
                <GlassCard className="md:col-span-2" title="高光时刻" accentColor="#FFD60A">
                     <p className="text-zinc-200 leading-relaxed font-light">{summary.highlights}</p>
                </GlassCard>

                 {/* 挑战 (如果有) */}
                 {summary.struggles && summary.struggles !== '无' && (
                    <GlassCard className="md:col-span-2" title="挑战与突破" accentColor="#FF453A">
                        <p className="text-zinc-200 leading-relaxed font-light">{summary.struggles}</p>
                    </GlassCard>
                )}

                {/* 技能标签 */}
                 <GlassCard className="md:col-span-2 lg:col-span-4" title="技能习得" accentColor="#30D158">
                    <div className="flex flex-wrap gap-2">
                        {summary.skills_gained.map((skill, i) => (
                            <span 
                                key={i} 
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/90 border border-white/5 rounded-lg text-sm transition-all"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default SummaryView;

