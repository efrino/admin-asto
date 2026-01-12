// ==================== src/components/ErrorCodesTab.jsx ====================
import { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Save, X, AlertTriangle, Search,
    FileSpreadsheet, Download, Upload, Eye, ChevronDown, ChevronRight,
    RefreshCw, ExternalLink, FolderOpen, Check, AlertCircle
} from 'lucide-react';
import { supabase } from '../config/supabase';
import {
    parseExcelErrorCodes,
    downloadErrorCodeTemplate,
    validateErrorCodes
} from '../utils/excelErrorCodeParser';
import {
    listDriveFiles,
    downloadFile,
    getThumbnailUrl,
    openDriveFolder
} from '../utils/googleDrive';

export const ErrorCodesTab = ({ admin, onStatsUpdate }) => {
    // State
    const [errorCodes, setErrorCodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSeverity, setSelectedSeverity] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);
    const [expandedId, setExpandedId] = useState(null);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        title: '',
        cause: '',
        solution: '',
        error_identification: '',
        symptom: '',
        notes: '',
        machine_type: '',
        serial_number: '',
        severity: 'medium',
        category: '',
        is_active: true
    });

    // Import Modal State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importStep, setImportStep] = useState(1);
    const [importFile, setImportFile] = useState(null);
    const [parsedErrorCodes, setParsedErrorCodes] = useState([]);
    const [parseResult, setParseResult] = useState(null);
    const [importing, setImporting] = useState(false);

    // Drive Files State
    const [driveFiles, setDriveFiles] = useState([]);
    const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
    const [driveSearchQuery, setDriveSearchQuery] = useState('');

    useEffect(() => {
        fetchErrorCodes();
    }, [selectedSeverity, selectedCategory]);

    // ==================== DATA FUNCTIONS ====================

    const fetchErrorCodes = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('error_codes')
                .select('*, users(nrp, full_name)')
                .order('code', { ascending: true });

            if (selectedSeverity !== 'all') {
                query = query.eq('severity', selectedSeverity);
            }

            if (selectedCategory !== 'all') {
                query = query.eq('category', selectedCategory);
            }

            const { data, error } = await query;

            if (error) throw error;
            setErrorCodes(data || []);

            // Extract unique categories
            const uniqueCategories = [...new Set(data?.map(e => e.category).filter(Boolean))];
            setCategories(uniqueCategories);
        } catch (error) {
            console.error('Error fetching error codes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.code || !formData.title || !formData.cause || !formData.solution) {
            alert('Code, Title, Cause, dan Solution wajib diisi!');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('error_codes')
                .insert([{
                    ...formData,
                    created_by: admin?.id || null,
                }])
                .select('*, users(nrp, full_name)');

            if (error) throw error;
            setErrorCodes([data[0], ...errorCodes]);
            resetForm();
            alert('Error code berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            if (error.code === '23505') {
                alert('Error: Kode sudah ada! Gunakan kode unik.');
            } else {
                alert('Gagal menambahkan error code: ' + error.message);
            }
        }
    };

    const handleUpdate = async () => {
        try {
            const { data, error } = await supabase
                .from('error_codes')
                .update({
                    ...formData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingId)
                .select('*, users(nrp, full_name)');

            if (error) throw error;
            setErrorCodes(errorCodes.map(e => e.id === editingId ? data[0] : e));
            resetForm();
            alert('Error code berhasil diupdate!');
        } catch (error) {
            alert('Gagal mengupdate: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus error code ini?')) return;

        try {
            const { error } = await supabase
                .from('error_codes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setErrorCodes(errorCodes.filter(e => e.id !== id));
            alert('Error code berhasil dihapus!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menghapus: ' + error.message);
        }
    };

    const handleToggleActive = async (errorCode) => {
        try {
            const { error } = await supabase
                .from('error_codes')
                .update({ is_active: !errorCode.is_active, updated_at: new Date().toISOString() })
                .eq('id', errorCode.id);

            if (error) throw error;
            setErrorCodes(errorCodes.map(e => e.id === errorCode.id ? { ...e, is_active: !e.is_active } : e));
        } catch (error) {
            alert('Gagal mengubah status: ' + error.message);
        }
    };

    const startEdit = (errorCode) => {
        setEditingId(errorCode.id);
        setFormData({
            code: errorCode.code,
            title: errorCode.title,
            cause: errorCode.cause,
            solution: errorCode.solution,
            error_identification: errorCode.error_identification || '',
            symptom: errorCode.symptom || '',
            notes: errorCode.notes || '',
            machine_type: errorCode.machine_type || '',
            serial_number: errorCode.serial_number || '',
            severity: errorCode.severity || 'medium',
            category: errorCode.category || '',
            is_active: errorCode.is_active
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            code: '',
            title: '',
            cause: '',
            solution: '',
            error_identification: '',
            symptom: '',
            notes: '',
            machine_type: '',
            serial_number: '',
            severity: 'medium',
            category: '',
            is_active: true
        });
        setEditingId(null);
        setShowForm(false);
    };

    // ==================== IMPORT FUNCTIONS ====================

    const openImportModal = () => {
        setShowImportModal(true);
        setImportStep(1);
        setImportFile(null);
        setParsedErrorCodes([]);
        setParseResult(null);
        loadDriveFiles();
    };

    const loadDriveFiles = async () => {
        setLoadingDriveFiles(true);
        try {
            const result = await listDriveFiles('error_code', 'content');
            if (result.success) {
                // Filter for Excel files
                const excelFiles = result.data.filter(f =>
                    f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
                );
                setDriveFiles(excelFiles);
            }
        } catch (error) {
            console.error('Error loading drive files:', error);
        } finally {
            setLoadingDriveFiles(false);
        }
    };

    const handleLocalFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportFile({ name: file.name, source: 'local' });

        try {
            const arrayBuffer = await file.arrayBuffer();
            processExcelFile(arrayBuffer);
        } catch (error) {
            alert('Gagal membaca file: ' + error.message);
        }
    };

    const handleDriveFileSelect = async (file) => {
        setImportFile({ name: file.name, source: 'drive', id: file.id });

        try {
            const arrayBuffer = await downloadFile(file.id);
            processExcelFile(arrayBuffer);
        } catch (error) {
            alert('Gagal mengunduh file dari Drive: ' + error.message);
        }
    };

    const processExcelFile = (arrayBuffer) => {
        const result = parseExcelErrorCodes(arrayBuffer);
        setParseResult(result);

        if (result.success) {
            setParsedErrorCodes(result.errorCodes);
            setImportStep(2);
        } else {
            alert('Gagal memparse file:\n' + result.errors.join('\n'));
        }
    };

    const handleImport = async () => {
        if (parsedErrorCodes.length === 0) {
            alert('Tidak ada error codes untuk diimport!');
            return;
        }

        const validation = validateErrorCodes(parsedErrorCodes);
        if (!validation.valid) {
            alert('Validasi gagal:\n' + validation.errors.join('\n'));
            return;
        }

        setImporting(true);
        try {
            // Prepare data for insert
            const insertData = parsedErrorCodes.map(ec => ({
                code: ec.code,
                title: ec.title,
                cause: ec.cause,
                solution: ec.solution,
                error_identification: ec.error_identification || null,
                symptom: ec.symptom || null,
                notes: ec.notes || null,
                machine_type: ec.machine_type || null,
                serial_number: ec.serial_number || null,
                severity: ec.severity || 'medium',
                category: ec.category || null,
                is_active: true,
                created_by: admin?.id || null,
            }));

            const { data, error } = await supabase
                .from('error_codes')
                .upsert(insertData, { onConflict: 'code' })
                .select('*, users(nrp, full_name)');

            if (error) throw error;

            alert(`Berhasil mengimport ${data.length} error codes!`);
            setShowImportModal(false);
            fetchErrorCodes();
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal mengimport: ' + error.message);
        } finally {
            setImporting(false);
        }
    };

    // ==================== HELPER FUNCTIONS ====================

    const getSeverityBadge = (severity) => {
        const badges = {
            low: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-orange-100 text-orange-800',
            critical: 'bg-red-100 text-red-800',
        };
        return badges[severity] || badges.medium;
    };

    const filteredErrorCodes = errorCodes.filter(ec =>
        ec.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ec.machine_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                                <h3 className="text-lg font-semibold">Import Error Codes dari Excel</h3>
                                <p className="text-sm text-gray-500">
                                    Step {importStep}/2: {importStep === 1 ? 'Pilih File' : 'Preview & Import'}
                                </p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {importStep === 1 ? (
                                <div className="space-y-6">
                                    {/* Download Template */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium text-blue-800">Download Template</h4>
                                                <p className="text-sm text-blue-600">Gunakan template untuk format yang benar</p>
                                            </div>
                                            <button
                                                onClick={downloadErrorCodeTemplate}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                <Download className="w-4 h-4" />
                                                Template Excel
                                            </button>
                                        </div>
                                    </div>

                                    {/* Local Upload */}
                                    <div>
                                        <h4 className="font-medium mb-2">Upload dari Komputer</h4>
                                        <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                                            <p className="text-gray-600">Klik untuk pilih file Excel</p>
                                            <p className="text-sm text-gray-400 mt-1">Format: .xlsx, .xls</p>
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={handleLocalFileSelect}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    {/* Drive Files */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium">Atau pilih dari Google Drive</h4>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={loadDriveFiles}
                                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${loadingDriveFiles ? 'animate-spin' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => openDriveFolder('error_code', 'content')}
                                                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    Buka Folder
                                                </button>
                                            </div>
                                        </div>

                                        <input
                                            type="text"
                                            value={driveSearchQuery}
                                            onChange={(e) => setDriveSearchQuery(e.target.value)}
                                            placeholder="Cari file..."
                                            className="w-full px-4 py-2 border rounded-lg mb-2"
                                        />

                                        {loadingDriveFiles ? (
                                            <div className="text-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            </div>
                                        ) : filteredDriveFiles.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                                <p>Tidak ada file Excel di folder Error Codes</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                                                {filteredDriveFiles.map(file => (
                                                    <button
                                                        key={file.id}
                                                        onClick={() => handleDriveFileSelect(file)}
                                                        className="flex items-center gap-2 p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-500 text-left"
                                                    >
                                                        <FileSpreadsheet className="w-8 h-8 text-green-600 flex-shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">{file.name}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Parse Result Summary */}
                                    {parseResult && (
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-blue-600">{parseResult.total}</p>
                                                <p className="text-sm text-blue-600">Total</p>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-green-600">{parseResult.bySeverity?.low || 0}</p>
                                                <p className="text-sm text-green-600">Low</p>
                                            </div>
                                            <div className="bg-yellow-50 rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-yellow-600">{parseResult.bySeverity?.medium || 0}</p>
                                                <p className="text-sm text-yellow-600">Medium</p>
                                            </div>
                                            <div className="bg-orange-50 rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-orange-600">{parseResult.bySeverity?.high || 0}</p>
                                                <p className="text-sm text-orange-600">High</p>
                                            </div>
                                            <div className="bg-red-50 rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-red-600">{parseResult.bySeverity?.critical || 0}</p>
                                                <p className="text-sm text-red-600">Critical</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Warnings */}
                                    {parseResult?.warnings?.length > 0 && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                            <h4 className="font-medium text-yellow-800 mb-2">Peringatan</h4>
                                            <ul className="text-sm text-yellow-700 space-y-1">
                                                {parseResult.warnings.slice(0, 5).map((w, i) => (
                                                    <li key={i}>• {w}</li>
                                                ))}
                                                {parseResult.warnings.length > 5 && (
                                                    <li>...dan {parseResult.warnings.length - 5} lainnya</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Preview Table */}
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="max-h-96 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-100 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">Code</th>
                                                        <th className="px-3 py-2 text-left">Title</th>
                                                        <th className="px-3 py-2 text-left">Severity</th>
                                                        <th className="px-3 py-2 text-left">Category</th>
                                                        <th className="px-3 py-2 text-left">Machine Type</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {parsedErrorCodes.map((ec, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-3 py-2 font-mono">{ec.code}</td>
                                                            <td className="px-3 py-2">{ec.title}</td>
                                                            <td className="px-3 py-2">
                                                                <span className={`px-2 py-0.5 rounded-full text-xs ${getSeverityBadge(ec.severity)}`}>
                                                                    {ec.severity}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2">{ec.category || '-'}</td>
                                                            <td className="px-3 py-2">{ec.machine_type || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
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
                                {importStep === 2 && (
                                    <button
                                        onClick={handleImport}
                                        disabled={importing || parsedErrorCodes.length === 0}
                                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                                    >
                                        {importing ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Import {parsedErrorCodes.length} Error Codes
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
                <h2 className="text-2xl font-bold text-gray-800">Error Codes Management</h2>
                <div className="flex gap-3">
                    <button
                        onClick={downloadErrorCodeTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        <Download className="w-5 h-5" />
                        Template Excel
                    </button>
                    <button
                        onClick={openImportModal}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        <Upload className="w-5 h-5" />
                        Import Excel
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {showForm ? 'Cancel' : 'Add Error Code'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari kode, judul, atau tipe mesin..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    />
                </div>
                <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="px-4 py-2 border rounded-lg"
                >
                    <option value="all">All Severity</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border rounded-lg"
                >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {editingId ? 'Edit Error Code' : 'Add New Error Code'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Code *</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="BMS 1048624"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Axle load sensor, wheel 1"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Error Identification</label>
                            <textarea
                                value={formData.error_identification}
                                onChange={(e) => setFormData({ ...formData, error_identification: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                rows={2}
                                placeholder="Implausible signal..."
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Cause *</label>
                            <textarea
                                value={formData.cause}
                                onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                rows={4}
                                placeholder="* Fault in the connections.&#10;* Fault in the control module."
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Solution/Action *</label>
                            <textarea
                                value={formData.solution}
                                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                rows={4}
                                placeholder="* Check the connections.&#10;* Check the cable harness."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Symptom</label>
                            <textarea
                                value={formData.symptom}
                                onChange={(e) => setFormData({ ...formData, symptom: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                rows={2}
                                placeholder="The axle load measurement does not work."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                rows={2}
                                placeholder="Additional notes..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Machine Type</label>
                            <input
                                type="text"
                                value={formData.machine_type}
                                onChange={(e) => setFormData({ ...formData, machine_type: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Type G 460 B8x4HZ"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Serial Number</label>
                            <input
                                type="text"
                                value={formData.serial_number}
                                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="9338146"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Severity</label>
                            <select
                                value={formData.severity}
                                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="EBS, Engine, Brakes..."
                            />
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
                    <p className="text-gray-600 mt-4">Loading error codes...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 border-b-2">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase w-8"></th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Code</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Title</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Severity</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Machine Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredErrorCodes.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                        <AlertTriangle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                        <p className="text-lg font-medium">No error codes found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredErrorCodes.map((ec) => (
                                    <>
                                        <tr key={ec.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => setExpandedId(expandedId === ec.id ? null : ec.id)}
                                                    className="p-1 hover:bg-gray-200 rounded"
                                                >
                                                    {expandedId === ec.id ?
                                                        <ChevronDown className="w-4 h-4" /> :
                                                        <ChevronRight className="w-4 h-4" />
                                                    }
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 font-mono text-sm">{ec.code}</td>
                                            <td className="px-4 py-4">{ec.title}</td>
                                            <td className="px-4 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityBadge(ec.severity)}`}>
                                                    {ec.severity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm">{ec.category || '-'}</td>
                                            <td className="px-4 py-4 text-sm">{ec.machine_type || '-'}</td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleToggleActive(ec)}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${ec.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}
                                                >
                                                    {ec.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button
                                                    onClick={() => startEdit(ec)}
                                                    className="text-blue-600 hover:text-blue-800 mr-3"
                                                >
                                                    <Edit2 className="w-4 h-4 inline" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ec.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="w-4 h-4 inline" /> Delete
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Expanded Row */}
                                        {expandedId === ec.id && (
                                            <tr className="bg-gray-50">
                                                <td colSpan="8" className="px-6 py-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {ec.error_identification && (
                                                            <div>
                                                                <h4 className="font-semibold text-sm text-gray-700 mb-1">Error Identification</h4>
                                                                <p className="text-sm whitespace-pre-wrap">{ec.error_identification}</p>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-gray-700 mb-1">Cause</h4>
                                                            <p className="text-sm whitespace-pre-wrap">{ec.cause}</p>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-gray-700 mb-1">Solution/Action</h4>
                                                            <p className="text-sm whitespace-pre-wrap">{ec.solution}</p>
                                                        </div>
                                                        {ec.symptom && (
                                                            <div>
                                                                <h4 className="font-semibold text-sm text-gray-700 mb-1">Symptom</h4>
                                                                <p className="text-sm whitespace-pre-wrap">{ec.symptom}</p>
                                                            </div>
                                                        )}
                                                        {ec.notes && (
                                                            <div>
                                                                <h4 className="font-semibold text-sm text-gray-700 mb-1">Notes</h4>
                                                                <p className="text-sm whitespace-pre-wrap">{ec.notes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredErrorCodes.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                    Showing {filteredErrorCodes.length} of {errorCodes.length} error codes
                </div>
            )}
        </>
    );
};