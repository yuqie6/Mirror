import { useState, useEffect } from 'react';
import './App.css';
import { GetTodaySummary, GetSkillTree } from "../wailsjs/go/main/App";
import MainLayout from './components/layout/MainLayout';
import SummaryView, { DailySummary } from './components/dashboard/SummaryView';
import SkillView, { SkillNode } from './components/skills/SkillView';
import TrendsView from './components/dashboard/TrendsView';

function App() {
    // 状态管理
    const [activeTab, setActiveTab] = useState<'summary' | 'skills' | 'trends'>('summary');
    
    // 数据状态
    const [summary, setSummary] = useState<DailySummary | null>(null);
    const [skills, setSkills] = useState<SkillNode[]>([]);
    
    // UI状态
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 加载今日总结
    const loadSummary = async () => {
        setLoading(true);
        setError(null);
        try {
            // @ts-ignore
            const result = await GetTodaySummary();
            setSummary(result);
        } catch (e: any) {
            setError(e.message || '加载失败');
        } finally {
            setLoading(false);
        }
    };

    // 加载技能树
    const loadSkills = async () => {
        try {
            // @ts-ignore
            const result = await GetSkillTree();
            setSkills(result || []);
        } catch (e: any) {
            console.error('加载技能失败:', e);
        }
    };

    // 初始加载
    useEffect(() => {
        loadSkills();
    }, []);

    // 视图渲染逻辑
    const renderContent = () => {
        switch (activeTab) {
            case 'summary':
                return (
                    <SummaryView 
                        summary={summary} 
                        loading={loading} 
                        error={error} 
                        onGenerate={loadSummary} 
                    />
                );
            case 'skills':
                return <SkillView skills={skills} />;
            case 'trends':
                return <TrendsView />;
            default:
                return null;
        }
    };

    return (
        <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
            {renderContent()}
        </MainLayout>
    );
}

export default App;
