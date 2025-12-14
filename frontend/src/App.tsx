import { useState, useEffect } from 'react';
import './App.css';
import MainLayout, { TabId, SystemHealthIndicator } from '@/components/layout/MainLayout';
import DashboardView from '@/components/dashboard/DashboardView';
import SessionsView from '@/components/sessions/SessionsView';
import SkillView from '@/components/skills/SkillView';
import ReportsView from '@/components/reports/ReportsView';
import StatusView from '@/components/status/StatusView';
import SettingsView from '@/components/settings/SettingsView';
import { GetStatus } from '@/api/app';
import { StatusDTO, extractHealthIndicator } from '@/types/status';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [systemIndicator, setSystemIndicator] = useState<SystemHealthIndicator | null>(null);

  // 加载系统健康状态
  const refreshSystemIndicator = async () => {
    try {
      const status: StatusDTO = await GetStatus();
      setSystemIndicator(extractHealthIndicator(status));
    } catch (e) {
      console.error('Failed to load status:', e);
    }
  };

  // 初始加载
  useEffect(() => {
    refreshSystemIndicator();
  }, []);

  // 订阅 Agent 实时事件
  useEffect(() => {
    const es = new EventSource('/api/events');

    const refresh = () => {
      void refreshSystemIndicator();
    };

    es.addEventListener('data_changed', refresh);
    es.addEventListener('settings_updated', refresh);
    es.addEventListener('pipeline_status_changed', refresh);

    es.onerror = () => {
      // 浏览器会自动重连
    };

    return () => {
      es.close();
    };
  }, []);

  // 视图渲染
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setActiveTab(tab as TabId)} />;
      case 'sessions':
        return <SessionsView />;
      case 'skills':
        return <SkillView />;
      case 'reports':
        return <ReportsView />;
      case 'status':
        return <StatusView />;
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      systemIndicator={systemIndicator}
    >
      {renderContent()}
    </MainLayout>
  );
}

export default App;
