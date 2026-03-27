import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import * as XLSX from 'xlsx';
import { Download, Upload, FileSpreadsheet, Users, ChevronRight, ChevronDown, User, School, GraduationCap } from 'lucide-react';


interface UserData {
    id: number;
    username: string;
    grade?: string;
    class_name?: string;
    role: string;
    email?: string;
    phone?: string;
    school?: string;
}

export default function UserManagement() {
    const [activeTab, setActiveTab] = useState<'hierarchy' | 'import'>('hierarchy');
    const [users, setUsers] = useState<UserData[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Import State
    const [result, setResult] = useState<any>(null);
    const [loadingImport, setLoadingImport] = useState(false);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, userId: number, username: string } | null>(null);
    const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: number, username: string } | null>(null);
    const [resetConfirmUser, setResetConfirmUser] = useState<{ id: number, username: string } | null>(null);
    const [importConfirmData, setImportConfirmData] = useState<any[] | null>(null);
    const [successModal, setSuccessModal] = useState<{ title: string, msg: string } | null>(null);
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // Close context menu on click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        if (activeTab === 'hierarchy') {
            loadUsers();
        }
    }, [activeTab]);

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const res = await fetchWithAuth('/users');
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingUsers(false);
        }
    };

    // Hierarchy Logic
    const processUsers = () => {
        const students: Record<string, Record<string, UserData[]>> = {};
        const teachers: UserData[] = [];

        users.forEach(u => {
            if (u.role === 'teacher' || u.role === 'admin') {
                teachers.push(u);
            } else if (u.role === 'student') {
                const grade = u.grade || '未分配年级';
                const className = u.class_name || '未分配班级';

                if (!students[grade]) students[grade] = {};
                if (!students[grade][className]) students[grade][className] = [];

                students[grade][className].push(u);
            }
        });
        return { students, teachers };
    };

    const { students: studentHierarchy, teachers: teacherList } = processUsers();

    // Expanded State
    const [expandedSections, setExpandedSections] = useState<{ teachers: boolean, students: boolean }>({ teachers: true, students: true });
    const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
    const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

    const toggleSection = (section: 'teachers' | 'students') => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const toggleGrade = (grade: string) => {
        setExpandedGrades(prev => ({ ...prev, [grade]: !prev[grade] }));
    };

    const toggleClass = (cls: string) => {
        setExpandedClasses(prev => ({ ...prev, [cls]: !prev[cls] }));
    };

    // --- Import Logic (Keep existing) ---
    const handleDownloadTemplate = () => {
        const templateData = [
            {
                username: "student1",
                password: "123",
                grade: "2024",
                class_name: "1班",
                email: "",
                school: "",
                phone: "",
                role: "学生"
            },
            {
                username: "teacher1",
                password: "123",
                grade: "",
                class_name: "",
                email: "t1@example.com",
                school: "XX中学",
                phone: "13800000000",
                role: "教师"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Users");
        XLSX.writeFile(wb, "user_import_template.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                validateAndImport(data);

                // Reset file input
                e.target.value = '';
            } catch (err) {
                console.error(err);
                setToast({ msg: "文件解析失败，请确保是有效的 Excel 文件", type: 'error' });
            }
        };
        reader.readAsBinaryString(file);
    };

    const validateAndImport = async (users: any[]) => {
        // Validation
        if (!Array.isArray(users) || users.length === 0) {
            alert("文件中没有数据");
            return;
        }

        const errors: string[] = [];
        users.forEach((user, index) => {
            const rowNum = index + 2;
            const role = user.role ? String(user.role).trim() : "学生"; // Default to student

            if (!user.username) errors.push(`第 ${rowNum} 行: 缺少 username`);
            if (!user.password) errors.push(`第 ${rowNum} 行: 缺少 password`);

            if (role === "教师" || role === "teacher") {
                // Teachers don't strictly need grade/class, but maybe check valid role
            } else if (role === "学生" || role === "student") {
                // Students generally need grade/class but user said "Student registration does not need email, phone"
                // User said "Teacher registration does not need grade, class_name"
                // So for student, we don't enforce email/phone.
                // Let's just validate role is recognized
            } else {
                errors.push(`第 ${rowNum} 行: 未知角色 "${role}" (请填 "教师" 或 "学生")`);
            }
        });

        if (errors.length > 0) {
            alert("格式错误：\n" + errors.slice(0, 10).join("\n") + (errors.length > 10 ? "\n..." : ""));
            return;
        }

        // Confirmation
        setImportConfirmData(users);
    };

    const importUsers = async (users: any[]) => {
        setLoadingImport(true);
        setResult(null);
        try {
            // Map Excel columns to API fields if needed (assuming headers match API fields)
            // Ensure strings for all fields
            const formattedUsers = users.map(u => {
                let role = "student";
                const rawRole = u.role ? String(u.role).trim() : "学生";
                if (rawRole === "教师" || rawRole === "teacher") role = "teacher";

                return {
                    username: String(u.username),
                    password: String(u.password), // Plain password
                    grade: u.grade ? String(u.grade) : undefined,
                    class_name: u.class_name ? String(u.class_name) : undefined,
                    email: u.email ? String(u.email) : undefined,
                    school: u.school ? String(u.school) : undefined,
                    phone: u.phone ? String(u.phone) : undefined,
                    role: role
                };
            });

            const res = await fetchWithAuth('/auth/batch-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formattedUsers)
            });

            const data = await res.json();
            setResult(data);
            setSuccessModal({ title: "导入完成", msg: `共导入 ${users.length} 个用户。${data.message}` });
        } catch (error) {
            console.error(error);
            setToast({ msg: "导入请求失败", type: 'error' });
        } finally {
            setLoadingImport(false);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, user: UserData) => {
        e.preventDefault();
        setContextMenu({
            x: e.pageX,
            y: e.pageY,
            userId: user.id,
            username: user.username
        });
    };

    const handleDeleteUser = async () => {
        if (!deleteConfirmUser) return;
        try {
            const res = await fetchWithAuth(`/users/${deleteConfirmUser.id}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== deleteConfirmUser.id));
                setSuccessModal({ title: "删除成功", msg: "用户删除成功，相关数据已清除。" });
            } else {
                setToast({ msg: "删除失败", type: 'error' });
            }
        } catch (e) {
            console.error(e);
            setToast({ msg: "删除出错", type: 'error' });
        } finally {
            setDeleteConfirmUser(null);
        }
    };

    const confirmResetPassword = async () => {
        if (!resetConfirmUser) return;
        try {
            const res = await fetchWithAuth(`/users/${resetConfirmUser.id}/reset-password`, { method: 'POST' });
            if (res.ok) {
                setToast({ msg: "密码重置成功: 123456", type: 'success' });
            } else {
                setToast({ msg: "重置失败", type: 'error' });
            }
        } catch (e) {
            console.error(e);
            setToast({ msg: "重置出错", type: 'error' });
        } finally {
            setResetConfirmUser(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex bg-white rounded-lg shadow overflow-hidden">
                <button
                    className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 ${activeTab === 'hierarchy' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
                    onClick={() => setActiveTab('hierarchy')}
                >
                    <Users size={20} /> 班级与学生管理
                </button>
                <button
                    className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 ${activeTab === 'import' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
                    onClick={() => setActiveTab('import')}
                >
                    <FileSpreadsheet size={20} /> 批量导入
                </button>
            </div>

            {/* Hierarchy View */}
            {activeTab === 'hierarchy' && (
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <School className="text-blue-600" /> 师生名单
                        </h2>
                        <button onClick={loadUsers} className="text-sm text-blue-600 hover:underline">刷新列表</button>
                    </div>

                    {loadingUsers ? (
                        <div className="text-center py-8 text-gray-500">加载中...</div>
                    ) : (
                        <div className="space-y-6">
                            {/* 1. Teachers Section */}
                            <div className="border rounded-lg overflow-hidden border-blue-200">
                                <div
                                    className="bg-blue-50 p-4 flex items-center gap-2 cursor-pointer hover:bg-blue-100 transition-colors"
                                    onClick={() => toggleSection('teachers')}
                                >
                                    {expandedSections.teachers ? <ChevronDown size={20} className="text-blue-700" /> : <ChevronRight size={20} className="text-blue-700" />}
                                    <span className="font-bold text-lg text-blue-800">教师名单</span>
                                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                                        {teacherList.length} 人
                                    </span>
                                </div>

                                {expandedSections.teachers && (
                                    <div className="bg-white p-4">
                                        {teacherList.length === 0 ? (
                                            <div className="text-gray-400 text-sm text-center py-2">暂无教师数据</div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                {teacherList.map(teacher => (
                                                    <div
                                                        key={teacher.id}
                                                        className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200 hover:border-blue-300 transition-colors cursor-context-menu"
                                                        onContextMenu={(e) => handleContextMenu(e, teacher)}
                                                    >
                                                        <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                                                            <GraduationCap size={16} />
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <div className="font-bold text-sm truncate text-gray-800">{teacher.username}</div>
                                                            <div className="text-xs text-gray-500 truncate">{teacher.email || '无邮箱'}</div>
                                                            <div className="text-xs text-orange-500 font-medium">{teacher.role === 'admin' ? '管理员' : '教师'}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 2. Students Section */}
                            <div className="border rounded-lg overflow-hidden border-green-200">
                                <div
                                    className="bg-green-50 p-4 flex items-center gap-2 cursor-pointer hover:bg-green-100 transition-colors"
                                    onClick={() => toggleSection('students')}
                                >
                                    {expandedSections.students ? <ChevronDown size={20} className="text-green-700" /> : <ChevronRight size={20} className="text-green-700" />}
                                    <span className="font-bold text-lg text-green-800">学生名单</span>
                                    <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                        {Object.values(studentHierarchy).reduce((acc, grade) => acc + Object.values(grade).reduce((a, c) => a + c.length, 0), 0)} 人
                                    </span>
                                </div>

                                {expandedSections.students && (
                                    <div className="bg-white p-4 space-y-4">
                                        {Object.keys(studentHierarchy).length === 0 ? (
                                            <div className="text-gray-400 text-sm text-center py-2">暂无学生数据</div>
                                        ) : (
                                            Object.entries(studentHierarchy).map(([grade, classes]) => (
                                                <div key={grade} className="border rounded-lg overflow-hidden">
                                                    <div
                                                        className="bg-gray-100 p-3 flex items-center gap-2 cursor-pointer hover:bg-gray-200 transition-colors"
                                                        onClick={() => toggleGrade(grade)}
                                                    >
                                                        {expandedGrades[grade] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                        <span className="font-bold text-gray-800">{grade}</span>
                                                        <span className="text-xs bg-gray-300 text-gray-700 px-2 py-0.5 rounded-full">
                                                            {Object.values(classes).reduce((acc, curr) => acc + curr.length, 0)} 人
                                                        </span>
                                                    </div>

                                                    {expandedGrades[grade] && (
                                                        <div className="bg-white p-2 space-y-2">
                                                            {Object.entries(classes).map(([className, students]) => (
                                                                <div key={className} className="ml-4 border-l-2 border-green-200 pl-4">
                                                                    <div
                                                                        className="flex items-center gap-2 py-2 cursor-pointer text-gray-700 hover:text-green-600"
                                                                        onClick={() => toggleClass(grade + className)}
                                                                    >
                                                                        {expandedClasses[grade + className] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                        <span className="font-medium">{className}</span>
                                                                        <span className="text-xs text-gray-400">({students.length} 人)</span>
                                                                    </div>

                                                                    {expandedClasses[grade + className] && (
                                                                        <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2 mb-4">
                                                                            {students.map(student => (
                                                                                <div
                                                                                    key={student.id}
                                                                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded border hover:border-green-300 transition-colors cursor-context-menu"
                                                                                    onContextMenu={(e) => handleContextMenu(e, student)}
                                                                                >
                                                                                    <div className="bg-green-100 p-1.5 rounded-full text-green-600">
                                                                                        <User size={14} />
                                                                                    </div>
                                                                                    <div className="overflow-hidden">
                                                                                        <div className="font-medium text-sm truncate">{student.username}</div>
                                                                                        <div className="text-xs text-gray-400 truncate">{student.email || '无邮箱'}</div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {
                activeTab === 'import' && (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <FileSpreadsheet className="text-green-600" /> 用户批量导入 (Excel)
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Step 1: Download Template */}
                            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                                <div className="mb-4 text-blue-600 flex justify-center">
                                    <Download size={48} />
                                </div>
                                <h3 className="font-bold text-lg mb-2">第一步：下载模板</h3>
                                <p className="text-sm text-gray-500 mb-4">下载 Excel 模板文件，按照格式填写用户信息。</p>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="bg-white border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50 font-medium"
                                >
                                    下载 Excel 模板
                                </button>
                            </div>

                            {/* Step 2: Upload */}
                            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative">
                                <div className="mb-4 text-green-600 flex justify-center">
                                    <Upload size={48} />
                                </div>
                                <h3 className="font-bold text-lg mb-2">第二步：上传文件</h3>
                                <p className="text-sm text-gray-500 mb-4">上传填好的 Excel 文件，系统将自动校验格式。</p>

                                <label className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-medium cursor-pointer inline-block">
                                    {loadingImport ? '处理中...' : '选择并上传文件'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".xlsx, .xls"
                                        onChange={handleFileUpload}
                                        disabled={loadingImport}
                                    />
                                </label>
                            </div>
                        </div>

                        {result && (
                            <div className="mt-8">
                                <h3 className="font-bold mb-4 border-l-4 border-blue-500 pl-3">导入结果</h3>

                                <div className="bg-gray-50 p-4 rounded border">
                                    <div className="flex gap-4 mb-2 text-sm">
                                        <span className="font-bold text-green-600">成功消息: {result.message}</span>
                                    </div>

                                    {result.errors && result.errors.length > 0 && (
                                        <div className="mt-2">
                                            <span className="font-bold text-red-600 text-sm block mb-1">错误详情 ({result.errors.length}):</span>
                                            <div className="max-h-40 overflow-y-auto text-xs bg-white p-2 border rounded text-red-500 font-mono">
                                                {result.errors.map((err: string, i: number) => (
                                                    <div key={i}>{err}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Context Menu */}
            {/* Context Menu */}
            {
                contextMenu && (
                    <div
                        className="fixed bg-white border border-gray-200 shadow-xl rounded z-50 text-sm overflow-hidden"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <div
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                            onClick={() => {
                                setResetConfirmUser({ id: contextMenu.userId, username: contextMenu.username });
                                setContextMenu(null);
                            }}
                        >
                            重置密码 (123456)
                        </div>
                        <div
                            className="px-4 py-2 hover:bg-red-50 cursor-pointer text-red-600 border-t border-gray-100"
                            onClick={() => {
                                setDeleteConfirmUser({ id: contextMenu.userId, username: contextMenu.username });
                                setContextMenu(null);
                            }}
                        >
                            删除用户
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                deleteConfirmUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 animate-fade-in-up">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">删除用户确认</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                您确定要删除用户 <span className="font-bold text-red-600">{deleteConfirmUser.username}</span> 吗？<br />
                                此操作将删除该用户的所有数据（提交记录、任务等），且<span className="font-bold">无法恢复</span>。
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteConfirmUser(null)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium text-sm"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium text-sm"
                                >
                                    确定删除
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Import Confirmation Modal */}
            {
                importConfirmData && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 animate-fade-in-up">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">导入用户确认</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                解析成功，共 <span className="font-bold text-blue-600">{importConfirmData.length}</span> 个用户。<br />
                                确定要开始导入吗？
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setImportConfirmData(null)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium text-sm"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => {
                                        importUsers(importConfirmData);
                                        setImportConfirmData(null);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm"
                                >
                                    确定导入
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Reset Password Confirmation Modal */}
            {
                resetConfirmUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 animate-fade-in-up">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">重置密码确认</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                您确定要将用户 <span className="font-bold text-blue-600">{resetConfirmUser.username}</span> 的密码重置为 <span className="font-mono bg-gray-100 px-1 rounded">123456</span> 吗？
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setResetConfirmUser(null)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium text-sm"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={confirmResetPassword}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm"
                                >
                                    确定重置
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Success Modal */}
            {successModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 animate-fade-in-up text-center">
                        <div className="mb-4 text-green-500 flex justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">{successModal.title}</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            {successModal.msg}
                        </p>
                        <button
                            onClick={() => setSuccessModal(null)}
                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm"
                        >
                            确定
                        </button>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-lg text-white text-sm font-medium z-[110] animate-fade-in-up ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                    {toast.msg}
                </div>
            )}
        </div >
    );
}
