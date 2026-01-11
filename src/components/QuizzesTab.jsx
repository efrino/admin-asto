import { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Save, X, FileSpreadsheet, Upload, Eye, EyeOff,
    Clock, Award, HelpCircle, CheckCircle, AlertCircle, FileUp,
    ChevronDown, ChevronUp, RefreshCw, Search, Download, FileText,
    MessageSquare, CheckSquare
} from 'lucide-react';
import { supabase } from '../config/supabase';
import { parseExcelQuiz, downloadQuizTemplate, validateQuestions } from '../utils/excelQuizParser';
import { listDriveFiles, downloadFile } from '../utils/googleDrive';

export const QuizzesTab = ({ onStatsUpdate }) => {
    const [quizzes, setQuizzes] = useState([]);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showQuizForm, setShowQuizForm] = useState(false);
    const [editingQuizId, setEditingQuizId] = useState(null);
    const [expandedQuizId, setExpandedQuizId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [questionsLoading, setQuestionsLoading] = useState(false);

    // Form state
    const [quizFormData, setQuizFormData] = useState({
        title: '',
        description: '',
        quiz_type: 'quiz',
        module_id: '',
        time_limit_minutes: '',
        passing_score: 70,
        max_attempts: '',
        shuffle_questions: false,
        shuffle_options: false,
        show_correct_answers: true,
        is_active: true
    });

    // Excel import state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importStep, setImportStep] = useState(1);
    const [driveFiles, setDriveFiles] = useState([]);
    const [driveLoading, setDriveLoading] = useState(false);
    const [driveSearchQuery, setDriveSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [parsedQuestions, setParsedQuestions] = useState([]);
    const [parseLoading, setParseLoading] = useState(false);
    const [parseError, setParseError] = useState('');
    const [parseWarnings, setParseWarnings] = useState([]);
    const [importQuizData, setImportQuizData] = useState({
        title: '',
        description: '',
        quiz_type: 'certification',
        module_id: '',
        passing_score: 70,
        time_limit_minutes: ''
    });

    useEffect(() => {
        fetchQuizzes();
        fetchModules();
    }, []);

    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('quizzes')
                .select(`
                    *,
                    modules(title)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setQuizzes(data || []);
        } catch (error) {
            console.error('Error fetching quizzes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchModules = async () => {
        try {
            const { data, error } = await supabase
                .from('modules')
                .select('id, title')
                .eq('is_active', true)
                .order('title');

            if (error) throw error;
            setModules(data || []);
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    };

    const fetchQuestions = async (quizId) => {
        setQuestionsLoading(true);
        try {
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('quiz_id', quizId)
                .order('order_index');

            if (error) throw error;
            setQuestions(data || []);
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setQuestionsLoading(false);
        }
    };

    const handleCreateQuiz = async () => {
        try {
            const insertData = {
                ...quizFormData,
                module_id: quizFormData.module_id || null,
                time_limit_minutes: quizFormData.time_limit_minutes ? parseInt(quizFormData.time_limit_minutes) : null,
                max_attempts: quizFormData.max_attempts ? parseInt(quizFormData.max_attempts) : null
            };

            const { data, error } = await supabase
                .from('quizzes')
                .insert([insertData])
                .select();

            if (error) throw error;
            await fetchQuizzes();
            resetQuizForm();
            alert('Quiz berhasil ditambahkan!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menambahkan quiz: ' + error.message);
        }
    };

    const handleUpdateQuiz = async () => {
        try {
            const updateData = {
                ...quizFormData,
                module_id: quizFormData.module_id || null,
                time_limit_minutes: quizFormData.time_limit_minutes ? parseInt(quizFormData.time_limit_minutes) : null,
                max_attempts: quizFormData.max_attempts ? parseInt(quizFormData.max_attempts) : null,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('quizzes')
                .update(updateData)
                .eq('id', editingQuizId);

            if (error) throw error;
            await fetchQuizzes();
            resetQuizForm();
            alert('Quiz berhasil diupdate!');
        } catch (error) {
            alert('Gagal mengupdate quiz: ' + error.message);
        }
    };

    const handleDeleteQuiz = async (id) => {
        if (!confirm('Yakin ingin menghapus quiz ini? Semua soal terkait juga akan dihapus.')) return;

        try {
            // Delete questions first
            await supabase.from('questions').delete().eq('quiz_id', id);

            const { error } = await supabase
                .from('quizzes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchQuizzes();
            alert('Quiz berhasil dihapus!');
            onStatsUpdate?.();
        } catch (error) {
            alert('Gagal menghapus quiz: ' + error.message);
        }
    };

    const startEditQuiz = (quiz) => {
        setEditingQuizId(quiz.id);
        setQuizFormData({
            title: quiz.title,
            description: quiz.description || '',
            quiz_type: quiz.quiz_type,
            module_id: quiz.module_id || '',
            time_limit_minutes: quiz.time_limit_minutes || '',
            passing_score: quiz.passing_score || 70,
            max_attempts: quiz.max_attempts || '',
            shuffle_questions: quiz.shuffle_questions,
            shuffle_options: quiz.shuffle_options,
            show_correct_answers: quiz.show_correct_answers,
            is_active: quiz.is_active
        });
        setShowQuizForm(true);
    };

    const resetQuizForm = () => {
        setQuizFormData({
            title: '',
            description: '',
            quiz_type: 'quiz',
            module_id: '',
            time_limit_minutes: '',
            passing_score: 70,
            max_attempts: '',
            shuffle_questions: false,
            shuffle_options: false,
            show_correct_answers: true,
            is_active: true
        });
        setEditingQuizId(null);
        setShowQuizForm(false);
    };

    const toggleExpandQuiz = async (quizId) => {
        if (expandedQuizId === quizId) {
            setExpandedQuizId(null);
            setQuestions([]);
        } else {
            setExpandedQuizId(quizId);
            await fetchQuestions(quizId);
        }
    };

    // ============ Excel Import Functions ============

    const openImportModal = () => {
        setShowImportModal(true);
        setImportStep(1);
        setSelectedFile(null);
        setParsedQuestions([]);
        setParseError('');
        setParseWarnings([]);
        loadDriveFiles();
    };

    const loadDriveFiles = async () => {
        setDriveLoading(true);
        try {
            const result = await listDriveFiles('quiz', 'content');
            if (result.success) {
                // Filter for Excel files
                const excelFiles = result.data.filter(f =>
                    f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
                );
                setDriveFiles(excelFiles);
            } else {
                console.error('Failed to load drive files:', result.error);
            }
        } catch (error) {
            console.error('Error loading drive files:', error);
        } finally {
            setDriveLoading(false);
        }
    };

    const handleFileSelect = (file) => {
        setSelectedFile(file);
        setImportQuizData(prev => ({
            ...prev,
            title: file.name.replace(/\.(xlsx?|xls)$/i, '')
        }));
    };

    const handleParseFile = async () => {
        if (!selectedFile) return;

        setParseLoading(true);
        setParseError('');
        setParseWarnings([]);

        try {
            // Download file via Edge Function
            const arrayBuffer = await downloadFile(selectedFile.id);

            // Parse Excel document
            const result = parseExcelQuiz(arrayBuffer);

            if (!result.success) {
                throw new Error(result.error);
            }

            if (result.questions.length === 0) {
                throw new Error('Tidak ada soal yang ditemukan dalam file Excel. Pastikan format sesuai template.');
            }

            // Validate questions
            const validation = validateQuestions(result.questions);
            if (validation.warnings.length > 0) {
                setParseWarnings(validation.warnings);
            }

            if (!validation.isValid) {
                setParseError(`Validasi gagal:\n${validation.errors.join('\n')}`);
            }

            setParsedQuestions(result.questions);
            setImportStep(2);
        } catch (error) {
            console.error('Parse error:', error);
            setParseError(error.message);
        } finally {
            setParseLoading(false);
        }
    };

    const handleLocalFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.match(/\.(xlsx?|xls)$/i)) {
            setParseError('File harus berformat Excel (.xlsx atau .xls)');
            return;
        }

        setParseLoading(true);
        setParseError('');
        setParseWarnings([]);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = parseExcelQuiz(arrayBuffer);

            if (!result.success) {
                throw new Error(result.error);
            }

            if (result.questions.length === 0) {
                throw new Error('Tidak ada soal yang ditemukan dalam file Excel.');
            }

            // Validate
            const validation = validateQuestions(result.questions);
            if (validation.warnings.length > 0) {
                setParseWarnings(validation.warnings);
            }

            setSelectedFile({ name: file.name, id: null, isLocal: true });
            setImportQuizData(prev => ({
                ...prev,
                title: file.name.replace(/\.(xlsx?|xls)$/i, '')
            }));
            setParsedQuestions(result.questions);
            setImportStep(2);
        } catch (error) {
            console.error('Parse error:', error);
            setParseError(error.message);
        } finally {
            setParseLoading(false);
        }
    };

    const handleUpdateParsedQuestion = (index, field, value) => {
        setParsedQuestions(prev => {
            const updated = [...prev];
            if (field === 'options') {
                updated[index].options = value;
            } else {
                updated[index][field] = value;
            }
            return updated;
        });
    };

    const handleRemoveParsedQuestion = (index) => {
        setParsedQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const handleImportQuestions = async () => {
        if (parsedQuestions.length === 0) {
            alert('Tidak ada soal untuk diimport');
            return;
        }

        setParseLoading(true);

        try {
            // 1. Create quiz first
            const quizInsert = {
                title: importQuizData.title,
                description: importQuizData.description,
                quiz_type: importQuizData.quiz_type,
                module_id: importQuizData.module_id || null,
                passing_score: importQuizData.passing_score,
                time_limit_minutes: importQuizData.time_limit_minutes ? parseInt(importQuizData.time_limit_minutes) : null,
                source_gdrive_id: selectedFile?.id || null,
                source_gdrive_name: selectedFile?.name || null,
                total_questions: parsedQuestions.length,
                is_active: true
            };

            const { data: quizData, error: quizError } = await supabase
                .from('quizzes')
                .insert([quizInsert])
                .select()
                .single();

            if (quizError) throw quizError;

            // 2. Insert all questions
            const questionsInsert = parsedQuestions.map((q, index) => ({
                quiz_id: quizData.id,
                module_id: importQuizData.module_id || null,
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options,
                correct_answer: q.correct_answer,
                explanation: q.explanation || null,
                points: q.points || (q.question_type === 'essay' ? 20 : 10),
                order_index: index + 1,
                is_active: true
            }));

            const { error: questionsError } = await supabase
                .from('questions')
                .insert(questionsInsert);

            if (questionsError) throw questionsError;

            // Count by type
            const mcCount = parsedQuestions.filter(q => q.question_type === 'multiple_choice').length;
            const essayCount = parsedQuestions.filter(q => q.question_type === 'essay').length;

            alert(`Berhasil import ${parsedQuestions.length} soal ke quiz "${importQuizData.title}"!\n\n• Pilihan Ganda: ${mcCount}\n• Uraian: ${essayCount}`);
            setShowImportModal(false);
            await fetchQuizzes();
            onStatsUpdate?.();
        } catch (error) {
            console.error('Import error:', error);
            alert('Gagal import: ' + error.message);
        } finally {
            setParseLoading(false);
        }
    };

    // Filter drive files by search query
    const filteredDriveFiles = driveFiles.filter(f =>
        f.name.toLowerCase().includes(driveSearchQuery.toLowerCase())
    );

    // Get quiz type badge color
    const getQuizTypeBadge = (type) => {
        const badges = {
            quiz: 'bg-blue-100 text-blue-800',
            certification: 'bg-purple-100 text-purple-800',
            practice_test: 'bg-green-100 text-green-800'
        };
        return badges[type] || badges.quiz;
    };

    const getQuizTypeLabel = (type) => {
        const labels = {
            quiz: 'Quiz',
            certification: 'Sertifikasi',
            practice_test: 'Latihan'
        };
        return labels[type] || type;
    };

    // Calculate totals
    const mcQuestions = parsedQuestions.filter(q => q.question_type === 'multiple_choice');
    const essayQuestions = parsedQuestions.filter(q => q.question_type === 'essay');
    const totalPoints = parsedQuestions.reduce((sum, q) => sum + (q.points || 0), 0);

    return (
        <>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Quiz / Sertifikasi</h2>
                <div className="flex gap-2">
                    <button
                        onClick={downloadQuizTemplate}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        title="Download template Excel untuk import soal"
                    >
                        <Download className="w-5 h-5" />
                        Template Excel
                    </button>
                    <button
                        onClick={openImportModal}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                        Import Excel
                    </button>
                    <button
                        onClick={() => setShowQuizForm(!showQuizForm)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {showQuizForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {showQuizForm ? 'Batal' : 'Tambah Quiz'}
                    </button>
                </div>
            </div>

            {/* Quiz Form */}
            {showQuizForm && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                        {editingQuizId ? 'Edit Quiz' : 'Tambah Quiz Baru'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Judul Quiz *</label>
                            <input
                                type="text"
                                value={quizFormData.title}
                                onChange={(e) => setQuizFormData({ ...quizFormData, title: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Judul Quiz"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                            <textarea
                                value={quizFormData.description}
                                onChange={(e) => setQuizFormData({ ...quizFormData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows={2}
                                placeholder="Deskripsi quiz (opsional)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                            <select
                                value={quizFormData.quiz_type}
                                onChange={(e) => setQuizFormData({ ...quizFormData, quiz_type: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="quiz">Quiz</option>
                                <option value="certification">Sertifikasi</option>
                                <option value="practice_test">Latihan</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Modul Terkait</label>
                            <select
                                value={quizFormData.module_id}
                                onChange={(e) => setQuizFormData({ ...quizFormData, module_id: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Tidak terkait modul --</option>
                                {modules.map(m => (
                                    <option key={m.id} value={m.id}>{m.title}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Batas Waktu (menit)</label>
                            <input
                                type="number"
                                value={quizFormData.time_limit_minutes}
                                onChange={(e) => setQuizFormData({ ...quizFormData, time_limit_minutes: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Kosongkan jika tidak ada batas"
                                min="1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nilai Lulus (%)</label>
                            <input
                                type="number"
                                value={quizFormData.passing_score}
                                onChange={(e) => setQuizFormData({ ...quizFormData, passing_score: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                min="0"
                                max="100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Maks. Percobaan</label>
                            <input
                                type="number"
                                value={quizFormData.max_attempts}
                                onChange={(e) => setQuizFormData({ ...quizFormData, max_attempts: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Kosongkan = unlimited"
                                min="1"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={quizFormData.is_active}
                                onChange={(e) => setQuizFormData({ ...quizFormData, is_active: e.target.checked })}
                                className="w-4 h-4 text-blue-600"
                            />
                            <label htmlFor="is_active" className="text-sm text-gray-700">Aktif</label>
                        </div>

                        <div className="col-span-2 flex gap-4 border-t pt-4 mt-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={quizFormData.shuffle_questions}
                                    onChange={(e) => setQuizFormData({ ...quizFormData, shuffle_questions: e.target.checked })}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">Acak urutan soal</span>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={quizFormData.shuffle_options}
                                    onChange={(e) => setQuizFormData({ ...quizFormData, shuffle_options: e.target.checked })}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">Acak pilihan jawaban</span>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={quizFormData.show_correct_answers}
                                    onChange={(e) => setQuizFormData({ ...quizFormData, show_correct_answers: e.target.checked })}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">Tampilkan jawaban benar setelah selesai</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={editingQuizId ? handleUpdateQuiz : handleCreateQuiz}
                            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Save className="w-5 h-5" />
                            {editingQuizId ? 'Update' : 'Simpan'}
                        </button>
                        <button
                            onClick={resetQuizForm}
                            className="flex items-center gap-2 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <X className="w-5 h-5" />
                            Batal
                        </button>
                    </div>
                </div>
            )}

            {/* Quizzes List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 mt-4">Memuat quizzes...</p>
                </div>
            ) : quizzes.length === 0 ? (
                <div className="text-center py-12">
                    <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-600">Belum ada quiz</p>
                    <p className="text-sm text-gray-500 mt-2">Klik &quot;Tambah Quiz&quot; atau &quot;Import Excel&quot; untuk memulai</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {quizzes.map((quiz) => (
                        <div key={quiz.id} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                            {/* Quiz Header */}
                            <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-4 flex-1">
                                    <button
                                        onClick={() => toggleExpandQuiz(quiz.id)}
                                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        {expandedQuizId === quiz.id ? (
                                            <ChevronUp className="w-5 h-5" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5" />
                                        )}
                                    </button>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-800">{quiz.title}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full ${getQuizTypeBadge(quiz.quiz_type)}`}>
                                                {getQuizTypeLabel(quiz.quiz_type)}
                                            </span>
                                            {!quiz.is_active && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                                                    Nonaktif
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                            {quiz.modules && (
                                                <span className="flex items-center gap-1">
                                                    <FileText className="w-4 h-4" />
                                                    {quiz.modules.title}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <HelpCircle className="w-4 h-4" />
                                                {quiz.total_questions || 0} soal
                                            </span>
                                            {quiz.time_limit_minutes && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {quiz.time_limit_minutes} menit
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Award className="w-4 h-4" />
                                                Lulus: {quiz.passing_score}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => startEditQuiz(quiz)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit Quiz"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteQuiz(quiz.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Hapus Quiz"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Questions */}
                            {expandedQuizId === quiz.id && (
                                <div className="border-t bg-gray-50 p-4">
                                    {questionsLoading ? (
                                        <div className="text-center py-4">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                                        </div>
                                    ) : questions.length === 0 ? (
                                        <p className="text-center text-gray-500 py-4">Belum ada soal dalam quiz ini</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {questions.map((q, idx) => (
                                                <div key={q.id} className="bg-white rounded-lg p-4 border">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                                                #{idx + 1}
                                                            </span>
                                                            <span className={`text-xs px-2 py-0.5 rounded ${q.question_type === 'essay'
                                                                    ? 'bg-orange-100 text-orange-700'
                                                                    : 'bg-green-100 text-green-700'
                                                                }`}>
                                                                {q.question_type === 'essay' ? 'Uraian' : 'PG'}
                                                            </span>
                                                            <span className="text-xs text-gray-500">{q.points} poin</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-gray-800 mb-2">{q.question_text}</p>

                                                            {q.question_type === 'multiple_choice' && q.options && (
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {Object.entries(q.options).map(([key, value]) => (
                                                                        <div
                                                                            key={key}
                                                                            className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${key === q.correct_answer
                                                                                    ? 'bg-green-100 border border-green-300'
                                                                                    : 'bg-gray-50 border border-gray-200'
                                                                                }`}
                                                                        >
                                                                            <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-medium ${key === q.correct_answer
                                                                                    ? 'bg-green-500 text-white'
                                                                                    : 'bg-gray-300 text-gray-700'
                                                                                }`}>
                                                                                {key}
                                                                            </span>
                                                                            <span className={key === q.correct_answer ? 'font-medium' : ''}>
                                                                                {value}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {q.question_type === 'essay' && q.correct_answer && (
                                                                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                                    <p className="text-xs font-medium text-yellow-800 mb-1">Kunci Jawaban (untuk admin):</p>
                                                                    <p className="text-sm text-yellow-900">{q.correct_answer}</p>
                                                                </div>
                                                            )}

                                                            {q.explanation && (
                                                                <p className="text-xs text-gray-500 mt-2 italic">
                                                                    💡 {q.explanation}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="w-6 h-6 text-green-600" />
                                <div>
                                    <h3 className="text-lg font-semibold">Import Soal dari Excel</h3>
                                    <p className="text-sm text-gray-500">
                                        Step {importStep}/2: {importStep === 1 ? 'Pilih File' : 'Preview & Import'}
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
                                    {/* Download Template Button */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <Download className="w-5 h-5 text-blue-600 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="font-medium text-blue-900">Download Template Dulu!</p>
                                                <p className="text-sm text-blue-700 mt-1">
                                                    Gunakan template kami untuk memastikan format yang benar.
                                                    Template mendukung soal Pilihan Ganda dan Uraian.
                                                </p>
                                                <button
                                                    onClick={downloadQuizTemplate}
                                                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Download Template Excel
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Local Upload */}
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={handleLocalFileUpload}
                                            className="hidden"
                                            id="excel-upload"
                                            disabled={parseLoading}
                                        />
                                        <label htmlFor="excel-upload" className="cursor-pointer">
                                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-600 font-medium">Upload File Excel</p>
                                            <p className="text-sm text-gray-500 mt-1">Klik atau drag file .xlsx / .xls</p>
                                        </label>
                                    </div>

                                    {/* Or Drive Files */}
                                    <div className="border-t pt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium text-gray-700">Atau pilih dari Google Drive:</h4>
                                            <button
                                                onClick={loadDriveFiles}
                                                disabled={driveLoading}
                                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${driveLoading ? 'animate-spin' : ''}`} />
                                                Refresh
                                            </button>
                                        </div>

                                        <div className="relative mb-3">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Cari file..."
                                                value={driveSearchQuery}
                                                onChange={(e) => setDriveSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
                                            />
                                        </div>

                                        <div className="max-h-48 overflow-y-auto border rounded-lg">
                                            {driveLoading ? (
                                                <div className="p-4 text-center">
                                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                                                </div>
                                            ) : filteredDriveFiles.length === 0 ? (
                                                <p className="p-4 text-center text-gray-500 text-sm">
                                                    Tidak ada file Excel di folder Quiz
                                                </p>
                                            ) : (
                                                filteredDriveFiles.map(file => (
                                                    <div
                                                        key={file.id}
                                                        onClick={() => handleFileSelect(file)}
                                                        className={`p-3 flex items-center gap-3 cursor-pointer border-b last:border-b-0 hover:bg-gray-50 ${selectedFile?.id === file.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                                            }`}
                                                    >
                                                        <FileSpreadsheet className="w-8 h-8 text-green-600" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">{file.name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {file.modifiedTime && new Date(file.modifiedTime).toLocaleDateString('id-ID')}
                                                            </p>
                                                        </div>
                                                        {selectedFile?.id === file.id && (
                                                            <CheckCircle className="w-5 h-5 text-blue-600" />
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {parseError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-700 whitespace-pre-line">{parseError}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {importStep === 2 && (
                                <div className="space-y-4">
                                    {/* Quiz Metadata */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h4 className="font-medium mb-3">Informasi Quiz</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">Judul Quiz *</label>
                                                <input
                                                    type="text"
                                                    value={importQuizData.title}
                                                    onChange={(e) => setImportQuizData({ ...importQuizData, title: e.target.value })}
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">Tipe</label>
                                                <select
                                                    value={importQuizData.quiz_type}
                                                    onChange={(e) => setImportQuizData({ ...importQuizData, quiz_type: e.target.value })}
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                >
                                                    <option value="quiz">Quiz</option>
                                                    <option value="certification">Sertifikasi</option>
                                                    <option value="practice_test">Latihan</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">Modul Terkait</label>
                                                <select
                                                    value={importQuizData.module_id}
                                                    onChange={(e) => setImportQuizData({ ...importQuizData, module_id: e.target.value })}
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                >
                                                    <option value="">-- Standalone --</option>
                                                    {modules.map(m => (
                                                        <option key={m.id} value={m.id}>{m.title}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">Nilai Lulus (%)</label>
                                                <input
                                                    type="number"
                                                    value={importQuizData.passing_score}
                                                    onChange={(e) => setImportQuizData({ ...importQuizData, passing_score: parseInt(e.target.value) || 70 })}
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                    min="0"
                                                    max="100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">Batas Waktu (menit)</label>
                                                <input
                                                    type="number"
                                                    value={importQuizData.time_limit_minutes}
                                                    onChange={(e) => setImportQuizData({ ...importQuizData, time_limit_minutes: e.target.value })}
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                    placeholder="Kosongkan = tidak ada batas"
                                                    min="1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">Deskripsi</label>
                                                <input
                                                    type="text"
                                                    value={importQuizData.description}
                                                    onChange={(e) => setImportQuizData({ ...importQuizData, description: e.target.value })}
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                    placeholder="Deskripsi quiz (opsional)"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                                            <p className="text-2xl font-bold text-blue-700">{parsedQuestions.length}</p>
                                            <p className="text-xs text-blue-600">Total Soal</p>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <CheckSquare className="w-4 h-4 text-green-600" />
                                                <p className="text-2xl font-bold text-green-700">{mcQuestions.length}</p>
                                            </div>
                                            <p className="text-xs text-green-600">Pilihan Ganda</p>
                                        </div>
                                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <MessageSquare className="w-4 h-4 text-orange-600" />
                                                <p className="text-2xl font-bold text-orange-700">{essayQuestions.length}</p>
                                            </div>
                                            <p className="text-xs text-orange-600">Uraian</p>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-3 text-center">
                                            <p className="text-2xl font-bold text-purple-700">{totalPoints}</p>
                                            <p className="text-xs text-purple-600">Total Poin</p>
                                        </div>
                                    </div>

                                    {/* Warnings */}
                                    {parseWarnings.length > 0 && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                            <p className="font-medium text-yellow-800 text-sm mb-1">⚠️ Peringatan:</p>
                                            <ul className="text-xs text-yellow-700 list-disc list-inside">
                                                {parseWarnings.slice(0, 5).map((w, i) => (
                                                    <li key={i}>{w}</li>
                                                ))}
                                                {parseWarnings.length > 5 && (
                                                    <li>...dan {parseWarnings.length - 5} peringatan lainnya</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Questions Preview */}
                                    <div>
                                        <h4 className="font-medium mb-3">Preview Soal</h4>
                                        <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {parsedQuestions.map((q, idx) => (
                                                <div key={idx} className={`border rounded-lg p-3 ${q.question_type === 'essay' ? 'bg-orange-50 border-orange-200' : 'bg-white'
                                                    }`}>
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                                                #{idx + 1}
                                                            </span>
                                                            <span className={`text-xs px-2 py-1 rounded ${q.question_type === 'essay'
                                                                    ? 'bg-orange-100 text-orange-700'
                                                                    : 'bg-green-100 text-green-700'
                                                                }`}>
                                                                {q.question_type === 'essay' ? '📝 Uraian' : '☑️ Pilihan Ganda'}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {q.points} poin
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveParsedQuestion(idx)}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <textarea
                                                        value={q.question_text}
                                                        onChange={(e) => handleUpdateParsedQuestion(idx, 'question_text', e.target.value)}
                                                        className="w-full px-3 py-2 border rounded mb-2 text-sm"
                                                        rows={2}
                                                    />

                                                    {q.question_type === 'multiple_choice' && q.options && (
                                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                                            {Object.entries(q.options).map(([key, value]) => (
                                                                <div key={key} className="flex items-center gap-2">
                                                                    <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-medium ${key === q.correct_answer
                                                                            ? 'bg-green-500 text-white'
                                                                            : 'bg-gray-200 text-gray-700'
                                                                        }`}>
                                                                        {key}
                                                                    </span>
                                                                    <input
                                                                        type="text"
                                                                        value={value}
                                                                        onChange={(e) => {
                                                                            const newOptions = { ...q.options, [key]: e.target.value };
                                                                            handleUpdateParsedQuestion(idx, 'options', newOptions);
                                                                        }}
                                                                        className="flex-1 px-2 py-1 border rounded text-sm"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {q.question_type === 'multiple_choice' && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500">Jawaban Benar:</span>
                                                            <select
                                                                value={q.correct_answer}
                                                                onChange={(e) => handleUpdateParsedQuestion(idx, 'correct_answer', e.target.value)}
                                                                className="px-2 py-1 border rounded text-sm"
                                                            >
                                                                {q.options && Object.keys(q.options).map(key => (
                                                                    <option key={key} value={key}>{key}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {q.question_type === 'essay' && (
                                                        <div className="mt-2">
                                                            <label className="text-xs text-gray-500">Kunci Jawaban (untuk koreksi admin):</label>
                                                            <textarea
                                                                value={q.correct_answer || ''}
                                                                onChange={(e) => handleUpdateParsedQuestion(idx, 'correct_answer', e.target.value)}
                                                                className="w-full px-2 py-1 border rounded text-sm mt-1"
                                                                rows={2}
                                                                placeholder="Kunci jawaban untuk referensi admin saat mengoreksi..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Essay Note */}
                                    {essayQuestions.length > 0 && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                                            <MessageSquare className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-orange-700">
                                                <p className="font-medium">Catatan Soal Uraian:</p>
                                                <p>Soal uraian ({essayQuestions.length} soal) memerlukan koreksi manual oleh admin.
                                                    Kunci jawaban yang diinput hanya sebagai referensi untuk admin saat mengoreksi.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t flex justify-between">
                            <button
                                onClick={() => {
                                    if (importStep > 1) {
                                        setImportStep(importStep - 1);
                                    } else {
                                        setShowImportModal(false);
                                    }
                                }}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                {importStep === 1 ? 'Batal' : 'Kembali'}
                            </button>

                            {importStep === 1 && selectedFile && (
                                <button
                                    onClick={handleParseFile}
                                    disabled={!selectedFile || parseLoading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                                >
                                    {parseLoading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            <FileSpreadsheet className="w-4 h-4" />
                                            Parse Excel
                                        </>
                                    )}
                                </button>
                            )}

                            {importStep === 2 && (
                                <button
                                    onClick={handleImportQuestions}
                                    disabled={parsedQuestions.length === 0 || parseLoading || !importQuizData.title}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                                >
                                    {parseLoading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Import {parsedQuestions.length} Soal
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};