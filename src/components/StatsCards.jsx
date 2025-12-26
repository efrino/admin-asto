// ==================== src/components/StatsCards.jsx ====================
import { Users, Activity, TrendingUp, Clock } from 'lucide-react';

export const StatsCards = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 text-sm">Total Users</p>
                        <p className="text-4xl font-bold mt-2">{stats.totalUsers}</p>
                    </div>
                    <Users className="w-12 h-12 text-blue-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-green-100 text-sm">Active Users</p>
                        <p className="text-4xl font-bold mt-2">{stats.activeUsers}</p>
                    </div>
                    <Activity className="w-12 h-12 text-green-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-purple-100 text-sm">Total Activities</p>
                        <p className="text-4xl font-bold mt-2">{stats.totalActivities}</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-purple-200" />
                </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-orange-100 text-sm">Today's Activities</p>
                        <p className="text-4xl font-bold mt-2">{stats.todayActivities}</p>
                    </div>
                    <Clock className="w-12 h-12 text-orange-200" />
                </div>
            </div>
        </div>
    );
};