import React from 'react';

const TrendsView: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] glass rounded-3xl p-12 text-center space-y-6 animate-fade-in mx-auto max-w-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0A84FF]/20 to-[#5E5CE6]/20 flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-[#0A84FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
            </div>
            <h2 className="text-2xl font-semibold text-white tracking-tight">趋势分析</h2>
            <p className="text-white/50 max-w-sm leading-relaxed">
                Mirror 正在收集不仅仅是今日，更是关于你未来的成长数据。可视化图表即将上线。
            </p>
        </div>
    );
};

export default TrendsView;

