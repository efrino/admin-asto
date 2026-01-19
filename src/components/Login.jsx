// ==================== src/components/Login.jsx ====================
import { useState } from 'react';
import { LogIn } from 'lucide-react';

export const Login = ({ onLogin }) => {
    const [nrp, setNrp] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        setIsLoading(true);
        const result = await onLogin(nrp, password);
        setIsLoading(false);

        if (result.success) {
            alert('Login berhasil!');
        } else {
            alert(result.error);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 md:p-8 w-full max-w-[340px] sm:max-w-sm md:max-w-md">
                <div className="flex items-center justify-center mb-4 sm:mb-6">
                    <LogIn className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-center mb-1.5 sm:mb-2 text-gray-800">
                    Admin Login
                </h1>
                <p className="text-center text-sm sm:text-base text-gray-600 mb-5 sm:mb-8">
                    Monitoring & Management Dashboard
                </p>

                <div className="space-y-3 sm:space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                            NRP
                        </label>
                        <input
                            type="text"
                            value={nrp}
                            onChange={(e) => setNrp(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                            placeholder="Masukkan NRP"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 text-sm sm:text-base mt-2"
                    >
                        {isLoading ? 'Loading...' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};