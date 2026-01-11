// ==================== src/components/StatsCards.jsx ====================
import { Users, Activity, TrendingUp, Clock, BookOpen, FileCheck, ClipboardCheck, Award } from 'lucide-react';

export const StatsCards = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 text-xs font-medium">Total Users</p>
                        <p className="text-2xl font-bold mt-1">{stats.totalUsers}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-green-100 text-xs font-medium">Active Users</p>
                        <p className="text-2xl font-bold mt-1">{stats.activeUsers}</p>
                    </div>
                    <Activity className="w-8 h-8 text-green-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-indigo-100 text-xs font-medium">Modules</p>
                        <p className="text-2xl font-bold mt-1">{stats.totalModules || 0}</p>
                    </div>
                    <BookOpen className="w-8 h-8 text-indigo-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-cyan-100 text-xs font-medium">Active Modules</p>
                        <p className="text-2xl font-bold mt-1">{stats.activeModules || 0}</p>
                    </div>
                    <FileCheck className="w-8 h-8 text-cyan-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-amber-100 text-xs font-medium">Quizzes</p>
                        <p className="text-2xl font-bold mt-1">{stats.totalQuizzes || 0}</p>
                    </div>
                    <ClipboardCheck className="w-8 h-8 text-amber-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-lg p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-rose-100 text-xs font-medium">Active Quiz</p>
                        <p className="text-2xl font-bold mt-1">{stats.activeQuizzes || 0}</p>
                    </div>
                    <Award className="w-8 h-8 text-rose-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-purple-100 text-xs font-medium">Activities</p>
                        <p className="text-2xl font-bold mt-1">{stats.totalActivities}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-orange-100 text-xs font-medium">Today</p>
                        <p className="text-2xl font-bold mt-1">{stats.todayActivities}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-200" />
                </div>
            </div>
        </div>
    );
};