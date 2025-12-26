// ==================== src/components/Header.jsx ====================
import { LogOut } from 'lucide-react';

export const Header = ({ admin, onLogout }) => {
    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                    <p className="text-gray-600 mt-1">Welcome, {admin.full_name || admin.nrp}</p>
                </div>
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </div>
    );
};