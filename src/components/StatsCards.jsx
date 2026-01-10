// ==================== src/components/StatsCards.jsx ====================
import { Users, Activity, TrendingUp, Clock, BookOpen, FileCheck } from 'lucide-react';

export const StatsCards = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-5 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 text-xs font-medium">Total Users</p>
                        <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
                    </div>
                    <Users className="w-10 h-10 text-blue-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-5 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-green-100 text-xs font-medium">Active Users</p>
                        <p className="text-3xl font-bold mt-1">{stats.activeUsers}</p>
                    </div>
                    <Activity className="w-10 h-10 text-green-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-xl p-5 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-indigo-100 text-xs font-medium">Total Modules</p>
                        <p className="text-3xl font-bold mt-1">{stats.totalModules || 0}</p>
                    </div>
                    <BookOpen className="w-10 h-10 text-indigo-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl shadow-xl p-5 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-cyan-100 text-xs font-medium">Active Modules</p>
                        <p className="text-3xl font-bold mt-1">{stats.activeModules || 0}</p>
                    </div>
                    <FileCheck className="w-10 h-10 text-cyan-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-5 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-purple-100 text-xs font-medium">Total Activities</p>
                        <p className="text-3xl font-bold mt-1">{stats.totalActivities}</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-purple-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-5 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-orange-100 text-xs font-medium">Today Activities</p>
                        <p className="text-3xl font-bold mt-1">{stats.todayActivities}</p>
                    </div>
                    <Clock className="w-10 h-10 text-orange-200" />
                </div>
            </div>
        </div>
    );
};