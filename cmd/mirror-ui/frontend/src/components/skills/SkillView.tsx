import React from 'react';

export interface SkillNode {
    key: string;
    name: string;
    category: string;
    level: number;
    experience: number;
    progress: number;
    status: string;
}

interface SkillViewProps {
    skills: SkillNode[];
}

// 状态配置
const statusConfig: Record<string, { color: string; label: string }> = {
    growing: { color: '#30D158', label: '成长中' },
    declining: { color: '#FF453A', label: '下滑' },
    stable: { color: '#8E8E93', label: '稳定' },
};

const SkillView: React.FC<SkillViewProps> = ({ skills }) => {
    const getStatus = (status: string) => statusConfig[status] || statusConfig.stable;

    if (!skills || skills.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-semibold text-zinc-100">技能树空空如也</h2>
                <p className="text-zinc-500">开始编写代码，您的技能树将自动成长</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 animate-slide-up">
             <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-semibold text-white tracking-tight">全栈技能树</h2>
                    <p className="text-white/40 text-sm mt-1">Skill Tree</p>
                </div>
                <div className="px-4 py-1.5 glass rounded-full text-xs font-medium text-white/70">
                    {skills.length} skills unlocked
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {skills.map((skill, i) => {
                    const status = getStatus(skill.status);
                    return (
                        <div 
                            key={i} 
                            className="group glass p-5 rounded-2xl hover:bg-white/[0.08] transition-all duration-300 transform hover:-translate-y-0.5 cursor-default relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-11 h-11 bg-gradient-to-br from-[#0A84FF]/20 to-[#5E5CE6]/20 rounded-xl flex items-center justify-center text-lg font-semibold text-white border border-white/5">
                                    {skill.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: status.color, boxShadow: `0 0 6px ${status.color}50` }}
                                    />
                                    <span className="text-[10px] text-white/40">{status.label}</span>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <h3 className="text-base font-medium text-white mb-1 truncate">{skill.name}</h3>
                                <span className="text-[10px] text-white/40 uppercase tracking-widest">{skill.category}</span>
                            </div>

                            <div className="flex justify-between items-center mb-2 text-xs font-medium text-white/50">
                                <span className="text-white/90">Lv.{skill.level}</span>
                                <span>{skill.experience} XP</span>
                            </div>

                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-[#0A84FF] to-[#5E5CE6] rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${Math.min(skill.progress, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SkillView;

