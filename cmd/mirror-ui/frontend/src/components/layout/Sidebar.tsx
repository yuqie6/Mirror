import React from 'react';

interface SidebarProps {
    activeTab: 'summary' | 'skills' | 'trends';
    onTabChange: (tab: 'summary' | 'skills' | 'trends') => void;
}

// SVG 图标组件
const Icons = {
    summary: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
    ),
    skills: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
    ),
    trends: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
    ),
    user: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
    ),
};

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
    const menuItems = [
        { id: 'summary', icon: Icons.summary, label: '今日总结' },
        { id: 'skills', icon: Icons.skills, label: '技能树' },
        { id: 'trends', icon: Icons.trends, label: '趋势分析' },
    ];

    return (
        <aside className="w-[260px] h-screen glass-panel flex flex-col shrink-0 relative z-50">
            {/* 品牌区域 */}
            <div className="h-16 flex items-center px-5 gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0A84FF] to-[#5E5CE6] flex items-center justify-center text-sm font-semibold text-white shadow-lg shadow-[#0A84FF]/30">
                    M
                </div>
                <h1 className="text-base font-semibold tracking-tight text-white/90">Mirror</h1>
            </div>
            
            {/* 导航区域 */}
            <nav className="flex flex-col gap-1 px-3 flex-1 pt-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                            ${activeTab === item.id 
                                ? 'bg-white/10 text-white font-medium' 
                                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                            }
                        `}
                        onClick={() => onTabChange(item.id as any)}
                    >
                        <span className={activeTab === item.id ? 'text-[#0A84FF]' : ''}>
                            {item.icon}
                        </span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* 底部用户信息 */}
            <div className="p-3 mt-auto border-t border-white/[0.05]">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/[0.05] cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-zinc-300 border border-white/10">
                        {Icons.user}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-200">Developer</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#30D158] shadow-[0_0_6px_rgba(48,209,88,0.5)]"></div>
                            <span className="text-[10px] text-zinc-500">Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

