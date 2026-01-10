// ==================== src/components/ModulesTab.jsx ====================
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, FileText, Video, Image, ExternalLink, GripVertical, FolderOpen, Search, RefreshCw, Check } from 'lucide-react';
import { supabase } from '../config/supabase';
import {
    listDriveFiles,
    getThumbnailUrl,
    extractFileId,
    determineFileType,
    formatFileSize,
    openDriveFolder,
    FOLDER_IDS
} from '../utils/googleDrive';

export const ModulesTab = ({ admin, onStatsUpdate }) => {
    const [modules, setModules] = useState([]);
    const [editingModuleId, setEditingModuleId] = useState(null);
    const [showModuleForm, setShowModuleForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');

    // File Picker State
    const [showFilePicker, setShowFilePicker] = useState(false);
    const [pickerType, setPickerType] = useState('content'); // 'content' or 'thumbnail'
    const [driveFiles, setDriveFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [fileSearchQuery, setFileSearchQuery] = useState('');
    const [pickerError, setPickerError] = useState(null);

    const [moduleFormData, setModuleFormData] = useState({
        title: '',
        description: '',
        category: 'module',
        gdrive_file_id: '',
        gdrive_url: '',
        file_type: 'pdf',
        thumbnail_url: '',
        thumbnail_gdrive_id: '',
        duration_minutes: '',
        order_index: 0,
        is_active: true
    });

    useEffect(() => {
        fetchModules();
    }, [selectedCategory]);

    const fetchModules = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('modules')
                .select('*, users(nrp, full_name)')
                .order('category')
                .order('order_index', { ascending: true });

            if (selectedCategory !== 'all') {
                query = query.eq('category', selectedCategory);
            }

            const { data, error } = await query;

            if (error) throw error;
            setModules(data || []);
        } catch (error) {
            console.error('Error fetching modules:', error);
        } finally {
            setLoading(false);
        }
    };

    // ==================== FILE PICKER FUNCTIONS ====================

    const openFilePicker = async (type) => {
        setPickerType(type);
        setShowFilePicker(true);
        setFileSearchQuery('');
        setPickerError(null);
        await loadDriveFiles(type);
    };

    const loadDriveFiles = async (type) => {
        setLoadingFiles(true);
        setPickerError(null);
        try {
            const files = await listDriveFiles(moduleFormData.category, type);
            setDriveFiles(files);
        } catch (error) {
            console.error('Error loading Drive files:', error);
            setPickerError(error.message || 'Gagal memuat file dari Google Drive. Pastikan Edge Function sudah di-deploy.');
            setDriveFiles([]);
        } finally {
            setLoadingFiles(false);
        }
    };

    const selectFile = (file) => {
        if (pickerType === 'content') {
            setModuleFormData({
                ...moduleFormData,
                gdrive_file_id: file.id,
                gdrive_url: `https://drive.google.com/file/d/${file.id}/view`,
                file_type: file.fileType || determineFileType(file.mimeType || file.name),
                title: moduleFormData.title || file.name.replace(/\.[^/.]+$/, '') // Auto-fill title dari nama file
            });
        } else {
            setModuleFormData({
                ...moduleFormData,
                thumbnail_gdrive_id: file.id,
                thumbnail_url: `https://drive.google.com/file/d/${file.id}/view`
            });
        }
        setShowFilePicker(false);
    };

    const filteredDriveFiles = driveFiles.filter(file =>
        file.name.toLowerCase().includes(fileSearchQuery.toLowerCase())
    );

    // ==================== FORM FUNCTIONS ====================

    const extractGdriveId = (url) => {
        return extractFileId(url);
    };

    const handleGdriveUrlChange = (e) => {
        const url = e.target.value;
        const fileId = extractGdriveId(url);
        setModuleFormData({
            ...moduleFormData,
            gdrive_url: url,
            gdrive_file_id: fileId
        });
    };

    const handleThumbnailUrlChange = (e) => {
        const url = e.target.value;
        const fileId = extractGdriveId(url);
        setModuleFormData({
            ...moduleFormData,
            thumbnail_url: url,
            thumbnail_gdrive_id: fileId
        });
    };

    const handleCreateModule = async () => {
        if (!moduleFormData.title || !moduleFormData.gdrive_file_id) {
            alert('Title dan Google Drive File ID wajib diisi!');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('modules')
                .insert([{
                    ...moduleFormData,
                    duration_minutes: moduleFormData.duration_minutes ? parseInt(moduleFormData.duration_minutes) : null,
                    order_index: moduleFormData.order_index ? parseInt(moduleFormData.order_index) : 0,
                    created_by: admin?.id || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select('*, users(nrp, full_name)');

            if (error) throw error;
            setModules([data[0], ...modules]);
            resetModuleForm();
            alert('Module berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menambahkan module: ' + error.message);
        }
    };

    const handleUpdateModule = async () => {
        try {
            const { data, error } = await supabase
                .from('modules')
                .update({
                    ...moduleFormData,
                    duration_minutes: moduleFormData.duration_minutes ? parseInt(moduleFormData.duration_minutes) : null,
                    order_index: moduleFormData.order_index ? parseInt(moduleFormData.order_index) : 0,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingModuleId)
                .select('*, users(nrp, full_name)');

            if (error) throw error;
            setModules(modules.map(m => m.id === editingModuleId ? data[0] : m));
            resetModuleForm();
            alert('Module berhasil diupdate!');
        } catch (error) {
            alert('Gagal mengupdate module: ' + error.message);
        }
    };

    const handleDeleteModule = async (id) => {
        if (!confirm('Yakin ingin menghapus module ini?')) return;

        try {
            const { error } = await supabase
                .from('modules')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setModules(modules.filter(m => m.id !== id));
            alert('Module berhasil dihapus!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menghapus module: ' + error.message);
        }
    };

    const handleToggleActive = async (module) => {
        try {
            const { error } = await supabase
                .from('modules')
                .update({ is_active: !module.is_active, updated_at: new Date().toISOString() })
                .eq('id', module.id);

            if (error) throw error;
            setModules(modules.map(m => m.id === module.id ? { ...m, is_active: !m.is_active } : m));
        } catch (error) {
            alert('Gagal mengubah status: ' + error.message);
        }
    };

    const startEditModule = (module) => {
        setEditingModuleId(module.id);
        setModuleFormData({
            title: module.title,
            description: module.description || '',
            category: module.category,
            gdrive_file_id: module.gdrive_file_id,
            gdrive_url: module.gdrive_url || '',
            file_type: module.file_type,
            thumbnail_url: module.thumbnail_url || '',
            thumbnail_gdrive_id: module.thumbnail_gdrive_id || '',
            duration_minutes: module.duration_minutes || '',
            order_index: module.order_index || 0,
            is_active: module.is_active
        });
        setShowModuleForm(true);
    };

    const resetModuleForm = () => {
        setModuleFormData({
            title: '',
            description: '',
            category: 'module',
            gdrive_file_id: '',
            gdrive_url: '',
            file_type: 'pdf',
            thumbnail_url: '',
            thumbnail_gdrive_id: '',
            duration_minutes: '',
            order_index: 0,
            is_active: true
        });
        setEditingModuleId(null);
        setShowModuleForm(false);
    };

    // ==================== HELPER FUNCTIONS ====================

    const getFileTypeIcon = (type) => {
        switch (type) {
            case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
            case 'mp4': return <Video className="w-5 h-5 text-blue-500" />;
            case 'image': return <Image className="w-5 h-5 text-green-500" />;
            default: return <FileText className="w-5 h-5 text-gray-500" />;
        }
    };

    const getCategoryBadgeColor = (category) => {
        switch (category) {
            case 'module': return 'bg-blue-100 text-blue-800';
            case 'animation': return 'bg-purple-100 text-purple-800';
            case 'meca_aid': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getCategoryLabel = (category) => {
        switch (category) {
            case 'module': return 'Module';
            case 'animation': return 'Animation';
            case 'meca_aid': return 'Meca Aid';
            default: return category;
        }
    };

    // ==================== FILE PICKER MODAL ====================

    const FilePickerModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                            Pilih {pickerType === 'content' ? 'File' : 'Thumbnail'} dari Google Drive
                        </h3>
                        <p className="text-sm text-gray-500">
                            Kategori: {getCategoryLabel(moduleFormData.category)} •
                            Folder: {pickerType === 'content' ? 'Content' : 'Thumbnail'}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowFilePicker(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search & Actions */}
                <div className="p-4 border-b flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={fileSearchQuery}
                            onChange={(e) => setFileSearchQuery(e.target.value)}
                            placeholder="Cari file..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => loadDriveFiles(pickerType)}
                        disabled={loadingFiles}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => openDriveFolder(moduleFormData.category, pickerType)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Buka Folder
                    </button>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loadingFiles ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-gray-500">Memuat file dari Google Drive...</p>
                        </div>
                    ) : pickerError ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="bg-red-100 text-red-600 p-4 rounded-lg max-w-md">
                                <p className="font-medium mb-2">Error</p>
                                <p className="text-sm">{pickerError}</p>
                                <p className="text-xs mt-3 text-red-500">
                                    Pastikan Supabase Edge Function sudah di-deploy dan service account sudah dikonfigurasi.
                                </p>
                            </div>
                            <button
                                onClick={() => openDriveFolder(moduleFormData.category, pickerType)}
                                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Buka Folder di Google Drive
                            </button>
                        </div>
                    ) : filteredDriveFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <FolderOpen className="w-16 h-16 text-gray-300 mb-4" />
                            <p>Tidak ada file ditemukan</p>
                            <button
                                onClick={() => openDriveFolder(moduleFormData.category, pickerType)}
                                className="mt-4 text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Upload file ke Google Drive
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredDriveFiles.map((file) => (
                                <button
                                    key={file.id}
                                    onClick={() => selectFile(file)}
                                    className="group relative bg-gray-50 rounded-xl p-3 hover:bg-blue-50 hover:ring-2 hover:ring-blue-500 transition-all text-left"
                                >
                                    {/* Thumbnail */}
                                    <div className="aspect-video bg-gray-200 rounded-lg mb-2 overflow-hidden relative">
                                        <img
                                            src={file.thumbnailUrl || getThumbnailUrl(file.id)}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                        <div className="absolute inset-0 hidden items-center justify-center bg-gray-100">
                                            {getFileTypeIcon(file.fileType || determineFileType(file.mimeType || file.name))}
                                        </div>

                                        {/* Selected indicator */}
                                        {((pickerType === 'content' && moduleFormData.gdrive_file_id === file.id) ||
                                            (pickerType === 'thumbnail' && moduleFormData.thumbnail_gdrive_id === file.id)) && (
                                                <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            )}
                                    </div>

                                    {/* File Info */}
                                    <div>
                                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">
                                            {file.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500 uppercase">
                                                {file.fileType || determineFileType(file.mimeType || file.name)}
                                            </span>
                                            {file.size && (
                                                <span className="text-xs text-gray-400">
                                                    • {formatFileSize(parseInt(file.size))}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
                    <p className="text-xs text-gray-500 text-center">
                        Klik file untuk memilih • {filteredDriveFiles.length} file tersedia
                    </p>
                </div>
            </div>
        </div>
    );

    // ==================== RENDER ====================

    return (
        <>
            {/* File Picker Modal */}
            {showFilePicker && <FilePickerModal />}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Modules Management</h2>
                <div className="flex gap-3">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="all">All Categories</option>
                        <option value="module">Module</option>
                        <option value="animation">Animation</option>
                        <option value="meca_aid">Meca Aid</option>
                    </select>
                    <button
                        onClick={() => setShowModuleForm(!showModuleForm)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {showModuleForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {showModuleForm ? 'Cancel' : 'Add Module'}
                    </button>
                </div>
            </div>

            {showModuleForm && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                        {editingModuleId ? 'Edit Module' : 'Add New Module'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                            <input
                                type="text"
                                value={moduleFormData.title}
                                onChange={(e) => setModuleFormData({ ...moduleFormData, title: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Module Title"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                value={moduleFormData.description}
                                onChange={(e) => setModuleFormData({ ...moduleFormData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Module Description"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                            <select
                                value={moduleFormData.category}
                                onChange={(e) => setModuleFormData({ ...moduleFormData, category: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="module">Module</option>
                                <option value="animation">Animation</option>
                                <option value="meca_aid">Meca Aid</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">File Type *</label>
                            <select
                                value={moduleFormData.file_type}
                                onChange={(e) => setModuleFormData({ ...moduleFormData, file_type: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="pdf">PDF</option>
                                <option value="mp4">Video (MP4)</option>
                                <option value="image">Image</option>
                            </select>
                        </div>

                        {/* Google Drive File Picker */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Google Drive File *
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={moduleFormData.gdrive_url}
                                    onChange={handleGdriveUrlChange}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="https://drive.google.com/file/d/xxxxx/view atau File ID"
                                />
                                <button
                                    type="button"
                                    onClick={() => openFilePicker('content')}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                                >
                                    <FolderOpen className="w-5 h-5" />
                                    Browse Drive
                                </button>
                            </div>
                            {moduleFormData.gdrive_file_id && (
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-green-600">✓ File ID: {moduleFormData.gdrive_file_id}</span>
                                    <a
                                        href={`https://drive.google.com/file/d/${moduleFormData.gdrive_file_id}/view`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        <ExternalLink className="w-3 h-3" /> Preview
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Picker */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Thumbnail (Google Drive)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={moduleFormData.thumbnail_url}
                                    onChange={handleThumbnailUrlChange}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="https://drive.google.com/file/d/xxxxx/view atau File ID"
                                />
                                <button
                                    type="button"
                                    onClick={() => openFilePicker('thumbnail')}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                                >
                                    <Image className="w-5 h-5" />
                                    Browse Thumbnails
                                </button>
                            </div>
                            {moduleFormData.thumbnail_gdrive_id && (
                                <div className="flex items-center gap-3 mt-2">
                                    <img
                                        src={getThumbnailUrl(moduleFormData.thumbnail_gdrive_id, 100)}
                                        alt="Thumbnail preview"
                                        className="w-16 h-16 object-cover rounded-lg border"
                                    />
                                    <span className="text-xs text-green-600">✓ Thumbnail ID: {moduleFormData.thumbnail_gdrive_id}</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                            <input
                                type="number"
                                value={moduleFormData.duration_minutes}
                                onChange={(e) => setModuleFormData({ ...moduleFormData, duration_minutes: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Duration in minutes"
                                min="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Order Index</label>
                            <input
                                type="number"
                                value={moduleFormData.order_index}
                                onChange={(e) => setModuleFormData({ ...moduleFormData, order_index: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Display order"
                                min="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                value={moduleFormData.is_active}
                                onChange={(e) => setModuleFormData({ ...moduleFormData, is_active: e.target.value === 'true' })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={editingModuleId ? handleUpdateModule : handleCreateModule}
                            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Save className="w-5 h-5" />
                            {editingModuleId ? 'Update' : 'Save'}
                        </button>
                        <button
                            onClick={resetModuleForm}
                            className="flex items-center gap-2 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <X className="w-5 h-5" />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 mt-4">Loading modules...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 border-b-2 border-gray-200">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-12">
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Duration</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created By</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {modules.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <FileText className="w-16 h-16 text-gray-300 mb-4" />
                                            <p className="text-lg font-medium">No modules found</p>
                                            <p className="text-sm mt-2">Click "Add Module" to create your first module</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                modules.map((module, index) => (
                                    <tr key={module.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 text-sm text-gray-500">
                                            {module.order_index || index + 1}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                {module.thumbnail_gdrive_id ? (
                                                    <img
                                                        src={getThumbnailUrl(module.thumbnail_gdrive_id, 100)}
                                                        alt={module.title}
                                                        className="w-12 h-12 object-cover rounded-lg bg-gray-100"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                                        {getFileTypeIcon(module.file_type)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{module.title}</p>
                                                    {module.description && (
                                                        <p className="text-xs text-gray-500 truncate max-w-xs">{module.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getCategoryBadgeColor(module.category)}`}>
                                                {getCategoryLabel(module.category)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                {getFileTypeIcon(module.file_type)}
                                                <span className="text-sm text-gray-600 uppercase">{module.file_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {module.duration_minutes ? `${module.duration_minutes} min` : '-'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => handleToggleActive(module)}
                                                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-colors ${module.is_active
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                    }`}
                                            >
                                                {module.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {module.users?.full_name || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {module.gdrive_file_id && (
                                                    <a
                                                        href={`https://drive.google.com/file/d/${module.gdrive_file_id}/view`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800"
                                                        title="Open in Google Drive"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => startEditModule(module)}
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteModule(module.id)}
                                                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {modules.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                    Showing {modules.length} modules
                </div>
            )}
        </>
    );
};