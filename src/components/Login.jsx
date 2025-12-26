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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="flex items-center justify-center mb-6">
                    <LogIn className="w-12 h-12 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Admin Login</h1>
                <p className="text-center text-gray-600 mb-8">Monitoring & Management Dashboard</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">NRP</label>
                        <input
                            type="text"
                            value={nrp}
                            onChange={(e) => setNrp(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Masukkan NRP"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    >
                        {isLoading ? 'Loading...' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};