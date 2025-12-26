import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { supabase } from '../config/supabase';

export const ActivitiesTab = () => {
    const [activityLogs, setActivityLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('all');
    const [selectedActivityType, setSelectedActivityType] = useState('all');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchActivityLogs();
    }, []);

    useEffect(() => {
        fetchActivityLogs();
    }, [selectedUser, selectedActivityType]);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, nrp, full_name')
                .order('full_name');

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchActivityLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('activity_logs')
                .select('*, users(nrp, full_name)')
                .order('created_at', { ascending: false })
                .limit(100);

            if (selectedUser !== 'all') {
                query = query.eq('user_id', selectedUser);
            }

            if (selectedActivityType !== 'all') {
                query = query.eq('activity_type', selectedActivityType);
            }

            const { data, error } = await query;

            if (error) throw error;
            setActivityLogs(data || []);
        } catch (error) {
            console.error('Error fetching activity logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds === 0) return '-';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    const getActivityTypeBadgeColor = (type) => {
        const colors = {
            view: 'bg-blue-100 text-blue-800',
            click: 'bg-green-100 text-green-800',
            scroll: 'bg-purple-100 text-purple-800',
            quiz: 'bg-orange-100 text-orange-800',
            search: 'bg-pink-100 text-pink-800',
            video: 'bg-red-100 text-red-800',
            pdf: 'bg-indigo-100 text-indigo-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Activity Logs</h2>
                <div className="flex gap-3">
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="all">All Users ({users.length})</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.full_name} ({user.nrp})
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedActivityType}
                        onChange={(e) => setSelectedActivityType(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="all">All Activities</option>
                        <option value="view">View</option>
                        <option value="click">Click</option>
                        <option value="scroll">Scroll</option>
                        <option value="quiz">Quiz</option>
                        <option value="search">Search</option>
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                    </select>

                    <button
                        onClick={fetchActivityLogs}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 mt-4">Loading activities...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 border-b-2 border-gray-200">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Activity Type</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Resource</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Screen</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Duration</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {activityLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <Eye className="w-16 h-16 text-gray-300 mb-4" />
                                            <p className="text-lg font-medium">No activity logs found</p>
                                            <p className="text-sm mt-2">Try adjusting your filters or check back later</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                activityLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {log.users?.full_name || 'Unknown User'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {log.users?.nrp || '-'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getActivityTypeBadgeColor(log.activity_type)}`}>
                                                {log.activity_type || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm text-gray-900 font-medium">
                                                    {log.resource_title || '-'}
                                                </p>
                                                {log.resource_type && (
                                                    <p className="text-xs text-gray-500">
                                                        {log.resource_type}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {log.screen_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatDuration(log.duration_seconds)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => alert(`Detail log:\n${JSON.stringify(log, null, 2)}`)}
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activityLogs.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                    Showing {activityLogs.length} activities (limited to 100 most recent)
                </div>
            )}
        </>
    );
};