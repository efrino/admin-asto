import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { UsersTab } from './components/UsersTab';
import { ActivitiesTab } from './components/ActivitiesTab';
import { ModulesTab } from './components/ModulesTab';
import { supabase } from './config/supabase';

function App() {
  const { admin, loading, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalActivities: 0,
    todayActivities: 0,
    totalModules: 0,
    activeModules: 0
  });

  useEffect(() => {
    if (admin) {
      calculateStats();
    }
  }, [admin]);

  const calculateStats = async () => {
    try {
      const { data: usersData } = await supabase.from('users').select('*');
      const { data: activitiesData } = await supabase.from('activity_logs').select('*');
      const { data: modulesData } = await supabase.from('modules').select('*');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayActivities = activitiesData?.filter(log =>
        new Date(log.created_at) >= today
      ).length || 0;

      setStats({
        totalUsers: usersData?.length || 0,
        activeUsers: usersData?.filter(u => u.is_active).length || 0,
        totalActivities: activitiesData?.length || 0,
        todayActivities,
        totalModules: modulesData?.length || 0,
        activeModules: modulesData?.filter(m => m.is_active).length || 0
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="text-white text-2xl mb-4">Loading Dashboard...</div>
          <div className="flex justify-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <Header admin={admin} onLogout={logout} />
        <StatsCards stats={stats} />

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex gap-4 mb-6 border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-4 font-semibold transition-colors whitespace-nowrap ${activeTab === 'users'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Users Management
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`pb-3 px-4 font-semibold transition-colors whitespace-nowrap ${activeTab === 'modules'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Modules Management
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`pb-3 px-4 font-semibold transition-colors whitespace-nowrap ${activeTab === 'activities'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Activity Logs
            </button>
          </div>

          {activeTab === 'users' && <UsersTab onStatsUpdate={calculateStats} />}
          {activeTab === 'modules' && <ModulesTab admin={admin} onStatsUpdate={calculateStats} />}
          {activeTab === 'activities' && <ActivitiesTab />}
        </div>
      </div>
    </div>
  );
}

export default App;