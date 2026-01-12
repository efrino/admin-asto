import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { UsersTab } from './components/UsersTab';
import { ActivitiesTab } from './components/ActivitiesTab';
import { ModulesTab } from './components/ModulesTab';
import { QuizzesTab } from './components/QuizzesTab';
import { MecaSheetTab } from './components/MecaSheetTab';
import { ErrorCodesTab } from './components/ErrorCodesTab';
import { MecaAidTab } from './components/MecaAidTab';
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
    activeModules: 0,
    totalQuizzes: 0,
    activeQuizzes: 0,
    totalErrorCodes: 0,
    activeErrorCodes: 0
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
      const { data: quizzesData } = await supabase.from('quizzes').select('*');

      // Try to get error_codes, but don't fail if table doesn't exist yet
      let errorCodesData = [];
      try {
        const { data } = await supabase.from('error_codes').select('*');
        errorCodesData = data || [];
      } catch (e) {
        // Table might not exist yet
      }

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
        activeModules: modulesData?.filter(m => m.is_active).length || 0,
        totalQuizzes: quizzesData?.length || 0,
        activeQuizzes: quizzesData?.filter(q => q.is_active).length || 0,
        totalErrorCodes: errorCodesData?.length || 0,
        activeErrorCodes: errorCodesData?.filter(e => e.is_active).length || 0
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
          <div className="flex gap-2 mb-6 border-b overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-3 font-semibold transition-colors whitespace-nowrap text-sm ${activeTab === 'users'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`pb-3 px-3 font-semibold transition-colors whitespace-nowrap text-sm ${activeTab === 'modules'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Modules
            </button>
            <button
              onClick={() => setActiveTab('meca_sheet')}
              className={`pb-3 px-3 font-semibold transition-colors whitespace-nowrap text-sm ${activeTab === 'meca_sheet'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Meca Sheet
            </button>
            <button
              onClick={() => setActiveTab('meca_aid')}
              className={`pb-3 px-3 font-semibold transition-colors whitespace-nowrap text-sm ${activeTab === 'meca_aid'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Meca Aid
            </button>
            <button
              onClick={() => setActiveTab('error_codes')}
              className={`pb-3 px-3 font-semibold transition-colors whitespace-nowrap text-sm ${activeTab === 'error_codes'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Error Codes
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`pb-3 px-3 font-semibold transition-colors whitespace-nowrap text-sm ${activeTab === 'quizzes'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Quiz / Sertifikasi
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`pb-3 px-3 font-semibold transition-colors whitespace-nowrap text-sm ${activeTab === 'activities'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Activity Logs
            </button>
          </div>

          {activeTab === 'users' && <UsersTab onStatsUpdate={calculateStats} />}
          {activeTab === 'modules' && <ModulesTab admin={admin} onStatsUpdate={calculateStats} />}
          {activeTab === 'meca_sheet' && <MecaSheetTab admin={admin} onStatsUpdate={calculateStats} />}
          {activeTab === 'meca_aid' && <MecaAidTab admin={admin} onStatsUpdate={calculateStats} />}
          {activeTab === 'error_codes' && <ErrorCodesTab admin={admin} onStatsUpdate={calculateStats} />}
          {activeTab === 'quizzes' && <QuizzesTab onStatsUpdate={calculateStats} />}
          {activeTab === 'activities' && <ActivitiesTab />}
        </div>
      </div>
    </div>
  );
}

export default App;