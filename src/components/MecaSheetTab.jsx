// ==================== src/components/MecaSheetTab.jsx ====================
import { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Save, X, FileSpreadsheet, ExternalLink,
    GripVertical, FolderOpen, Search, RefreshCw, Check, Eye,
    CheckCircle, AlertCircle, File, Upload
} from 'lucide-react';
import { supabase } from '../config/supabase';
import {
    listDriveFiles,
    getThumbnailUrl,
    formatFileSize,
    openDriveFolder,
    extractFileId
} from '../utils/googleDrive';

export const MecaSheetTab = ({ admin, onStatsUpdate }) => {
    // State
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form State (untuk Add Manual dan Edit)
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        gdrive_file_id: '',
        gdrive_url: '',
        thumbnail_gdrive_id: '',
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
        order_index: 0,
        is_active: true
    });

    useEffect(() => {
        fetchSheets();
    }, []);

    // ==================== DATA FUNCTIONS ====================

    const fetchSheets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('modules')
                .select('*, users(nrp, full_name)')
                .eq('category', 'meca_sheet')
                .order('order_index', { ascending: true });

            if (error) throw error;
            setSheets(data || []);
        } catch (error) {
            console.error('Error fetching meca sheets:', error);
        } finally {
            setLoading(false);
        }
    };

    // ==================== MANUAL FORM FUNCTIONS ====================

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
                category: 'meca_sheet',
                gdrive_file_id: fileId,
                gdrive_url: `https://drive.google.com/file/d/${fileId}/view`,
                file_type: 'xlsx',
                thumbnail_url: formData.thumbnail_gdrive_id ? getThumbnailUrl(formData.thumbnail_gdrive_id, 400) : null,
                thumbnail_gdrive_id: formData.thumbnail_gdrive_id || null,
                order_index: formData.order_index || sheets.length + 1,
                is_active: formData.is_active,
                created_by: admin?.id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('modules')
                .insert([insertData])
                .select();

            if (error) throw error;
            setSheets([...sheets, data[0]]);
            resetForm();
            alert('Meca Sheet berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menambahkan: ' + error.message);
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
                gdrive_url: fileId ? `https://drive.google.com/file/d/${fileId}/view` : formData.gdrive_url,
                thumbnail_url: formData.thumbnail_gdrive_id ? getThumbnailUrl(formData.thumbnail_gdrive_id, 400) : null,
                thumbnail_gdrive_id: formData.thumbnail_gdrive_id || null,
                order_index: formData.order_index,
                is_active: formData.is_active,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('modules')
                .update(updateData)
                .eq('id', editingId)
                .select();

            if (error) throw error;
            setSheets(sheets.map(s => s.id === editingId ? data[0] : s));
            resetForm();
            alert('Meca Sheet berhasil diupdate!');
        } catch (error) {
            alert('Gagal mengupdate: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus Meca Sheet ini?')) return;

        try {
            const { error } = await supabase
                .from('modules')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSheets(sheets.filter(s => s.id !== id));
            alert('Meca Sheet berhasil dihapus!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menghapus: ' + error.message);
        }
    };

    const handleToggleActive = async (sheet) => {
        try {
            const { error } = await supabase
                .from('modules')
                .update({ is_active: !sheet.is_active, updated_at: new Date().toISOString() })
                .eq('id', sheet.id);

            if (error) throw error;
            setSheets(sheets.map(s => s.id === sheet.id ? { ...s, is_active: !s.is_active } : s));
        } catch (error) {
            alert('Gagal mengubah status: ' + error.message);
        }
    };

    const startEdit = (sheet) => {
        setEditingId(sheet.id);
        setFormData({
            title: sheet.title,
            description: sheet.description || '',
            gdrive_file_id: sheet.gdrive_file_id || '',
            gdrive_url: sheet.gdrive_url || '',
            thumbnail_gdrive_id: sheet.thumbnail_gdrive_id || '',
            order_index: sheet.order_index || 0,
            is_active: sheet.is_active
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            gdrive_file_id: '',
            gdrive_url: '',
            thumbnail_gdrive_id: '',
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
            order_index: sheets.length + 1,
            is_active: true
        });
        await loadDriveFiles();
    };

    const loadDriveFiles = async () => {
        setLoadingFiles(true);
        setImportError('');
        try {
            const [contentResult, thumbResult] = await Promise.all([
                listDriveFiles('meca_sheet', 'content'),
                listDriveFiles('meca_sheet', 'thumbnail')
            ]);

            if (contentResult.success) {
                // Filter Excel files only
                const excelFiles = (contentResult.data || []).filter(f =>
                    f.name.match(/\.(xlsx?|xls)$/i) ||
                    f.mimeType?.includes('spreadsheet')
                );
                setDriveFiles(excelFiles);
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
            title: prev.title || file.name.replace(/\.(xlsx?|xls)$/i, '')
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

    const backToStep1 = () => {
        setImportStep(1);
        setImportError('');
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
                category: 'meca_sheet',
                gdrive_file_id: selectedFile.id,
                gdrive_url: `https://drive.google.com/file/d/${selectedFile.id}/view`,
                file_type: 'xlsx',
                thumbnail_url: selectedThumbnail ? getThumbnailUrl(selectedThumbnail.id, 400) : null,
                thumbnail_gdrive_id: selectedThumbnail?.id || null,
                order_index: importFormData.order_index || sheets.length + 1,
                is_active: importFormData.is_active,
                created_by: admin?.id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('modules')
                .insert([insertData])
                .select();

            if (error) throw error;

            setSheets([...sheets, data[0]]);
            setShowImportModal(false);
            alert('Meca Sheet berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            console.error('Error saving sheet:', error);
            setImportError('Gagal menyimpan: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Filter drive files
    const filteredDriveFiles = driveFiles.filter(f =>
        f.name.toLowerCase().includes(driveSearchQuery.toLowerCase())
    );

    return (
        <>
            {/* Import Modal (2-Step) */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="w-6 h-6 text-green-600" />
                                <div>
                                    <h3 className="text-lg font-semibold">Import Meca Sheet dari Google Drive</h3>
                                    <p className="text-sm text-gray-500">
                                        Step {importStep}/2: {importStep === 1 ? 'Pilih File Excel' : 'Preview & Simpan'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 flex-1 overflow-y-auto">
                            {importStep === 1 && (
                                <div className="space-y-4">
                                    {/* Drive Files Header */}
                                    <div className="flex items-center justify-between">
                                        <p className="text-gray-600">Pilih file Excel dari folder Meca Sheet:</p>
                                        <button
                                            onClick={() => openDriveFolder('meca_sheet', 'content')}
                                            className="text-sm text-green-600 hover:underline flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Buka Folder
                                        </button>
                                    </div>

                                    {/* Search & Refresh */}
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Cari file..."
                                                value={driveSearchQuery}
                                                onChange={(e) => setDriveSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={loadDriveFiles}
                                            disabled={loadingFiles}
                                            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
                                            Refresh
                                        </button>
                                    </div>

                                    {/* File Grid */}
                                    <div className="border rounded-lg max-h-80 overflow-y-auto">
                                        {loadingFiles ? (
                                            <div className="p-8 text-center">
                                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                                                <p className="mt-2 text-gray-500">Memuat file...</p>
                                            </div>
                                        ) : filteredDriveFiles.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500">
                                                <File className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                <p>Tidak ada file Excel di folder Meca Sheet</p>
                                                <p className="text-sm mt-1">Upload file .xlsx atau .xls ke Google Drive</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
                                                {filteredDriveFiles.map(file => (
                                                    <div
                                                        key={file.id}
                                                        onClick={() => handleDriveFileSelect(file)}
                                                        className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-green-400 hover:bg-green-50 ${selectedFile?.id === file.id
                                                            ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                                            : 'border-gray-200'
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                                                                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{file.name}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {file.size && formatFileSize(parseInt(file.size))}
                                                                </p>
                                                            </div>
                                                            {selectedFile?.id === file.id && (
                                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected File Preview */}
                                    {selectedFile && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <div className="flex-1">
                                                <p className="font-medium text-green-900">File dipilih:</p>
                                                <p className="text-sm text-green-700">{selectedFile.name}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {importError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-700">{importError}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {importStep === 2 && (
                                <div className="space-y-4">
                                    {/* Selected File Info */}
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="w-8 h-8 text-green-600" />
                                            <div className="flex-1">
                                                <p className="font-medium text-green-900">{selectedFile.name}</p>
                                                <p className="text-sm text-green-700">
                                                    {selectedFile.size && formatFileSize(parseInt(selectedFile.size))}
                                                </p>
                                            </div>
                                            <a
                                                href={`https://drive.google.com/file/d/${selectedFile.id}/view`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-green-600 hover:underline flex items-center gap-1 text-sm"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Preview
                                            </a>
                                        </div>
                                    </div>

                                    {/* Form Fields */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Title <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={importFormData.title}
                                                onChange={(e) => setImportFormData({ ...importFormData, title: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                                placeholder="Judul Meca Sheet"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <textarea
                                                value={importFormData.description}
                                                onChange={(e) => setImportFormData({ ...importFormData, description: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                                rows={2}
                                                placeholder="Deskripsi (opsional)"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Order Index</label>
                                            <input
                                                type="number"
                                                value={importFormData.order_index}
                                                onChange={(e) => setImportFormData({ ...importFormData, order_index: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                                min="0"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="import_is_active"
                                                checked={importFormData.is_active}
                                                onChange={(e) => setImportFormData({ ...importFormData, is_active: e.target.checked })}
                                                className="w-4 h-4 text-green-600 rounded"
                                            />
                                            <label htmlFor="import_is_active" className="text-sm text-gray-700">Active</label>
                                        </div>
                                    </div>

                                    {/* Thumbnail Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Thumbnail (Opsional)
                                        </label>
                                        <div className="border rounded-lg max-h-40 overflow-y-auto">
                                            {thumbnailFiles.length === 0 ? (
                                                <p className="p-4 text-center text-gray-500 text-sm">
                                                    Tidak ada file di folder Thumbnail
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 p-2">
                                                    {thumbnailFiles.map(file => (
                                                        <div
                                                            key={file.id}
                                                            onClick={() => handleThumbnailSelect(file)}
                                                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedThumbnail?.id === file.id
                                                                ? 'border-green-500 ring-2 ring-green-200'
                                                                : 'border-transparent hover:border-gray-300'
                                                                }`}
                                                        >
                                                            <img
                                                                src={getThumbnailUrl(file.id, 100)}
                                                                alt={file.name}
                                                                className="w-full h-16 object-cover"
                                                            />
                                                            {selectedThumbnail?.id === file.id && (
                                                                <div className="absolute top-1 right-1">
                                                                    <CheckCircle className="w-4 h-4 text-green-600 bg-white rounded-full" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {selectedThumbnail && (
                                            <p className="text-sm text-gray-500 mt-1">Selected: {selectedThumbnail.name}</p>
                                        )}
                                    </div>

                                    {/* Error Message */}
                                    {importError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-700">{importError}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-between">
                            {importStep === 1 ? (
                                <>
                                    <button
                                        onClick={() => setShowImportModal(false)}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={proceedToStep2}
                                        disabled={!selectedFile}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        Lanjut →
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={backToStep1}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
                                    >
                                        ← Kembali
                                    </button>
                                    <button
                                        onClick={handleImportSave}
                                        disabled={saving || !importFormData.title}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Simpan Meca Sheet
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Meca Sheet Management</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => openDriveFolder('meca_sheet', 'content')}
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

            {/* Manual Add/Edit Form */}
            {showForm && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {editingId ? 'Edit Meca Sheet' : 'Add New Meca Sheet'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                placeholder="Judul Meca Sheet"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                rows={2}
                                placeholder="Deskripsi (opsional)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Google Drive File ID *</label>
                            <input
                                type="text"
                                value={formData.gdrive_file_id}
                                onChange={(e) => setFormData({ ...formData, gdrive_file_id: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                placeholder="File ID atau URL dari Google Drive"
                            />
                            <p className="text-xs text-gray-500 mt-1">Bisa berupa File ID atau URL lengkap</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Thumbnail Google Drive ID</label>
                            <input
                                type="text"
                                value={formData.thumbnail_gdrive_id}
                                onChange={(e) => setFormData({ ...formData, thumbnail_gdrive_id: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                placeholder="ID thumbnail (opsional)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Order Index</label>
                            <input
                                type="number"
                                value={formData.order_index}
                                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                min="0"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="form_is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 text-green-600"
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
                            {editingId ? 'Update' : 'Simpan'}
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
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                    <p className="text-gray-600 mt-4">Loading...</p>
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
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created By</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sheets.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <FileSpreadsheet className="w-16 h-16 text-gray-300 mb-4" />
                                            <p className="text-lg font-medium">No Meca Sheets found</p>
                                            <p className="text-sm mt-2">Click "Add Manual" or "Import dari GDrive" to add your first sheet</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sheets.map((sheet, index) => (
                                    <tr key={sheet.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 text-sm text-gray-500">
                                            {sheet.order_index || index + 1}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                {sheet.thumbnail_gdrive_id ? (
                                                    <img
                                                        src={getThumbnailUrl(sheet.thumbnail_gdrive_id, 100)}
                                                        alt={sheet.title}
                                                        className="w-12 h-12 object-cover rounded-lg bg-gray-100"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                                                    </div>
                                                )}
                                                <p className="text-sm font-medium text-gray-900">{sheet.title}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {sheet.description ? (
                                                <p className="truncate max-w-xs">{sheet.description}</p>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => handleToggleActive(sheet)}
                                                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${sheet.is_active
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                    }`}
                                            >
                                                {sheet.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {sheet.users?.full_name || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-right space-x-2">
                                            {sheet.gdrive_url && (
                                                <a
                                                    href={sheet.gdrive_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-green-600 hover:text-green-800"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    View
                                                </a>
                                            )}
                                            <button
                                                onClick={() => startEdit(sheet)}
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(sheet.id)}
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

            {sheets.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                    Total: {sheets.length} Meca Sheets
                </div>
            )}
        </>
    );
};