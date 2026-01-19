// ==================== src/components/Header.jsx ====================
import { LogOut, Menu } from 'lucide-react';

export const Header = ({ admin, onLogout }) => {
    return (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <div className="w-full sm:w-auto">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
                        Admin Dashboard
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-0.5 sm:mt-1 truncate max-w-[250px] sm:max-w-none">
                        Welcome, {admin.full_name || admin.nrp}
                    </p>
                </div>
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base self-end sm:self-auto"
                >
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden xs:inline sm:inline">Logout</span>
                </button>
            </div>
        </div>
    );
};