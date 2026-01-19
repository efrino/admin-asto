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
import { AnimationsTab } from './components/AnimationsTab';
import { supabase } from './config/supabase';

function App() {
  const { admin, loading, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalActivities: 0,
    todayActivities: 0,
    // Modules by category
    totalModules: {
      module: 0,
      animation: 0,
      meca_sheet: 0,
      meca_aid: 0
    },
    activeModules: {
      module: 0,
      animation: 0,
      meca_sheet: 0,
      meca_aid: 0
    },
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
      const { data: usersData } = await supabase.from('users').select('id, is_active');
      const { data: activitiesData } = await supabase.from('activity_logs').select('id, created_at');
      const { data: modulesData } = await supabase.from('modules').select('id, category, is_active');
      const { data: quizzesData } = await supabase.from('quizzes').select('id, is_active');

      // Try to get error_codes
      let errorCodesData = [];
      try {
        const { data } = await supabase.from('error_codes').select('id, is_active');
        errorCodesData = data || [];
      } catch (e) {
        // Table might not exist yet
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayActivities = activitiesData?.filter(log =>
        new Date(log.created_at) >= today
      ).length || 0;

      // Calculate modules by category
      const categories = ['module', 'animation', 'meca_sheet', 'meca_aid'];
      const totalModules = {};
      const activeModules = {};

      categories.forEach(cat => {
        const catItems = modulesData?.filter(m => m.category === cat) || [];
        totalModules[cat] = catItems.length;
        activeModules[cat] = catItems.filter(m => m.is_active).length;
      });

      setStats({
        totalUsers: usersData?.length || 0,
        activeUsers: usersData?.filter(u => u.is_active).length || 0,
        totalActivities: activitiesData?.length || 0,
        todayActivities,
        totalModules,
        activeModules,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="animate-pulse text-center">
          <div className="text-white text-xl sm:text-2xl mb-4">Loading Dashboard...</div>
          <div className="flex justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!admin) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <Header admin={admin} onLogout={logout} />
        <StatsCards stats={stats} />

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-4 md:p-6">
          {/* Tab Navigation */}
          <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b overflow-x-auto pb-1 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 scrollbar-hide">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-2 sm:pb-3 px-2 sm:px-3 font-medium sm:font-semibold transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'users'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`pb-2 sm:pb-3 px-2 sm:px-3 font-medium sm:font-semibold transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'modules'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Modules
            </button>
            <button
              onClick={() => setActiveTab('animations')}
              className={`pb-2 sm:pb-3 px-2 sm:px-3 font-medium sm:font-semibold transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'animations'
                ? 'border-b-2 border-teal-600 text-teal-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Animations
            </button>
            <button
              onClick={() => setActiveTab('meca_sheet')}
              className={`pb-2 sm:pb-3 px-2 sm:px-3 font-medium sm:font-semibold transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'meca_sheet'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Meca Sheet
            </button>
            <button
              onClick={() => setActiveTab('meca_aid')}
              className={`pb-2 sm:pb-3 px-2 sm:px-3 font-medium sm:font-semibold transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'meca_aid'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Meca Aid
            </button>
            <button
              onClick={() => setActiveTab('error_codes')}
              className={`pb-2 sm:pb-3 px-2 sm:px-3 font-medium sm:font-semibold transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'error_codes'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Error Codes
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`pb-2 sm:pb-3 px-2 sm:px-3 font-medium sm:font-semibold transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'quizzes'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Quiz
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`pb-2 sm:pb-3 px-2 sm:px-3 font-medium sm:font-semibold transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'activities'
                ? 'border-b-2 border-pink-600 text-pink-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Activities
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'users' && <UsersTab onStatsUpdate={calculateStats} />}
          {activeTab === 'modules' && <ModulesTab admin={admin} onStatsUpdate={calculateStats} />}
          {activeTab === 'animations' && <AnimationsTab admin={admin} onStatsUpdate={calculateStats} />}
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