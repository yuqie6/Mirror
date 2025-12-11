import React from 'react';
import Sidebar from './Sidebar';

interface MainLayoutProps {
    children: React.ReactNode;
    activeTab: 'summary' | 'skills' | 'trends';
    onTabChange: (tab: 'summary' | 'skills' | 'trends') => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, activeTab, onTabChange }) => {
    return (
        // 背景升级：加入流动的极光渐变，不再是死寂的纯黑
        <div className="min-h-screen bg-[#050505] relative overflow-hidden selection:bg-indigo-500/30 font-sans">
            
            {/* 顶部主光源 - 蓝色极光 */}
            <div className="fixed top-[-20%] left-[20%] w-[50vw] h-[50vw] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow pointer-events-none" />
            
            {/* 底部副光源 - 紫色氛围 */}
            <div className="fixed bottom-[-20%] right-[10%] w-[40vw] h-[40vw] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen animate-pulse-slow delay-700 pointer-events-none" />

            {/* 左侧侧边栏强调光 */}
            <div className="fixed top-[10%] left-[-10%] w-[30vw] h-[60vh] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

            {/* 噪点纹理 - 增加胶片质感 */}
            <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
            
            <div className="flex relative z-10 h-screen">
                <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
                
                <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto h-screen scroll-smooth">
                    <div className="max-w-7xl mx-auto animate-fade-in pb-20">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
