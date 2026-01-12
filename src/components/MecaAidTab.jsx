import { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Save, X, FileText, Video, Image, ExternalLink,
    FolderOpen, Folder, Search, RefreshCw, Check, Eye,
    CheckCircle, AlertCircle, File, ChevronRight
} from 'lucide-react';
import { supabase } from '../config/supabase';
import {
    listDriveFiles,
    getThumbnailUrl,
    determineFileType,
    formatFileSize,
    openDriveFolder
} from '../utils/googleDrive';

export const MecaAidTab = ({ admin, onStatsUpdate }) => {
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Folder Modal State (2-step)
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [folderStep, setFolderStep] = useState(1);
    const [driveFolders, setDriveFolders] = useState([]);
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

    // File Modal State (2-step)
    const [showFileModal, setShowFileModal] = useState(false);
    const [fileStep, setFileStep] = useState(1);
    const [driveFiles, setDriveFiles] = useState([]);
    const [thumbnailFiles, setThumbnailFiles] = useState([]);
    const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
    const [selectedDriveFile, setSelectedDriveFile] = useState(null);
    const [selectedThumbnail, setSelectedThumbnail] = useState(null);
    const [fileSearchQuery, setFileSearchQuery] = useState('');
    const [fileError, setFileError] = useState('');
    const [savingFile, setSavingFile] = useState(false);
    const [fileFormData, setFileFormData] = useState({
        title: '',
        description: '',
        file_type: 'pdf',
        duration_minutes: '',
        order_index: 0,
        is_active: true
    });

    // Edit states
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [editingFileId, setEditingFileId] = useState(null);
    const [showEditFolderForm, setShowEditFolderForm] = useState(false);
    const [showEditFileForm, setShowEditFileForm] = useState(false);
    const [editFolderData, setEditFolderData] = useState({});
    const [editFileData, setEditFileData] = useState({});

    useEffect(() => {
        fetchFolders();
    }, []);

    useEffect(() => {
        if (selectedFolderId) {
            fetchFiles(selectedFolderId);
        } else {
            setFiles([]);
        }
    }, [selectedFolderId]);

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

    const fetchFiles = async (folderId) => {
        try {
            const { data, error } = await supabase
                .from('modules')
                .select('*, users(nrp, full_name)')
                .eq('category', 'meca_aid')
                .eq('parent_folder_id', folderId)
                .order('order_index', { ascending: true });

            if (error) throw error;
            setFiles(data || []);
        } catch (error) {
            console.error('Error fetching files:', error);
        }
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
                // Filter folders only
                const foldersOnly = (result.data || []).filter(f =>
                    f.mimeType === 'application/vnd.google-apps.folder'
                );
                setDriveFolders(foldersOnly);
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

    // ==================== FILE MODAL FUNCTIONS ====================

    const openFileModal = async () => {
        if (!selectedFolderId) {
            alert('Pilih folder terlebih dahulu');
            return;
        }

        setShowFileModal(true);
        setFileStep(1);
        setSelectedDriveFile(null);
        setSelectedThumbnail(null);
        setFileError('');
        setFileSearchQuery('');
        setFileFormData({
            title: '',
            description: '',
            file_type: 'pdf',
            duration_minutes: '',
            order_index: files.length + 1,
            is_active: true
        });
        await loadDriveFilesForFolder();
    };

    const loadDriveFilesForFolder = async () => {
        setLoadingDriveFiles(true);
        setFileError('');
        try {
            const selectedFolder = folders.find(f => f.id === selectedFolderId);

            // List files from the selected folder in Drive
            const [contentResult, thumbResult] = await Promise.all([
                listDriveFiles('meca_aid', 'content'),
                listDriveFiles('meca_aid', 'thumbnail')
            ]);

            if (contentResult.success) {
                // Filter non-folder files only
                const filesOnly = (contentResult.data || []).filter(f =>
                    f.mimeType !== 'application/vnd.google-apps.folder'
                );
                setDriveFiles(filesOnly);
            } else {
                setFileError('Gagal memuat file dari Drive');
            }

            if (thumbResult.success) {
                setThumbnailFiles(thumbResult.data || []);
            }
        } catch (error) {
            console.error('Error loading Drive files:', error);
            setFileError(error.message || 'Gagal memuat file');
        } finally {
            setLoadingDriveFiles(false);
        }
    };

    const handleDriveFileSelect = (file) => {
        setSelectedDriveFile(file);
        setFileFormData(prev => ({
            ...prev,
            title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
            file_type: determineFileType(file.mimeType || file.name)
        }));
    };

    const handleThumbnailSelect = (file) => {
        setSelectedThumbnail(selectedThumbnail?.id === file.id ? null : file);
    };

    const proceedToFileStep2 = () => {
        if (!selectedDriveFile) {
            setFileError('Pilih file terlebih dahulu');
            return;
        }
        setFileError('');
        setFileStep(2);
    };

    const handleSaveFile = async () => {
        if (!fileFormData.title.trim()) {
            setFileError('Title wajib diisi');
            return;
        }

        setSavingFile(true);
        setFileError('');

        try {
            const selectedFolder = folders.find(f => f.id === selectedFolderId);

            const insertData = {
                title: fileFormData.title.trim(),
                description: fileFormData.description.trim() || null,
                category: 'meca_aid',
                parent_folder_id: selectedFolderId,
                folder_name: selectedFolder?.folder_name || null,
                gdrive_file_id: selectedDriveFile.id,
                gdrive_url: `https://drive.google.com/file/d/${selectedDriveFile.id}/view`,
                file_type: fileFormData.file_type,
                thumbnail_url: selectedThumbnail ? getThumbnailUrl(selectedThumbnail.id, 400) : null,
                thumbnail_gdrive_id: selectedThumbnail?.id || null,
                duration_minutes: fileFormData.duration_minutes ? parseInt(fileFormData.duration_minutes) : null,
                order_index: fileFormData.order_index || files.length + 1,
                is_active: fileFormData.is_active,
                created_by: admin?.id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('modules')
                .insert([insertData])
                .select();

            if (error) throw error;

            setFiles([...files, data[0]]);
            setShowFileModal(false);
            alert('File berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            console.error('Error saving file:', error);
            setFileError('Gagal menyimpan: ' + error.message);
        } finally {
            setSavingFile(false);
        }
    };

    // ==================== CRUD FUNCTIONS ====================

    const handleDeleteFolder = async (id) => {
        if (!confirm('Yakin ingin menghapus folder ini? Semua file dalam folder juga akan dihapus.')) return;

        try {
            // Delete files in folder first
            await supabase
                .from('modules')
                .delete()
                .eq('parent_folder_id', id);

            // Delete folder
            const { error } = await supabase
                .from('meca_aid_folders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setFolders(folders.filter(f => f.id !== id));
            if (selectedFolderId === id) {
                setSelectedFolderId(folders[0]?.id || null);
            }
            alert('Folder berhasil dihapus!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menghapus folder: ' + error.message);
        }
    };

    const handleDeleteFile = async (id) => {
        if (!confirm('Yakin ingin menghapus file ini?')) return;

        try {
            const { error } = await supabase
                .from('modules')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setFiles(files.filter(f => f.id !== id));
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
            setFiles(files.map(f => f.id === file.id ? { ...f, is_active: !f.is_active } : f));
        } catch (error) {
            alert('Gagal mengubah status: ' + error.message);
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

    const getFileIcon = (file) => {
        const type = determineFileType(file.mimeType || file.name);
        return getFileTypeIcon(type);
    };

    const filteredDriveFolders = driveFolders.filter(f =>
        f.name.toLowerCase().includes(folderSearchQuery.toLowerCase())
    );

    const filteredDriveFiles = driveFiles.filter(f =>
        f.name.toLowerCase().includes(fileSearchQuery.toLowerCase())
    );

    const selectedFolder = folders.find(f => f.id === selectedFolderId);

    return (
        <>
            {/* Folder Modal (2-Step) */}
            {showFolderModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FolderOpen className="w-6 h-6 text-yellow-600" />
                                <div>
                                    <h3 className="text-lg font-semibold">Tambah Folder Meca Aid</h3>
                                    <p className="text-sm text-gray-500">
                                        Step {folderStep}/2: {folderStep === 1 ? 'Pilih Folder Drive' : 'Detail Folder'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowFolderModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            {folderStep === 1 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-gray-600">Pilih folder dari Google Drive:</p>
                                        <button
                                            onClick={() => openDriveFolder('meca_aid', 'content')}
                                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Buka Folder Drive
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Cari folder..."
                                                value={folderSearchQuery}
                                                onChange={(e) => setFolderSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={loadDriveFolders}
                                            disabled={loadingDriveFolders}
                                            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${loadingDriveFolders ? 'animate-spin' : ''}`} />
                                            Refresh
                                        </button>
                                    </div>

                                    <div className="border rounded-lg max-h-64 overflow-y-auto">
                                        {loadingDriveFolders ? (
                                            <div className="p-8 text-center">
                                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                                            </div>
                                        ) : filteredDriveFolders.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500">
                                                <Folder className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                <p>Tidak ada folder ditemukan</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {filteredDriveFolders.map(folder => (
                                                    <div
                                                        key={folder.id}
                                                        onClick={() => handleDriveFolderSelect(folder)}
                                                        className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-yellow-50 ${selectedDriveFolder?.id === folder.id
                                                            ? 'bg-yellow-50 border-l-4 border-l-yellow-500'
                                                            : ''
                                                            }`}
                                                    >
                                                        <Folder className="w-8 h-8 text-yellow-500" />
                                                        <span className="flex-1 font-medium">{folder.name}</span>
                                                        {selectedDriveFolder?.id === folder.id && (
                                                            <CheckCircle className="w-5 h-5 text-yellow-600" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {selectedDriveFolder && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-yellow-600" />
                                            <div>
                                                <p className="font-medium text-yellow-900">Folder dipilih:</p>
                                                <p className="text-sm text-yellow-700">{selectedDriveFolder.name}</p>
                                            </div>
                                        </div>
                                    )}

                                    {folderError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                            <p className="text-sm text-red-700">{folderError}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {folderStep === 2 && (
                                <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                                        <Folder className="w-8 h-8 text-yellow-500" />
                                        <div>
                                            <p className="font-medium">{selectedDriveFolder.name}</p>
                                            <p className="text-sm text-gray-500">Google Drive Folder</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Nama Folder <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={folderFormData.folder_name}
                                                onChange={(e) => setFolderFormData({ ...folderFormData, folder_name: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <textarea
                                                value={folderFormData.description}
                                                onChange={(e) => setFolderFormData({ ...folderFormData, description: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                                                rows={2}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Order Index</label>
                                            <input
                                                type="number"
                                                value={folderFormData.order_index}
                                                onChange={(e) => setFolderFormData({ ...folderFormData, order_index: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border rounded-lg"
                                                min="0"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="folder_is_active"
                                                checked={folderFormData.is_active}
                                                onChange={(e) => setFolderFormData({ ...folderFormData, is_active: e.target.checked })}
                                                className="w-4 h-4 text-yellow-600 rounded"
                                            />
                                            <label htmlFor="folder_is_active" className="text-sm text-gray-700">Active</label>
                                        </div>
                                    </div>

                                    {folderError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                            <p className="text-sm text-red-700">{folderError}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-between">
                            {folderStep === 1 ? (
                                <>
                                    <button onClick={() => setShowFolderModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg">
                                        Batal
                                    </button>
                                    <button
                                        onClick={proceedToFolderStep2}
                                        disabled={!selectedDriveFolder}
                                        className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 flex items-center gap-2"
                                    >
                                        Lanjut <Check className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setFolderStep(1)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg">
                                        ← Kembali
                                    </button>
                                    <button
                                        onClick={handleSaveFolder}
                                        disabled={savingFolder || !folderFormData.folder_name}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
                                    >
                                        {savingFolder ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Simpan Folder
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* File Modal (2-Step) */}
            {showFileModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <File className="w-6 h-6 text-purple-600" />
                                <div>
                                    <h3 className="text-lg font-semibold">Tambah File ke "{selectedFolder?.folder_name}"</h3>
                                    <p className="text-sm text-gray-500">
                                        Step {fileStep}/2: {fileStep === 1 ? 'Pilih File' : 'Preview & Simpan'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowFileModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            {fileStep === 1 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-gray-600">Pilih file dari Google Drive:</p>
                                        <button
                                            onClick={() => openDriveFolder('meca_aid', 'content')}
                                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Buka Folder Drive
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Cari file..."
                                                value={fileSearchQuery}
                                                onChange={(e) => setFileSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={loadDriveFilesForFolder}
                                            disabled={loadingDriveFiles}
                                            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${loadingDriveFiles ? 'animate-spin' : ''}`} />
                                            Refresh
                                        </button>
                                    </div>

                                    <div className="border rounded-lg max-h-80 overflow-y-auto">
                                        {loadingDriveFiles ? (
                                            <div className="p-8 text-center">
                                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                                            </div>
                                        ) : filteredDriveFiles.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500">
                                                <File className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                <p>Tidak ada file ditemukan</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
                                                {filteredDriveFiles.map(file => (
                                                    <div
                                                        key={file.id}
                                                        onClick={() => handleDriveFileSelect(file)}
                                                        className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50 ${selectedDriveFile?.id === file.id
                                                            ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                                                            : 'border-gray-200'
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                                {getFileIcon(file)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{file.name}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {file.size && formatFileSize(parseInt(file.size))}
                                                                </p>
                                                            </div>
                                                            {selectedDriveFile?.id === file.id && (
                                                                <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {selectedDriveFile && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-purple-600" />
                                            <div className="flex-1">
                                                <p className="font-medium text-purple-900">File dipilih:</p>
                                                <p className="text-sm text-purple-700">{selectedDriveFile.name}</p>
                                            </div>
                                        </div>
                                    )}

                                    {fileError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                            <p className="text-sm text-red-700">{fileError}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {fileStep === 2 && (
                                <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                                        {getFileIcon(selectedDriveFile)}
                                        <div>
                                            <p className="font-medium">{selectedDriveFile.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {selectedDriveFile.size && formatFileSize(parseInt(selectedDriveFile.size))}
                                            </p>
                                        </div>
                                        <a
                                            href={`https://drive.google.com/file/d/${selectedDriveFile.id}/view`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-auto text-blue-600 hover:underline flex items-center gap-1 text-sm"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Preview
                                        </a>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Title <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={fileFormData.title}
                                                onChange={(e) => setFileFormData({ ...fileFormData, title: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <textarea
                                                value={fileFormData.description}
                                                onChange={(e) => setFileFormData({ ...fileFormData, description: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                                rows={2}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">File Type</label>
                                            <select
                                                value={fileFormData.file_type}
                                                onChange={(e) => setFileFormData({ ...fileFormData, file_type: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg"
                                            >
                                                <option value="pdf">PDF</option>
                                                <option value="mp4">Video (MP4)</option>
                                                <option value="image">Image</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (menit)</label>
                                            <input
                                                type="number"
                                                value={fileFormData.duration_minutes}
                                                onChange={(e) => setFileFormData({ ...fileFormData, duration_minutes: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg"
                                                min="1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Order Index</label>
                                            <input
                                                type="number"
                                                value={fileFormData.order_index}
                                                onChange={(e) => setFileFormData({ ...fileFormData, order_index: parseInt(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border rounded-lg"
                                                min="0"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="file_is_active"
                                                checked={fileFormData.is_active}
                                                onChange={(e) => setFileFormData({ ...fileFormData, is_active: e.target.checked })}
                                                className="w-4 h-4 text-purple-600 rounded"
                                            />
                                            <label htmlFor="file_is_active" className="text-sm text-gray-700">Active</label>
                                        </div>
                                    </div>

                                    {/* Thumbnail Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Thumbnail (Opsional)
                                        </label>
                                        <div className="border rounded-lg max-h-32 overflow-y-auto">
                                            {thumbnailFiles.length === 0 ? (
                                                <p className="p-4 text-center text-gray-500 text-sm">Tidak ada thumbnail</p>
                                            ) : (
                                                <div className="grid grid-cols-6 gap-2 p-2">
                                                    {thumbnailFiles.map(file => (
                                                        <div
                                                            key={file.id}
                                                            onClick={() => handleThumbnailSelect(file)}
                                                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${selectedThumbnail?.id === file.id
                                                                ? 'border-purple-500 ring-2 ring-purple-200'
                                                                : 'border-transparent hover:border-gray-300'
                                                                }`}
                                                        >
                                                            <img
                                                                src={getThumbnailUrl(file.id, 100)}
                                                                alt={file.name}
                                                                className="w-full h-12 object-cover"
                                                            />
                                                            {selectedThumbnail?.id === file.id && (
                                                                <div className="absolute top-1 right-1">
                                                                    <CheckCircle className="w-3 h-3 text-purple-600 bg-white rounded-full" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {fileError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                            <p className="text-sm text-red-700">{fileError}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-between">
                            {fileStep === 1 ? (
                                <>
                                    <button onClick={() => setShowFileModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg">
                                        Batal
                                    </button>
                                    <button
                                        onClick={proceedToFileStep2}
                                        disabled={!selectedDriveFile}
                                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 flex items-center gap-2"
                                    >
                                        Lanjut <Check className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setFileStep(1)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg">
                                        ← Kembali
                                    </button>
                                    <button
                                        onClick={handleSaveFile}
                                        disabled={savingFile || !fileFormData.title}
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
                                    >
                                        {savingFile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Simpan File
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Meca Aid Management</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => openDriveFolder('meca_aid', 'content')}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        <ExternalLink className="w-5 h-5" />
                        Buka Folder Drive
                    </button>
                    <button
                        onClick={openFolderModal}
                        className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
                    >
                        <FolderOpen className="w-5 h-5" />
                        Add Folder
                    </button>
                </div>
            </div>

            {/* Main Content - 2 Column Layout */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-6">
                    {/* Folders Sidebar */}
                    <div className="col-span-1 bg-gray-50 rounded-xl p-4">
                        <h3 className="font-semibold text-gray-800 mb-4">Folders</h3>
                        {folders.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">Belum ada folder</p>
                        ) : (
                            <div className="space-y-2">
                                {folders.map(folder => (
                                    <div
                                        key={folder.id}
                                        onClick={() => setSelectedFolderId(folder.id)}
                                        className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-2 ${selectedFolderId === folder.id
                                            ? 'bg-purple-100 border-l-4 border-purple-500'
                                            : 'hover:bg-gray-100'
                                            }`}
                                    >
                                        <Folder className={`w-5 h-5 ${selectedFolderId === folder.id ? 'text-purple-600' : 'text-yellow-500'}`} />
                                        <span className="flex-1 text-sm font-medium truncate">{folder.folder_name}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${folder.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {folder.is_active ? 'Active' : 'Off'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Files Content */}
                    <div className="col-span-3">
                        {selectedFolderId ? (
                            <>
                                {/* Folder Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Folder className="w-6 h-6 text-yellow-500" />
                                        <h3 className="text-lg font-semibold">{selectedFolder?.folder_name}</h3>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-500">{files.length} files</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={openFileModal}
                                            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Add File
                                        </button>
                                        <button
                                            onClick={() => handleToggleFolderActive(selectedFolder)}
                                            className={`px-3 py-2 rounded-lg text-sm ${selectedFolder?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                        >
                                            {selectedFolder?.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteFolder(selectedFolderId)}
                                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Files Table */}
                                <div className="bg-white rounded-xl border overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Duration</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {files.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-4 py-12 text-center text-gray-500">
                                                        <File className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                        <p>Belum ada file dalam folder ini</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                files.map(file => (
                                                    <tr key={file.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                {file.thumbnail_gdrive_id ? (
                                                                    <img
                                                                        src={getThumbnailUrl(file.thumbnail_gdrive_id, 100)}
                                                                        className="w-10 h-10 object-cover rounded"
                                                                        alt=""
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                                        {getFileTypeIcon(file.file_type)}
                                                                    </div>
                                                                )}
                                                                <span className="font-medium text-sm">{file.title}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-sm text-gray-600 uppercase">{file.file_type}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {file.duration_minutes ? `${file.duration_minutes} min` : '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => handleToggleFileActive(file)}
                                                                className={`px-2 py-1 text-xs rounded-full ${file.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                                            >
                                                                {file.is_active ? 'Active' : 'Inactive'}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-right space-x-2">
                                                            {file.gdrive_url && (
                                                                <a
                                                                    href={file.gdrive_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-green-600 hover:text-green-800"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteFile(file.id)}
                                                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                <p className="text-lg font-medium">Pilih folder untuk melihat file</p>
                                <p className="text-sm mt-2">Atau tambah folder baru dengan tombol "Add Folder"</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};