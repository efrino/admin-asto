import { useState, useEffect } from 'react';
import {
    Plus, Trash2, ExternalLink,
    Search, RefreshCw, Check, Play, Film,
    CheckCircle, AlertCircle, File, Upload,
    Database, Cloud, CloudOff, MoreVertical, Edit2
} from 'lucide-react';
import { supabase } from '../config/supabase';
import {
    listDriveFiles,
    determineFileType,
    formatFileSize,
    openDriveFolder,
    getThumbnailUrl
} from '../utils/googleDrive';

export const AnimationsTab = ({ admin, onStatsUpdate }) => {
    // Drive files states
    const [driveFiles, setDriveFiles] = useState([]);
    const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
    const [driveError, setDriveError] = useState('');

    // Database files states
    const [dbFiles, setDbFiles] = useState([]);
    const [loadingDbFiles, setLoadingDbFiles] = useState(false);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, mp4, swf

    // Import Modal State
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedFilesToImport, setSelectedFilesToImport] = useState([]);
    const [importing, setImporting] = useState(false);

    // Manual Add Modal
    const [showManualAddModal, setShowManualAddModal] = useState(false);
    const [manualFileData, setManualFileData] = useState({
        gdrive_file_id: '',
        title: '',
        description: '',
        file_type: 'mp4',
        thumbnail_gdrive_id: '',
        duration_minutes: '',
        order_index: 0,
        is_active: true
    });
    const [savingManualFile, setSavingManualFile] = useState(false);

    // Edit Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingFile, setEditingFile] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [savingEdit, setSavingEdit] = useState(false);

    // Action menu
    const [actionMenuOpen, setActionMenuOpen] = useState(null);

    useEffect(() => {
        fetchDriveFiles();
        fetchDbFiles();
    }, []);

    // Close action menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActionMenuOpen(null);
        if (actionMenuOpen) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [actionMenuOpen]);

    const fetchDriveFiles = async () => {
        setLoadingDriveFiles(true);
        setDriveError('');
        try {
            const result = await listDriveFiles('animation', 'content');
            if (result.success) {
                // Filter only MP4 and SWF files
                const animationFiles = (result.data || []).filter(file => {
                    const type = determineFileType(file.mimeType || file.name);
                    return ['mp4', 'swf'].includes(type);
                });
                setDriveFiles(animationFiles);
            } else {
                setDriveError(result.error || 'Gagal memuat file dari Drive');
                setDriveFiles([]);
            }
        } catch (error) {
            console.error('Error fetching files from Drive:', error);
            setDriveError(error.message);
            setDriveFiles([]);
        } finally {
            setLoadingDriveFiles(false);
        }
    };

    const fetchDbFiles = async () => {
        setLoadingDbFiles(true);
        try {
            const { data, error } = await supabase
                .from('modules')
                .select('*, users(nrp, full_name)')
                .eq('category', 'animation')
                .order('order_index', { ascending: true });

            if (error) throw error;
            setDbFiles(data || []);
        } catch (error) {
            console.error('Error fetching db files:', error);
        } finally {
            setLoadingDbFiles(false);
        }
    };

    const isFileImported = (driveFileId) => {
        return dbFiles.some(f => f.gdrive_file_id === driveFileId);
    };

    const getImportedFile = (driveFileId) => {
        return dbFiles.find(f => f.gdrive_file_id === driveFileId);
    };

    // ==================== IMPORT FUNCTIONS ====================

    const openImportModal = () => {
        const notImportedFiles = driveFiles.filter(f => !isFileImported(f.id));
        if (notImportedFiles.length === 0) {
            alert('Semua file sudah diimport ke database');
            return;
        }
        setSelectedFilesToImport([]);
        setShowImportModal(true);
    };

    const toggleFileSelection = (file) => {
        setSelectedFilesToImport(prev => {
            const exists = prev.find(f => f.id === file.id);
            if (exists) {
                return prev.filter(f => f.id !== file.id);
            } else {
                return [...prev, file];
            }
        });
    };

    const selectAllForImport = () => {
        const notImportedFiles = driveFiles.filter(f => !isFileImported(f.id));
        setSelectedFilesToImport(notImportedFiles);
    };

    const handleImportFiles = async () => {
        if (selectedFilesToImport.length === 0) {
            alert('Pilih file yang akan diimport');
            return;
        }

        setImporting(true);

        try {
            const insertData = selectedFilesToImport.map((file, index) => ({
                title: file.name.replace(/\.[^/.]+$/, ''),
                description: null,
                category: 'animation',
                gdrive_file_id: file.id,
                gdrive_url: `https://drive.google.com/file/d/${file.id}/view`,
                file_type: determineFileType(file.mimeType || file.name),
                thumbnail_url: getThumbnailUrl(file.id),
                thumbnail_gdrive_id: null,
                duration_minutes: null,
                order_index: dbFiles.length + index + 1,
                is_active: true,
                created_by: admin?.id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            const { data, error } = await supabase
                .from('modules')
                .insert(insertData)
                .select();

            if (error) throw error;

            setDbFiles([...dbFiles, ...data]);
            setShowImportModal(false);
            setSelectedFilesToImport([]);
            alert(`${data.length} animasi berhasil diimport!`);
            onStatsUpdate?.();
        } catch (error) {
            console.error('Error importing files:', error);
            alert('Gagal mengimport: ' + error.message);
        } finally {
            setImporting(false);
        }
    };

    // ==================== MANUAL ADD ====================

    const openManualAddModal = () => {
        setManualFileData({
            gdrive_file_id: '',
            title: '',
            description: '',
            file_type: 'mp4',
            thumbnail_gdrive_id: '',
            duration_minutes: '',
            order_index: dbFiles.length + 1,
            is_active: true
        });
        setShowManualAddModal(true);
    };

    const handleSaveManualFile = async () => {
        if (!manualFileData.gdrive_file_id.trim() || !manualFileData.title.trim()) {
            alert('Google Drive File ID dan Judul wajib diisi');
            return;
        }

        setSavingManualFile(true);

        try {
            const insertData = {
                title: manualFileData.title.trim(),
                description: manualFileData.description.trim() || null,
                category: 'animation',
                gdrive_file_id: manualFileData.gdrive_file_id.trim(),
                gdrive_url: `https://drive.google.com/file/d/${manualFileData.gdrive_file_id.trim()}/view`,
                file_type: manualFileData.file_type,
                thumbnail_url: manualFileData.thumbnail_gdrive_id
                    ? getThumbnailUrl(manualFileData.thumbnail_gdrive_id)
                    : getThumbnailUrl(manualFileData.gdrive_file_id.trim()),
                thumbnail_gdrive_id: manualFileData.thumbnail_gdrive_id.trim() || null,
                duration_minutes: manualFileData.duration_minutes ? parseInt(manualFileData.duration_minutes) : null,
                order_index: manualFileData.order_index || dbFiles.length + 1,
                is_active: manualFileData.is_active,
                created_by: admin?.id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('modules')
                .insert([insertData])
                .select();

            if (error) throw error;

            setDbFiles([...dbFiles, data[0]]);
            setShowManualAddModal(false);
            alert('Animasi berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Gagal menyimpan: ' + error.message);
        } finally {
            setSavingManualFile(false);
        }
    };

    // ==================== EDIT ====================

    const openEditModal = (file) => {
        setEditingFile(file);
        setEditFormData({
            title: file.title || '',
            description: file.description || '',
            file_type: file.file_type || 'mp4',
            thumbnail_gdrive_id: file.thumbnail_gdrive_id || '',
            duration_minutes: file.duration_minutes || '',
            order_index: file.order_index || 0,
            is_active: file.is_active
        });
        setShowEditModal(true);
        setActionMenuOpen(null);
    };

    const handleSaveEdit = async () => {
        if (!editFormData.title.trim()) {
            alert('Judul wajib diisi');
            return;
        }

        setSavingEdit(true);

        try {
            const updateData = {
                title: editFormData.title.trim(),
                description: editFormData.description.trim() || null,
                file_type: editFormData.file_type,
                thumbnail_url: editFormData.thumbnail_gdrive_id
                    ? getThumbnailUrl(editFormData.thumbnail_gdrive_id)
                    : editingFile.thumbnail_url,
                thumbnail_gdrive_id: editFormData.thumbnail_gdrive_id.trim() || null,
                duration_minutes: editFormData.duration_minutes ? parseInt(editFormData.duration_minutes) : null,
                order_index: editFormData.order_index || 0,
                is_active: editFormData.is_active,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('modules')
                .update(updateData)
                .eq('id', editingFile.id);

            if (error) throw error;

            setDbFiles(dbFiles.map(f =>
                f.id === editingFile.id ? { ...f, ...updateData } : f
            ));
            setShowEditModal(false);
            alert('Animasi berhasil diupdate!');
        } catch (error) {
            console.error('Error updating file:', error);
            alert('Gagal mengupdate: ' + error.message);
        } finally {
            setSavingEdit(false);
        }
    };

    // ==================== DELETE & TOGGLE ====================

    const handleDeleteDbFile = async (id) => {
        if (!confirm('Hapus animasi ini dari database?')) return;

        try {
            const { error } = await supabase
                .from('modules')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setDbFiles(dbFiles.filter(f => f.id !== id));
            setActionMenuOpen(null);
            alert('Animasi berhasil dihapus!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menghapus: ' + error.message);
        }
    };

    const handleToggleFileActive = async (file) => {
        try {
            const { error } = await supabase
                .from('modules')
                .update({ is_active: !file.is_active, updated_at: new Date().toISOString() })
                .eq('id', file.id);

            if (error) throw error;
            setDbFiles(dbFiles.map(f => f.id === file.id ? { ...f, is_active: !f.is_active } : f));
        } catch (error) {
            alert('Gagal mengubah status: ' + error.message);
        }
    };

    // ==================== HELPER FUNCTIONS ====================

    const getFileTypeIcon = (type) => {
        switch (type) {
            case 'mp4': return <Play className="w-4 h-4 text-blue-500" />;
            case 'swf': return <Film className="w-4 h-4 text-orange-500" />;
            default: return <File className="w-4 h-4 text-gray-500" />;
        }
    };

    const getFileTypeBadge = (type) => {
        switch (type) {
            case 'mp4': return 'bg-blue-100 text-blue-700';
            case 'swf': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Filter files
    const filteredDriveFiles = driveFiles.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
        const fileType = determineFileType(file.mimeType || file.name);
        const matchesType = filterType === 'all' || fileType === filterType;
        return matchesSearch && matchesType;
    });

    const importedCount = driveFiles.filter(f => isFileImported(f.id)).length;
    const notImportedCount = driveFiles.length - importedCount;

    return (
        <>
            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Import Animasi dari Drive</h3>
                            <p className="text-sm text-gray-500 mt-0.5">{notImportedCount} file tersedia untuk diimport</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm text-gray-600">
                                    {selectedFilesToImport.length} file dipilih
                                </span>
                                <button
                                    onClick={selectAllForImport}
                                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                                >
                                    Pilih Semua
                                </button>
                            </div>

                            <div className="space-y-2">
                                {driveFiles.filter(f => !isFileImported(f.id)).map(file => {
                                    const isSelected = selectedFilesToImport.find(f => f.id === file.id);
                                    const fileType = determineFileType(file.mimeType || file.name);

                                    return (
                                        <div
                                            key={file.id}
                                            onClick={() => toggleFileSelection(file)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                                ? 'border-purple-300 bg-purple-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-purple-100' : 'bg-gray-100'}`}>
                                                    {getFileTypeIcon(fileType)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {fileType.toUpperCase()} {file.size && `• ${formatFileSize(parseInt(file.size))}`}
                                                    </p>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                                                    ? 'border-purple-600 bg-purple-600'
                                                    : 'border-gray-300'
                                                    }`}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-between">
                            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                                Batal
                            </button>
                            <button
                                onClick={handleImportFiles}
                                disabled={importing || selectedFilesToImport.length === 0}
                                className="px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {importing && <RefreshCw className="w-4 h-4 animate-spin" />}
                                Import {selectedFilesToImport.length > 0 ? `(${selectedFilesToImport.length})` : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Add Modal */}
            {showManualAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Tambah Animasi Manual</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Input Google Drive File ID secara manual</p>
                        </div>

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Google Drive File ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={manualFileData.gdrive_file_id}
                                    onChange={(e) => setManualFileData({ ...manualFileData, gdrive_file_id: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="1BxiMVs0XRA5nFMd..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Judul <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={manualFileData.title}
                                    onChange={(e) => setManualFileData({ ...manualFileData, title: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Nama animasi"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
                                <textarea
                                    value={manualFileData.description}
                                    onChange={(e) => setManualFileData({ ...manualFileData, description: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                                    rows={2}
                                    placeholder="Deskripsi opsional"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe File</label>
                                    <select
                                        value={manualFileData.file_type}
                                        onChange={(e) => setManualFileData({ ...manualFileData, file_type: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    >
                                        <option value="mp4">MP4 (Video)</option>
                                        <option value="swf">SWF (Flash)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Durasi (menit)</label>
                                    <input
                                        type="number"
                                        value={manualFileData.duration_minutes}
                                        onChange={(e) => setManualFileData({ ...manualFileData, duration_minutes: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Thumbnail GDrive ID</label>
                                <input
                                    type="text"
                                    value={manualFileData.thumbnail_gdrive_id}
                                    onChange={(e) => setManualFileData({ ...manualFileData, thumbnail_gdrive_id: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="ID thumbnail (opsional)"
                                />
                                <p className="text-xs text-gray-500 mt-1">Kosongkan untuk menggunakan thumbnail default</p>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={manualFileData.is_active}
                                    onChange={(e) => setManualFileData({ ...manualFileData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Aktifkan animasi</span>
                            </label>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button onClick={() => setShowManualAddModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                                Batal
                            </button>
                            <button
                                onClick={handleSaveManualFile}
                                disabled={savingManualFile || !manualFileData.gdrive_file_id || !manualFileData.title}
                                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {savingManualFile && <RefreshCw className="w-4 h-4 animate-spin" />}
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingFile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Edit Animasi</h3>
                            <p className="text-sm text-gray-500 mt-0.5 truncate">{editingFile.title}</p>
                        </div>

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Judul <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.title}
                                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
                                <textarea
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe File</label>
                                    <select
                                        value={editFormData.file_type}
                                        onChange={(e) => setEditFormData({ ...editFormData, file_type: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    >
                                        <option value="mp4">MP4 (Video)</option>
                                        <option value="swf">SWF (Flash)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Durasi (menit)</label>
                                    <input
                                        type="number"
                                        value={editFormData.duration_minutes}
                                        onChange={(e) => setEditFormData({ ...editFormData, duration_minutes: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Thumbnail GDrive ID</label>
                                <input
                                    type="text"
                                    value={editFormData.thumbnail_gdrive_id}
                                    onChange={(e) => setEditFormData({ ...editFormData, thumbnail_gdrive_id: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Urutan</label>
                                <input
                                    type="number"
                                    value={editFormData.order_index}
                                    onChange={(e) => setEditFormData({ ...editFormData, order_index: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    min="0"
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editFormData.is_active}
                                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Aktifkan animasi</span>
                            </label>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                                Batal
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit || !editFormData.title}
                                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {savingEdit && <RefreshCw className="w-4 h-4 animate-spin" />}
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Animasi</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Kelola file animasi MP4 & SWF</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => openDriveFolder('animation', 'content')}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Buka Drive
                        </button>
                        <button
                            onClick={openImportModal}
                            disabled={notImportedCount === 0}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Import dari GDrive
                        </button>
                        <button
                            onClick={openManualAddModal}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Manual
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Cloud className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-gray-900">{driveFiles.length}</p>
                                <p className="text-xs text-gray-500">Di Google Drive</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
                                <Database className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-purple-900">{dbFiles.length}</p>
                                <p className="text-xs text-purple-600">Di Database</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                                <Play className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-blue-900">
                                    {dbFiles.filter(f => f.file_type === 'mp4').length}
                                </p>
                                <p className="text-xs text-blue-600">Video MP4</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-200 rounded-lg flex items-center justify-center">
                                <Film className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold text-orange-900">
                                    {dbFiles.filter(f => f.file_type === 'swf').length}
                                </p>
                                <p className="text-xs text-orange-600">Flash SWF</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari animasi..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                        <option value="all">Semua Tipe</option>
                        <option value="mp4">MP4 Only</option>
                        <option value="swf">SWF Only</option>
                    </select>
                    <button
                        onClick={() => { fetchDriveFiles(); fetchDbFiles(); }}
                        disabled={loadingDriveFiles || loadingDbFiles}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-5 h-5 ${(loadingDriveFiles || loadingDbFiles) ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Error Message */}
                {driveError && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700">{driveError}</p>
                    </div>
                )}

                {/* Files Grid/Table */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Daftar Animasi</h3>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                {importedCount} imported
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                <Cloud className="w-3 h-3" />
                                {notImportedCount} pending
                            </span>
                        </div>
                    </div>

                    {/* Files List */}
                    <div className="divide-y divide-gray-100">
                        {(loadingDriveFiles || loadingDbFiles) ? (
                            <div className="p-12 text-center">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                                <p className="text-sm text-gray-500 mt-2">Memuat data...</p>
                            </div>
                        ) : filteredDriveFiles.length === 0 ? (
                            <div className="p-12 text-center">
                                <CloudOff className="w-10 h-10 mx-auto text-gray-300" />
                                <p className="text-sm font-medium text-gray-600 mt-3">Tidak ada animasi</p>
                                <p className="text-xs text-gray-500 mt-1">Upload file MP4/SWF ke Google Drive</p>
                            </div>
                        ) : (
                            filteredDriveFiles.map(file => {
                                const isImported = isFileImported(file.id);
                                const importedData = getImportedFile(file.id);
                                const fileType = determineFileType(file.mimeType || file.name);

                                return (
                                    <div key={file.id} className={`px-4 py-3 flex items-center gap-4 group ${isImported ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}>
                                        {/* Thumbnail */}
                                        <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                            {file.thumbnailUrl ? (
                                                <img
                                                    src={file.thumbnailUrl}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`absolute inset-0 flex items-center justify-center ${file.thumbnailUrl ? 'hidden' : ''}`}>
                                                {getFileTypeIcon(fileType)}
                                            </div>
                                            <div className="absolute bottom-0.5 right-0.5">
                                                <span className={`text-[10px] px-1 py-0.5 rounded ${getFileTypeBadge(fileType)}`}>
                                                    {fileType.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {isImported ? importedData?.title : file.name.replace(/\.[^/.]+$/, '')}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {isImported && importedData?.duration_minutes && (
                                                    <span className="text-xs text-gray-500">{importedData.duration_minutes} menit</span>
                                                )}
                                                {file.size && (
                                                    <span className="text-xs text-gray-400">{formatFileSize(parseInt(file.size))}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status & Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {isImported ? (
                                                <>
                                                    <button
                                                        onClick={() => handleToggleFileActive(importedData)}
                                                        className={`text-xs px-2 py-1 rounded-full transition-colors ${importedData?.is_active
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {importedData?.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </button>

                                                    {/* Action Menu */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActionMenuOpen(actionMenuOpen === file.id ? null : file.id);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>

                                                        {actionMenuOpen === file.id && (
                                                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 w-32">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openEditModal(importedData);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteDbFile(importedData?.id);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                    Hapus
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-xs text-gray-400 px-2 py-1">Belum diimport</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Summary */}
                    {filteredDriveFiles.length > 0 && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>Menampilkan {filteredDriveFiles.length} dari {driveFiles.length} animasi</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};