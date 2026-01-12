// ==================== src/components/ModulesTab.jsx ====================
import { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Save, X, FileText, Video, Image, ExternalLink,
    GripVertical, FolderOpen, Search, RefreshCw, Check, Eye,
    CheckCircle, AlertCircle, File, Upload
} from 'lucide-react';
import { supabase } from '../config/supabase';
import {
    listDriveFiles,
    getThumbnailUrl,
    determineFileType,
    formatFileSize,
    openDriveFolder,
    extractFileId
} from '../utils/googleDrive';

export const ModulesTab = ({ admin, onStatsUpdate }) => {
    // State
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form State (untuk Add Manual dan Edit)
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        gdrive_file_id: '',
        gdrive_url: '',
        file_type: 'pdf',
        thumbnail_gdrive_id: '',
        duration_minutes: '',
        order_index: 0,
        is_active: true
    });

    // Import Modal State (2-step)
    const [showImportModal, setShowImportModal] = useState(false);
    const [importStep, setImportStep] = useState(1);
    const [driveFiles, setDriveFiles] = useState([]);
    const [thumbnailFiles, setThumbnailFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [driveSearchQuery, setDriveSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedThumbnail, setSelectedThumbnail] = useState(null);
    const [importError, setImportError] = useState('');
    const [saving, setSaving] = useState(false);

    // Import form data
    const [importFormData, setImportFormData] = useState({
        title: '',
        description: '',
        file_type: 'pdf',
        duration_minutes: '',
        order_index: 0,
        is_active: true
    });

    useEffect(() => {
        fetchModules();
    }, []);

    // ==================== DATA FUNCTIONS ====================

    const fetchModules = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('modules')
                .select('*, users(nrp, full_name)')
                .eq('category', 'module')
                .order('order_index', { ascending: true });

            if (error) throw error;
            setModules(data || []);
        } catch (error) {
            console.error('Error fetching modules:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.title || !formData.gdrive_file_id) {
            alert('Title dan Google Drive File ID wajib diisi!');
            return;
        }

        try {
            const fileId = extractFileId(formData.gdrive_file_id);
            const insertData = {
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                category: 'module',
                gdrive_file_id: fileId,
                gdrive_url: `https://drive.google.com/file/d/${fileId}/view`,
                file_type: formData.file_type,
                thumbnail_url: formData.thumbnail_gdrive_id ? getThumbnailUrl(formData.thumbnail_gdrive_id, 400) : null,
                thumbnail_gdrive_id: formData.thumbnail_gdrive_id || null,
                duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
                order_index: formData.order_index || modules.length + 1,
                is_active: formData.is_active,
                created_by: admin?.id || null,
            };

            const { data, error } = await supabase
                .from('modules')
                .insert([insertData])
                .select('*, users(nrp, full_name)');

            if (error) throw error;
            setModules([...modules, data[0]]);
            resetForm();
            alert('Module berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menambahkan module: ' + error.message);
        }
    };

    const handleUpdate = async () => {
        if (!formData.title) {
            alert('Title wajib diisi!');
            return;
        }

        try {
            const fileId = formData.gdrive_file_id ? extractFileId(formData.gdrive_file_id) : null;
            const updateData = {
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                gdrive_file_id: fileId,
                gdrive_url: fileId ? `https://drive.google.com/file/d/${fileId}/view` : null,
                file_type: formData.file_type,
                thumbnail_url: formData.thumbnail_gdrive_id ? getThumbnailUrl(formData.thumbnail_gdrive_id, 400) : null,
                thumbnail_gdrive_id: formData.thumbnail_gdrive_id || null,
                duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
                order_index: formData.order_index || 0,
                is_active: formData.is_active,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('modules')
                .update(updateData)
                .eq('id', editingId)
                .select('*, users(nrp, full_name)');

            if (error) throw error;
            setModules(modules.map(m => m.id === editingId ? data[0] : m));
            resetForm();
            alert('Module berhasil diupdate!');
        } catch (error) {
            alert('Gagal mengupdate module: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
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

    const startEdit = (module) => {
        setEditingId(module.id);
        setFormData({
            title: module.title,
            description: module.description || '',
            gdrive_file_id: module.gdrive_file_id || '',
            gdrive_url: module.gdrive_url || '',
            file_type: module.file_type || 'pdf',
            thumbnail_gdrive_id: module.thumbnail_gdrive_id || '',
            duration_minutes: module.duration_minutes || '',
            order_index: module.order_index || 0,
            is_active: module.is_active
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            gdrive_file_id: '',
            gdrive_url: '',
            file_type: 'pdf',
            thumbnail_gdrive_id: '',
            duration_minutes: '',
            order_index: 0,
            is_active: true
        });
        setEditingId(null);
        setShowForm(false);
    };

    // ==================== IMPORT MODAL FUNCTIONS ====================

    const openImportModal = async () => {
        setShowImportModal(true);
        setImportStep(1);
        setSelectedFile(null);
        setSelectedThumbnail(null);
        setImportError('');
        setDriveSearchQuery('');
        setImportFormData({
            title: '',
            description: '',
            file_type: 'pdf',
            duration_minutes: '',
            order_index: modules.length + 1,
            is_active: true
        });
        await loadDriveFiles();
    };

    const loadDriveFiles = async () => {
        setLoadingFiles(true);
        setImportError('');
        try {
            const [contentResult, thumbResult] = await Promise.all([
                listDriveFiles('module', 'content'),
                listDriveFiles('module', 'thumbnail')
            ]);

            if (contentResult.success) {
                setDriveFiles(contentResult.data || []);
            } else {
                setImportError('Gagal memuat file dari Drive');
            }

            if (thumbResult.success) {
                setThumbnailFiles(thumbResult.data || []);
            }
        } catch (error) {
            console.error('Error loading Drive files:', error);
            setImportError(error.message || 'Gagal memuat file dari Google Drive');
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleDriveFileSelect = (file) => {
        setSelectedFile(file);
        setImportFormData(prev => ({
            ...prev,
            title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
            file_type: determineFileType(file.mimeType || file.name)
        }));
    };

    const handleThumbnailSelect = (file) => {
        setSelectedThumbnail(selectedThumbnail?.id === file.id ? null : file);
    };

    const proceedToStep2 = () => {
        if (!selectedFile) {
            setImportError('Pilih file terlebih dahulu');
            return;
        }
        setImportError('');
        setImportStep(2);
    };

    const handleImportSave = async () => {
        if (!importFormData.title.trim()) {
            setImportError('Title wajib diisi');
            return;
        }
        if (!selectedFile) {
            setImportError('File wajib dipilih');
            return;
        }

        setSaving(true);
        setImportError('');

        try {
            const insertData = {
                title: importFormData.title.trim(),
                description: importFormData.description.trim() || null,
                category: 'module',
                gdrive_file_id: selectedFile.id,
                gdrive_url: `https://drive.google.com/file/d/${selectedFile.id}/view`,
                file_type: importFormData.file_type,
                thumbnail_url: selectedThumbnail ? getThumbnailUrl(selectedThumbnail.id, 400) : null,
                thumbnail_gdrive_id: selectedThumbnail?.id || null,
                duration_minutes: importFormData.duration_minutes ? parseInt(importFormData.duration_minutes) : null,
                order_index: importFormData.order_index || modules.length + 1,
                is_active: importFormData.is_active,
                created_by: admin?.id || null,
            };

            const { data, error } = await supabase
                .from('modules')
                .insert([insertData])
                .select('*, users(nrp, full_name)');

            if (error) throw error;

            setModules([...modules, data[0]]);
            setShowImportModal(false);
            alert('Module berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            console.error('Error saving module:', error);
            setImportError('Gagal menyimpan: ' + error.message);
        } finally {
            setSaving(false);
        }
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

    const filteredDriveFiles = driveFiles.filter(f =>
        f.name.toLowerCase().includes(driveSearchQuery.toLowerCase())
    );

    // ==================== RENDER ====================

    return (
        <>
            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Import Module dari Google Drive</h3>
                                <p className="text-sm text-gray-500">
                                    Step {importStep}/2: {importStep === 1 ? 'Pilih File' : 'Preview & Simpan'}
                                </p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {importStep === 1 ? (
                                <div className="space-y-4">
                                    {/* Drive Files Header */}
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">Pilih file dari Google Drive</h4>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={loadDriveFiles}
                                                className="p-2 hover:bg-gray-100 rounded-lg"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => openDriveFolder('module', 'content')}
                                                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                Buka Folder
                                            </button>
                                        </div>
                                    </div>

                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={driveSearchQuery}
                                            onChange={(e) => setDriveSearchQuery(e.target.value)}
                                            placeholder="Cari file..."
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg"
                                        />
                                    </div>

                                    {/* File Grid */}
                                    {loadingFiles ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            <p className="mt-2 text-gray-500">Memuat file...</p>
                                        </div>
                                    ) : filteredDriveFiles.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <File className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                            <p>Tidak ada file di folder Module</p>
                                            <p className="text-sm mt-1">Upload file ke Google Drive terlebih dahulu</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                                            {filteredDriveFiles.map(file => (
                                                <button
                                                    key={file.id}
                                                    onClick={() => handleDriveFileSelect(file)}
                                                    className={`relative flex items-center gap-2 p-3 border rounded-lg text-left transition-all ${selectedFile?.id === file.id
                                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                        : 'hover:bg-gray-50 hover:border-gray-400'
                                                        }`}
                                                >
                                                    {selectedFile?.id === file.id && (
                                                        <CheckCircle className="w-5 h-5 text-blue-600 absolute top-2 right-2" />
                                                    )}
                                                    {getFileTypeIcon(determineFileType(file.mimeType || file.name))}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Error Display */}
                                    {importError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                            <p className="text-sm text-red-600">{importError}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Selected File Info */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-medium text-blue-800 mb-2">File Terpilih</h4>
                                        <div className="flex items-center gap-3">
                                            {getFileTypeIcon(determineFileType(selectedFile?.mimeType || selectedFile?.name))}
                                            <div>
                                                <p className="font-medium">{selectedFile?.name}</p>
                                                <p className="text-sm text-gray-500">{formatFileSize(selectedFile?.size)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1">Title *</label>
                                            <input
                                                type="text"
                                                value={importFormData.title}
                                                onChange={(e) => setImportFormData({ ...importFormData, title: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="Judul module"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1">Description</label>
                                            <textarea
                                                value={importFormData.description}
                                                onChange={(e) => setImportFormData({ ...importFormData, description: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                rows={2}
                                                placeholder="Deskripsi module"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">File Type</label>
                                            <select
                                                value={importFormData.file_type}
                                                onChange={(e) => setImportFormData({ ...importFormData, file_type: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="pdf">PDF</option>
                                                <option value="mp4">Video (MP4)</option>
                                                <option value="image">Image</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                                            <input
                                                type="number"
                                                value={importFormData.duration_minutes}
                                                onChange={(e) => setImportFormData({ ...importFormData, duration_minutes: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="0"
                                                min="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Order Index</label>
                                            <input
                                                type="number"
                                                value={importFormData.order_index}
                                                onChange={(e) => setImportFormData({ ...importFormData, order_index: parseInt(e.target.value) || 0 })}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                min="0"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="import_is_active"
                                                checked={importFormData.is_active}
                                                onChange={(e) => setImportFormData({ ...importFormData, is_active: e.target.checked })}
                                                className="w-4 h-4 text-blue-600"
                                            />
                                            <label htmlFor="import_is_active" className="text-sm">Active</label>
                                        </div>
                                    </div>

                                    {/* Thumbnail Selection */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Thumbnail (opsional)</label>
                                        {thumbnailFiles.length > 0 ? (
                                            <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                                                {thumbnailFiles.map(file => (
                                                    <button
                                                        key={file.id}
                                                        onClick={() => handleThumbnailSelect(file)}
                                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 ${selectedThumbnail?.id === file.id
                                                            ? 'border-blue-500 ring-2 ring-blue-200'
                                                            : 'border-transparent hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <img
                                                            src={getThumbnailUrl(file.id, 100)}
                                                            alt={file.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {selectedThumbnail?.id === file.id && (
                                                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                                <CheckCircle className="w-6 h-6 text-blue-600" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">Tidak ada thumbnail tersedia</p>
                                        )}
                                    </div>

                                    {/* Error Display */}
                                    {importError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                            <p className="text-sm text-red-600">{importError}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t flex justify-between">
                            {importStep === 2 && (
                                <button
                                    onClick={() => setImportStep(1)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    ← Kembali
                                </button>
                            )}
                            <div className="flex gap-2 ml-auto">
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Batal
                                </button>
                                {importStep === 1 ? (
                                    <button
                                        onClick={proceedToStep2}
                                        disabled={!selectedFile}
                                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                        Lanjut →
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleImportSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                                    >
                                        {saving ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Simpan Module
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Modules Management</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => openDriveFolder('module', 'content')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        <FolderOpen className="w-5 h-5" />
                        Buka Folder Drive
                    </button>
                    <button
                        onClick={openImportModal}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        <Upload className="w-5 h-5" />
                        Import dari GDrive
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {showForm ? 'Cancel' : 'Add Manual'}
                    </button>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {editingId ? 'Edit Module' : 'Add New Module'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Judul module"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows={2}
                                placeholder="Deskripsi module"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Google Drive File ID *</label>
                            <input
                                type="text"
                                value={formData.gdrive_file_id}
                                onChange={(e) => setFormData({ ...formData, gdrive_file_id: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="File ID atau URL dari Google Drive"
                            />
                            <p className="text-xs text-gray-500 mt-1">Bisa berupa File ID atau URL lengkap</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">File Type</label>
                            <select
                                value={formData.file_type}
                                onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="pdf">PDF</option>
                                <option value="mp4">Video (MP4)</option>
                                <option value="image">Image</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Thumbnail Google Drive ID</label>
                            <input
                                type="text"
                                value={formData.thumbnail_gdrive_id}
                                onChange={(e) => setFormData({ ...formData, thumbnail_gdrive_id: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="ID thumbnail (opsional)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                            <input
                                type="number"
                                value={formData.duration_minutes}
                                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Order Index</label>
                            <input
                                type="number"
                                value={formData.order_index}
                                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                min="0"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="form_is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 text-blue-600"
                            />
                            <label htmlFor="form_is_active" className="text-sm">Active</label>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={editingId ? handleUpdate : handleCreate}
                            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                        >
                            <Save className="w-5 h-5" />
                            {editingId ? 'Update' : 'Save'}
                        </button>
                        <button
                            onClick={resetForm}
                            className="flex items-center gap-2 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                        >
                            <X className="w-5 h-5" />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <FileText className="w-16 h-16 text-gray-300 mb-4" />
                                            <p className="text-lg font-medium">No modules found</p>
                                            <p className="text-sm mt-2">Click "Add Manual" or "Import dari GDrive" to create your first module</p>
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
                                                        onError={(e) => { e.target.style.display = 'none'; }}
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
                                                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${module.is_active
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
                                        <td className="px-4 py-4 text-right space-x-2">
                                            {module.gdrive_url && (
                                                <a
                                                    href={module.gdrive_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-green-600 hover:text-green-800"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    View
                                                </a>
                                            )}
                                            <button
                                                onClick={() => startEdit(module)}
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(module.id)}
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
            )}

            {modules.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                    Total: {modules.length} modules
                </div>
            )}
        </>
    );
};