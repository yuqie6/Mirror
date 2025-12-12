import React, { useState, useEffect } from 'react';
// @ts-ignore
import { GetTrends } from '../../../wailsjs/go/main/App';

interface TrendReport {
    period: string;
    start_date: string;
    end_date: string;
    total_diffs: number;
    total_coding_mins: number;
    avg_diffs_per_day: number;
    top_languages: LanguageTrend[];
    top_skills: SkillTrend[];
    bottlenecks: string[];
}

interface LanguageTrend {
    language: string;
    diff_count: number;
    percentage: number;
}

interface SkillTrend {
    skill_name: string;
    status: string;
    days_active: number;
}

const TrendsView: React.FC = () => {
    const [trendData, setTrendData] = useState<TrendReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<7 | 30>(7);

    useEffect(() => {
        loadTrends();
    }, [period]);

    const loadTrends = async () => {
        setLoading(true);
        try {
            const res = await GetTrends(period);
            setTrendData(res);
        } catch (e) {
            console.error("Failed to load trends", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !trendData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
                <div className="w-12 h-12 border-2 border-gray-200 border-t-accent-gold rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm tracking-wider uppercase">Calculating Trends...</p>
            </div>
        );
    }

    if (!trendData) return null;

    // Use Top Languages for the chart
    const chartData = trendData.top_languages.slice(0, 7).map(l => ({
        label: l.language,
        value: l.percentage
    }));

    return (
        <div className="space-y-8 pb-12 animate-slide-up">
            {/* 头部 */}
            <header>
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                    趋势分析
                </h1>
                <p className="text-gray-500 mt-1">Trends & Analytics ({trendData.start_date} ~ {trendData.end_date})</p>
            </header>

            {/* 主图表区 */}
            <div className="grid grid-cols-12 gap-5">
                {/* 语言分布图表 */}
                <div className="col-span-8">
                    <div className="card">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">编程语言分布</h3>
                                <p className="text-sm text-gray-400">Language Distribution</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    className={`pill ${period === 7 ? 'pill-active' : ''}`}
                                    onClick={() => setPeriod(7)}
                                >
                                    7天
                                </button>
                                <button 
                                    className={`pill ${period === 30 ? 'pill-active' : ''}`}
                                    onClick={() => setPeriod(30)}
                                >
                                    30天
                                </button>
                            </div>
                        </div>
                        
                        {/* 简易柱状图 */}
                        <div className="flex items-end justify-between gap-4 h-48 px-4">
                            {chartData.length > 0 ? chartData.map((item, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                    <div 
                                        className="w-full bg-gradient-to-t from-accent-gold to-amber-300 rounded-t-lg transition-all duration-500 hover:from-accent-gold hover:to-amber-200"
                                        style={{ height: `${Math.max(item.value, 5)}%` }}
                                    />
                                    <span className="text-xs text-gray-400 truncate w-full text-center" title={item.label}>{item.label}</span>
                                </div>
                            )) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    暂无数据
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 统计摘要 */}
                <div className="col-span-4 space-y-5">
                    <div className="card-dark">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">总编码时长</span>
                            <svg className="w-5 h-5 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="text-3xl font-bold text-white">{(trendData.total_coding_mins / 60).toFixed(1)}h</div>
                        <div className="text-sm text-gray-400 mt-1">Total Duration</div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">日均变更</span>
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">{trendData.avg_diffs_per_day.toFixed(1)}</div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">总变更数</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900">{trendData.total_diffs} Diffs</div>
                        
                        {trendData.top_skills.length > 0 && (
                            <div className="text-sm text-gray-400 mt-2">
                                Top: {trendData.top_skills[0].skill_name}
                            </div>
                        )}
                    </div>
                </div>

                {/* 瓶颈提示或建议 */}
                <div className="col-span-12">
                    <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center text-white">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">
                                    {trendData.bottlenecks.length > 0 ? "发现潜在瓶颈" : "状态良好"}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {trendData.bottlenecks.length > 0 
                                        ? trendData.bottlenecks[0] 
                                        : "你的技能树正在稳步成长，继续保持！"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrendsView;
