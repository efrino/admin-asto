import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../config/supabase';
import { hashPassword } from '../utils/auth';
import { parseExcelFile, generateExcelTemplate, downloadExcel } from '../utils/excelUtils';

export const UsersTab = ({ onStatsUpdate }) => {
    const [users, setUsers] = useState([]);
    const [editingUserId, setEditingUserId] = useState(null);
    const [userFormData, setUserFormData] = useState({
        nrp: '',
        full_name: '',
        department: '',
        position: '',
        password: '',
        role: 'user',
        is_active: true
    });
    const [showUserForm, setShowUserForm] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, status: '' });
    const [uploadResults, setUploadResults] = useState({ success: 0, failed: 0, errors: [] });
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleCreateUser = async () => {
        if (!userFormData.password) {
            alert('Password wajib diisi!');
            return;
        }

        try {
            const hashedPassword = await hashPassword(userFormData.password);

            const { data, error } = await supabase
                .from('users')
                .insert([{
                    ...userFormData,
                    nrp: userFormData.nrp.toUpperCase(),
                    password: hashedPassword,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            setUsers([data[0], ...users]);
            resetUserForm();
            alert('User berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menambahkan user: ' + error.message);
        }
    };

    const handleUpdateUser = async () => {
        try {
            const updateData = {
                ...userFormData,
                nrp: userFormData.nrp.toUpperCase(),
                updated_at: new Date().toISOString()
            };

            if (userFormData.password && userFormData.password.trim() !== '') {
                updateData.password = await hashPassword(userFormData.password);
            } else {
                delete updateData.password;
            }

            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', editingUserId)
                .select();

            if (error) throw error;
            setUsers(users.map(user => user.id === editingUserId ? data[0] : user));
            resetUserForm();
            alert('User berhasil diupdate!');
        } catch (error) {
            alert('Gagal mengupdate user: ' + error.message);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Yakin ingin menghapus user ini?')) return;

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setUsers(users.filter(user => user.id !== id));
            alert('User berhasil dihapus!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menghapus user: ' + error.message);
        }
    };

    const startEditUser = (user) => {
        setEditingUserId(user.id);
        setUserFormData({
            nrp: user.nrp,
            full_name: user.full_name,
            department: user.department || '',
            position: user.position || '',
            password: '',
            role: user.role,
            is_active: user.is_active
        });
        setShowUserForm(true);
    };

    const resetUserForm = () => {
        setUserFormData({
            nrp: '',
            full_name: '',
            department: '',
            position: '',
            password: '',
            role: 'user',
            is_active: true
        });
        setEditingUserId(null);
        setShowUserForm(false);
    };

    const handleDownloadTemplate = () => {
        const templateData = generateExcelTemplate();
        downloadExcel(templateData, 'user_upload_template.xlsx');
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];

        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
            alert('File harus berformat Excel (.xlsx, .xls) atau CSV (.csv)');
            return;
        }

        setIsUploading(true);
        setUploadResults({ success: 0, failed: 0, errors: [] });

        try {
            const parsedData = await parseExcelFile(file);

            if (parsedData.length === 0) {
                alert('File tidak memiliki data atau format tidak sesuai');
                setIsUploading(false);
                return;
            }

            setUploadProgress({ current: 0, total: parsedData.length, status: 'Processing...' });

            let successCount = 0;
            let failedCount = 0;
            const errors = [];

            for (let i = 0; i < parsedData.length; i++) {
                const row = parsedData[i];
                setUploadProgress({
                    current: i + 1,
                    total: parsedData.length,
                    status: `Processing ${row.nrp || 'row ' + (i + 1)}...`
                });

                try {
                    // Validate required fields
                    if (!row.nrp || !row.full_name || !row.password) {
                        throw new Error('NRP, Full Name, dan Password wajib diisi');
                    }

                    const hashedPassword = await hashPassword(row.password);

                    const { error } = await supabase
                        .from('users')
                        .insert([{
                            nrp: row.nrp.toString().toUpperCase(),
                            full_name: row.full_name,
                            department: row.department || null,
                            position: row.position || null,
                            password: hashedPassword,
                            role: row.role?.toLowerCase() === 'admin' ? 'admin' : 'user',
                            is_active: row.is_active !== false && row.is_active?.toString().toLowerCase() !== 'false',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }]);

                    if (error) throw error;
                    successCount++;
                } catch (error) {
                    failedCount++;
                    errors.push({
                        row: i + 2, // +2 because Excel rows start at 1 and header is row 1
                        nrp: row.nrp || 'N/A',
                        error: error.message
                    });
                }
            }

            setUploadResults({ success: successCount, failed: failedCount, errors });
            setUploadProgress({ current: parsedData.length, total: parsedData.length, status: 'Complete!' });

            // Refresh user list
            await fetchUsers();
            onStatsUpdate?.();

        } catch (error) {
            alert('Error processing file: ' + error.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const closeUploadModal = () => {
        setShowUploadModal(false);
        setUploadProgress({ current: 0, total: 0, status: '' });
        setUploadResults({ success: 0, failed: 0, errors: [] });
        setIsUploading(false);
    };

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Upload className="w-5 h-5" />
                        Upload Excel
                    </button>
                    <button
                        onClick={() => setShowUserForm(!showUserForm)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {showUserForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {showUserForm ? 'Cancel' : 'Add User'}
                    </button>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Upload Users via Excel</h3>
                            <button onClick={closeUploadModal} className="text-gray-500 hover:text-gray-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Download Template */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <FileSpreadsheet className="w-6 h-6 text-blue-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-blue-800 font-medium">Download Template</p>
                                        <p className="text-xs text-blue-600 mt-1">
                                            Download template Excel untuk format data yang benar
                                        </p>
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className="mt-2 flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download Template
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Upload Area */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                    id="excel-upload"
                                    disabled={isUploading}
                                />
                                <label
                                    htmlFor="excel-upload"
                                    className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-sm text-gray-600">
                                        {isUploading ? 'Processing...' : 'Click to upload or drag and drop'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Excel (.xlsx, .xls) or CSV files
                                    </p>
                                </label>
                            </div>

                            {/* Progress */}
                            {uploadProgress.total > 0 && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                                        <span>{uploadProgress.status}</span>
                                        <span>{uploadProgress.current} / {uploadProgress.total}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {/* Results */}
                            {(uploadResults.success > 0 || uploadResults.failed > 0) && (
                                <div className="space-y-3">
                                    <div className="flex gap-4">
                                        <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                            <p className="text-2xl font-bold text-green-600">{uploadResults.success}</p>
                                            <p className="text-xs text-green-700">Success</p>
                                        </div>
                                        <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                            <p className="text-2xl font-bold text-red-600">{uploadResults.failed}</p>
                                            <p className="text-xs text-red-700">Failed</p>
                                        </div>
                                    </div>

                                    {uploadResults.errors.length > 0 && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                                            <p className="text-sm font-medium text-red-800 mb-2">Errors:</p>
                                            {uploadResults.errors.map((err, idx) => (
                                                <p key={idx} className="text-xs text-red-600 mb-1">
                                                    Row {err.row} (NRP: {err.nrp}): {err.error}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={closeUploadModal}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showUserForm && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                        {editingUserId ? 'Edit User' : 'Add New User'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">NRP</label>
                            <input
                                type="text"
                                value={userFormData.nrp}
                                onChange={(e) => setUserFormData({ ...userFormData, nrp: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="NRP"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <input
                                type="text"
                                value={userFormData.full_name}
                                onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Full Name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                            <input
                                type="text"
                                value={userFormData.department}
                                onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Department"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                            <input
                                type="text"
                                value={userFormData.position}
                                onChange={(e) => setUserFormData({ ...userFormData, position: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Position"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password {editingUserId && <span className="text-gray-500 text-xs">(kosongkan jika tidak ingin mengubah)</span>}
                            </label>
                            <input
                                type="password"
                                value={userFormData.password}
                                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder={editingUserId ? "Password baru (opsional)" : "Password"}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                            <select
                                value={userFormData.role}
                                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                value={userFormData.is_active}
                                onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.value === 'true' })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={editingUserId ? handleUpdateUser : handleCreateUser}
                            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Save className="w-5 h-5" />
                            {editingUserId ? 'Update' : 'Save'}
                        </button>
                        <button
                            onClick={resetUserForm}
                            className="flex items-center gap-2 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <X className="w-5 h-5" />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">NRP</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Department</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    No users found.
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.nrp}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{user.full_name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{user.department || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => startEditUser(user)}
                                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
};