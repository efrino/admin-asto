import { useState, useEffect } from 'react';
import {
    Plus, Trash2, Save, X, FileText, ExternalLink,
    FolderOpen, Folder, Search, RefreshCw, Check,
    CheckCircle, AlertCircle, File, Download, Upload,
    FileSpreadsheet, Database, Cloud, CloudOff, MoreVertical
} from 'lucide-react';
import { supabase } from '../config/supabase';
import {
    listFilesInFolder,
    listDriveFiles,
    determineFileType,
    formatFileSize,
    openDriveFolder,
    filterPdfAndExcel
} from '../utils/googleDrive';

export const MecaAidTab = ({ admin, onStatsUpdate }) => {
    // Folder states
    const [folders, setFolders] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Drive files states
    const [driveFiles, setDriveFiles] = useState([]);
    const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
    const [driveError, setDriveError] = useState('');

    // Database files states
    const [dbFiles, setDbFiles] = useState([]);

    // Folder Modal State (2-step)
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [folderStep, setFolderStep] = useState(1);
    const [availableDriveFolders, setAvailableDriveFolders] = useState([]);
    const [loadingDriveFolders, setLoadingDriveFolders] = useState(false);
    const [selectedDriveFolder, setSelectedDriveFolder] = useState(null);
    const [folderSearchQuery, setFolderSearchQuery] = useState('');
    const [folderError, setFolderError] = useState('');
    const [savingFolder, setSavingFolder] = useState(false);
    const [folderFormData, setFolderFormData] = useState({
        folder_name: '',
        description: '',
        order_index: 0,
        is_active: true
    });

    // Import Modal State
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedFilesToImport, setSelectedFilesToImport] = useState([]);
    const [importing, setImporting] = useState(false);

    // Manual Add File Modal
    const [showManualAddModal, setShowManualAddModal] = useState(false);
    const [manualFileData, setManualFileData] = useState({
        gdrive_file_id: '',
        title: '',
        description: '',
        file_type: 'pdf',
        order_index: 0,
        is_active: true
    });
    const [savingManualFile, setSavingManualFile] = useState(false);

    // Context menu for folder
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);

    useEffect(() => {
        fetchFolders();
    }, []);

    useEffect(() => {
        if (selectedFolderId) {
            const folder = folders.find(f => f.id === selectedFolderId);
            if (folder?.gdrive_folder_id) {
                fetchFilesFromDrive(folder.gdrive_folder_id);
                fetchDbFiles(selectedFolderId);
            }
        } else {
            setDriveFiles([]);
            setDbFiles([]);
        }
    }, [selectedFolderId, folders]);

    // Close folder menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setFolderMenuOpen(null);
        if (folderMenuOpen) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [folderMenuOpen]);

    const fetchFolders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('meca_aid_folders')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) throw error;
            setFolders(data || []);

            if (data?.length > 0 && !selectedFolderId) {
                setSelectedFolderId(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching folders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFilesFromDrive = async (gdriveFolderId) => {
        setLoadingDriveFiles(true);
        setDriveError('');
        try {
            const result = await listFilesInFolder(gdriveFolderId, {
                fileTypes: ['pdf', 'excel']
            });

            if (result.success) {
                const filteredFiles = filterPdfAndExcel(result.data);
                setDriveFiles(filteredFiles);
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

    const fetchDbFiles = async (folderId) => {
        try {
            const { data, error } = await supabase
                .from('modules')
                .select('*, users(nrp, full_name)')
                .eq('category', 'meca_aid')
                .eq('parent_folder_id', folderId)
                .order('order_index', { ascending: true });

            if (error) throw error;
            setDbFiles(data || []);
        } catch (error) {
            console.error('Error fetching db files:', error);
        }
    };

    const isFileImported = (driveFileId) => {
        return dbFiles.some(f => f.gdrive_file_id === driveFileId);
    };

    const getImportedFile = (driveFileId) => {
        return dbFiles.find(f => f.gdrive_file_id === driveFileId);
    };

    // ==================== FOLDER MODAL FUNCTIONS ====================

    const openFolderModal = async () => {
        setShowFolderModal(true);
        setFolderStep(1);
        setSelectedDriveFolder(null);
        setFolderError('');
        setFolderSearchQuery('');
        setFolderFormData({
            folder_name: '',
            description: '',
            order_index: folders.length + 1,
            is_active: true
        });
        await loadDriveFolders();
    };

    const loadDriveFolders = async () => {
        setLoadingDriveFolders(true);
        setFolderError('');
        try {
            const result = await listDriveFiles('meca_aid', 'content');
            if (result.success) {
                const foldersOnly = (result.data || []).filter(f =>
                    f.mimeType === 'application/vnd.google-apps.folder'
                );
                setAvailableDriveFolders(foldersOnly);
            } else {
                setFolderError('Gagal memuat folder dari Drive');
            }
        } catch (error) {
            console.error('Error loading Drive folders:', error);
            setFolderError(error.message || 'Gagal memuat folder');
        } finally {
            setLoadingDriveFolders(false);
        }
    };

    const handleDriveFolderSelect = (folder) => {
        setSelectedDriveFolder(folder);
        setFolderFormData(prev => ({
            ...prev,
            folder_name: prev.folder_name || folder.name
        }));
    };

    const proceedToFolderStep2 = () => {
        if (!selectedDriveFolder) {
            setFolderError('Pilih folder terlebih dahulu');
            return;
        }
        setFolderError('');
        setFolderStep(2);
    };

    const handleSaveFolder = async () => {
        if (!folderFormData.folder_name.trim()) {
            setFolderError('Nama folder wajib diisi');
            return;
        }

        setSavingFolder(true);
        setFolderError('');

        try {
            const insertData = {
                folder_name: folderFormData.folder_name.trim(),
                description: folderFormData.description.trim() || null,
                gdrive_folder_id: selectedDriveFolder?.id || null,
                order_index: folderFormData.order_index || folders.length + 1,
                is_active: folderFormData.is_active,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('meca_aid_folders')
                .insert([insertData])
                .select();

            if (error) throw error;

            setFolders([...folders, data[0]]);
            setShowFolderModal(false);
            setSelectedFolderId(data[0].id);
            alert('Folder berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            console.error('Error saving folder:', error);
            setFolderError('Gagal menyimpan: ' + error.message);
        } finally {
            setSavingFolder(false);
        }
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
        const selectedFolder = folders.find(f => f.id === selectedFolderId);

        try {
            const insertData = selectedFilesToImport.map((file, index) => ({
                title: file.name.replace(/\.[^/.]+$/, ''),
                description: null,
                category: 'meca_aid',
                parent_folder_id: selectedFolderId,
                folder_name: selectedFolder?.folder_name || null,
                gdrive_file_id: file.id,
                gdrive_url: `https://drive.google.com/file/d/${file.id}/view`,
                file_type: determineFileType(file.mimeType || file.name),
                thumbnail_url: null,
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
            alert(`${data.length} file berhasil diimport!`);
            onStatsUpdate?.();
        } catch (error) {
            console.error('Error importing files:', error);
            alert('Gagal mengimport: ' + error.message);
        } finally {
            setImporting(false);
        }
    };

    // ==================== MANUAL ADD FILE ====================

    const openManualAddModal = () => {
        setManualFileData({
            gdrive_file_id: '',
            title: '',
            description: '',
            file_type: 'pdf',
            order_index: dbFiles.length + 1,
            is_active: true
        });
        setShowManualAddModal(true);
    };

    const handleSaveManualFile = async () => {
        if (!manualFileData.gdrive_file_id.trim() || !manualFileData.title.trim()) {
            alert('Google Drive File ID dan Title wajib diisi');
            return;
        }

        setSavingManualFile(true);
        const selectedFolder = folders.find(f => f.id === selectedFolderId);

        try {
            const insertData = {
                title: manualFileData.title.trim(),
                description: manualFileData.description.trim() || null,
                category: 'meca_aid',
                parent_folder_id: selectedFolderId,
                folder_name: selectedFolder?.folder_name || null,
                gdrive_file_id: manualFileData.gdrive_file_id.trim(),
                gdrive_url: `https://drive.google.com/file/d/${manualFileData.gdrive_file_id.trim()}/view`,
                file_type: manualFileData.file_type,
                thumbnail_url: null,
                thumbnail_gdrive_id: null,
                duration_minutes: null,
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
            alert('File berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Gagal menyimpan: ' + error.message);
        } finally {
            setSavingManualFile(false);
        }
    };

    // ==================== CRUD FUNCTIONS ====================

    const handleDeleteFolder = async (id) => {
        if (!confirm('Yakin ingin menghapus folder ini? Semua file dalam folder juga akan dihapus dari database.')) return;

        try {
            await supabase
                .from('modules')
                .delete()
                .eq('parent_folder_id', id);

            const { error } = await supabase
                .from('meca_aid_folders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setFolders(folders.filter(f => f.id !== id));
            if (selectedFolderId === id) {
                setSelectedFolderId(folders[0]?.id || null);
            }
            setFolderMenuOpen(null);
            alert('Folder berhasil dihapus!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menghapus folder: ' + error.message);
        }
    };

    const handleDeleteDbFile = async (id) => {
        if (!confirm('Hapus file ini dari database?')) return;

        try {
            const { error } = await supabase
                .from('modules')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setDbFiles(dbFiles.filter(f => f.id !== id));
            alert('File berhasil dihapus!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menghapus file: ' + error.message);
        }
    };

    const handleToggleFolderActive = async (folder) => {
        try {
            const { error } = await supabase
                .from('meca_aid_folders')
                .update({ is_active: !folder.is_active, updated_at: new Date().toISOString() })
                .eq('id', folder.id);

            if (error) throw error;
            setFolders(folders.map(f => f.id === folder.id ? { ...f, is_active: !f.is_active } : f));
            setFolderMenuOpen(null);
        } catch (error) {
            alert('Gagal mengubah status: ' + error.message);
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
            case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
            case 'xls':
            case 'xlsx': return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
            default: return <File className="w-4 h-4 text-gray-500" />;
        }
    };

    const getFileTypeBadge = (type) => {
        switch (type) {
            case 'pdf': return 'bg-red-100 text-red-700';
            case 'xls':
            case 'xlsx': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredDriveFolders = availableDriveFolders.filter(f =>
        f.name.toLowerCase().includes(folderSearchQuery.toLowerCase())
    );

    const selectedFolder = folders.find(f => f.id === selectedFolderId);
    const importedCount = driveFiles.filter(f => isFileImported(f.id)).length;
    const notImportedCount = driveFiles.length - importedCount;

    return (
        <>
            {/* Folder Modal (2-Step) */}
            {showFolderModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Import Folder dari Google Drive</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${folderStep >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>1</span>
                                    <div className={`w-8 h-0.5 ${folderStep >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${folderStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>2</span>
                                </div>
                            </div>
                            <button onClick={() => setShowFolderModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {folderStep === 1 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-600">Pilih folder dari Google Drive</p>
                                        <button
                                            onClick={() => openDriveFolder('meca_aid', 'content')}
                                            className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Buka Drive
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Cari folder..."
                                            value={folderSearchQuery}
                                            onChange={(e) => setFolderSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        {loadingDriveFolders ? (
                                            <div className="p-8 text-center">
                                                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-500" />
                                                <p className="text-sm text-gray-500 mt-2">Memuat folder...</p>
                                            </div>
                                        ) : filteredDriveFolders.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <Folder className="w-10 h-10 mx-auto text-gray-300" />
                                                <p className="text-sm text-gray-500 mt-2">Tidak ada folder ditemukan</p>
                                            </div>
                                        ) : (
                                            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                                                {filteredDriveFolders.map(folder => (
                                                    <div
                                                        key={folder.id}
                                                        onClick={() => handleDriveFolderSelect(folder)}
                                                        className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${selectedDriveFolder?.id === folder.id
                                                            ? 'bg-purple-50'
                                                            : 'hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <Folder className={`w-5 h-5 ${selectedDriveFolder?.id === folder.id ? 'text-purple-600' : 'text-yellow-500'}`} />
                                                        <span className="flex-1 text-sm font-medium text-gray-700">{folder.name}</span>
                                                        {selectedDriveFolder?.id === folder.id && (
                                                            <CheckCircle className="w-5 h-5 text-purple-600" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {selectedDriveFolder && (
                                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 flex items-center gap-3">
                                            <Folder className="w-5 h-5 text-purple-600" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-purple-900 truncate">{selectedDriveFolder.name}</p>
                                            </div>
                                            <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                        </div>
                                    )}

                                    {folderError && (
                                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                            <p className="text-sm text-red-700">{folderError}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {folderStep === 2 && (
                                <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <Folder className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 truncate">{selectedDriveFolder.name}</p>
                                            <p className="text-xs text-gray-500">Folder terpilih dari Google Drive</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Nama Folder <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={folderFormData.folder_name}
                                            onChange={(e) => setFolderFormData({ ...folderFormData, folder_name: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="Nama tampilan folder"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
                                        <textarea
                                            value={folderFormData.description}
                                            onChange={(e) => setFolderFormData({ ...folderFormData, description: e.target.value })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                            rows={2}
                                            placeholder="Deskripsi opsional"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={folderFormData.is_active}
                                                onChange={(e) => setFolderFormData({ ...folderFormData, is_active: e.target.checked })}
                                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                            />
                                            <span className="text-sm text-gray-700">Aktifkan folder</span>
                                        </label>
                                    </div>

                                    {folderError && (
                                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                            <p className="text-sm text-red-700">{folderError}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-between">
                            {folderStep === 1 ? (
                                <>
                                    <button onClick={() => setShowFolderModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                                        Batal
                                    </button>
                                    <button
                                        onClick={proceedToFolderStep2}
                                        disabled={!selectedDriveFolder}
                                        className="px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Lanjutkan
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setFolderStep(1)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                                        ← Kembali
                                    </button>
                                    <button
                                        onClick={handleSaveFolder}
                                        disabled={savingFolder || !folderFormData.folder_name}
                                        className="px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                    >
                                        {savingFolder && <RefreshCw className="w-4 h-4 animate-spin" />}
                                        Simpan Folder
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Import Files</h3>
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
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-purple-100' : 'bg-gray-100'}`}>
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

                        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-between">
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

            {/* Manual Add File Modal */}
            {showManualAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Tambah File Manual</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Input Google Drive File ID secara manual</p>
                        </div>

                        <div className="p-6 space-y-4">
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
                                    placeholder="Nama file"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe File</label>
                                <select
                                    value={manualFileData.file_type}
                                    onChange={(e) => setManualFileData({ ...manualFileData, file_type: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                >
                                    <option value="pdf">PDF</option>
                                    <option value="xlsx">Excel (XLSX)</option>
                                    <option value="xls">Excel (XLS)</option>
                                </select>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={manualFileData.is_active}
                                    onChange={(e) => setManualFileData({ ...manualFileData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Aktifkan file</span>
                            </label>
                        </div>

                        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
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

            {/* Main Content */}
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Meca Aid</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Kelola file PDF & Excel untuk Meca Aid</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => openDriveFolder('meca_aid', 'content')}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Buka Drive
                        </button>
                        <button
                            onClick={openFolderModal}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <FolderOpen className="w-4 h-4" />
                            Import Folder
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
                    </div>
                ) : (
                    <div className="flex gap-6">
                        {/* Folder Sidebar */}
                        <div className="w-64 flex-shrink-0">
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                    <h3 className="text-sm font-medium text-gray-700">Folders</h3>
                                </div>
                                {folders.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <Folder className="w-10 h-10 mx-auto text-gray-300" />
                                        <p className="text-sm text-gray-500 mt-2">Belum ada folder</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {folders.map(folder => (
                                            <div
                                                key={folder.id}
                                                className={`relative group ${selectedFolderId === folder.id ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                                            >
                                                <div
                                                    onClick={() => setSelectedFolderId(folder.id)}
                                                    className="px-4 py-3 cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Folder className={`w-5 h-5 flex-shrink-0 ${selectedFolderId === folder.id ? 'text-purple-600' : 'text-yellow-500'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-medium truncate ${selectedFolderId === folder.id ? 'text-purple-900' : 'text-gray-700'}`}>
                                                                {folder.folder_name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${folder.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                                <span className="text-xs text-gray-500">
                                                                    {folder.is_active ? 'Aktif' : 'Nonaktif'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Folder menu button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id);
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
                                                >
                                                    <MoreVertical className="w-4 h-4 text-gray-500" />
                                                </button>

                                                {/* Dropdown menu */}
                                                {folderMenuOpen === folder.id && (
                                                    <div className="absolute right-2 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 w-36">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleFolderActive(folder);
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                                        >
                                                            {folder.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteFolder(folder.id);
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Files Content */}
                        <div className="flex-1 min-w-0">
                            {selectedFolderId ? (
                                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                    {/* Files Header */}
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-sm font-medium text-gray-900">{selectedFolder?.folder_name}</h3>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                                        <Cloud className="w-3 h-3" />
                                                        {driveFiles.length}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                                        <Database className="w-3 h-3" />
                                                        {importedCount}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => fetchFilesFromDrive(selectedFolder?.gdrive_folder_id)}
                                                    disabled={loadingDriveFiles}
                                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Refresh"
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${loadingDriveFiles ? 'animate-spin' : ''}`} />
                                                </button>
                                                {notImportedCount > 0 && (
                                                    <button
                                                        onClick={openImportModal}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                                                    >
                                                        <Upload className="w-3.5 h-3.5" />
                                                        Import ({notImportedCount})
                                                    </button>
                                                )}
                                                <button
                                                    onClick={openManualAddModal}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Manual
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {driveError && (
                                        <div className="mx-4 mt-4 bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-red-700">{driveError}</p>
                                        </div>
                                    )}

                                    {/* Files List */}
                                    <div className="divide-y divide-gray-100">
                                        {loadingDriveFiles ? (
                                            <div className="p-12 text-center">
                                                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                                                <p className="text-sm text-gray-500 mt-2">Memuat file...</p>
                                            </div>
                                        ) : driveFiles.length === 0 ? (
                                            <div className="p-12 text-center">
                                                <CloudOff className="w-10 h-10 mx-auto text-gray-300" />
                                                <p className="text-sm font-medium text-gray-600 mt-3">Tidak ada file</p>
                                                <p className="text-xs text-gray-500 mt-1">Upload file PDF/Excel ke Google Drive</p>
                                            </div>
                                        ) : (
                                            driveFiles.map(file => {
                                                const isImported = isFileImported(file.id);
                                                const importedData = getImportedFile(file.id);
                                                const fileType = determineFileType(file.mimeType || file.name);

                                                return (
                                                    <div key={file.id} className={`px-4 py-3 flex items-center gap-4 ${isImported ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}>
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isImported ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                            {getFileTypeIcon(fileType)}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-xs px-1.5 py-0.5 rounded ${getFileTypeBadge(fileType)}`}>
                                                                    {fileType.toUpperCase()}
                                                                </span>
                                                                {file.size && (
                                                                    <span className="text-xs text-gray-500">{formatFileSize(parseInt(file.size))}</span>
                                                                )}
                                                            </div>
                                                        </div>

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
                                                                    <button
                                                                        onClick={() => handleDeleteDbFile(importedData?.id)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Hapus dari database"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
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

                                    {/* Summary Footer */}
                                    {driveFiles.length > 0 && (
                                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                    {importedCount} sudah diimport
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                                                    {notImportedCount} belum diimport
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                                    <FolderOpen className="w-12 h-12 mx-auto text-gray-300" />
                                    <p className="text-sm font-medium text-gray-600 mt-3">Pilih folder</p>
                                    <p className="text-xs text-gray-500 mt-1">Pilih folder di sidebar untuk melihat file</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};