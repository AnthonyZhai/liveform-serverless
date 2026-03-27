import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';


export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [grade, setGrade] = useState('');
    const [className, setClassName] = useState('');
    const [role, setRole] = useState('student');
    const [error, setError] = useState('');
    // Registration disabled
    const [isRegister, setIsRegister] = useState(false);
    const [isBatch, setIsBatch] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleAuth = async () => {
        setLoading(true);
        setError('');

        // Send plain password; backend handles verification against hashed storage
        const passwordToSend = password;

        try {
            if (isRegister) {
                const res = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        password: passwordToSend,
                        role,
                        grade: role === 'student' ? grade : null,
                        class_name: role === 'student' ? className : null
                    })
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.detail || '注册失败');
                }

                alert('注册成功，请登录');
                setIsRegister(false);
                setPassword(''); // Clear password field
            } else {
                const formData = new FormData();
                formData.append('username', username);
                formData.append('password', passwordToSend);

                const res = await fetch(`${API_BASE_URL}/auth/token`, {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) throw new Error('用户名或密码错误');

                const data = await res.json();
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('role', data.role);
                localStorage.setItem('username', username);
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-50 bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-white/50 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    {isRegister ? (isBatch ? '批量注册' : '注册新账号') : '欢迎回来'}
                </h2>

                <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
                    {!isBatch && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                                <input
                                    className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="请输入用户名"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                                <input
                                    type="password"
                                    className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="请输入密码"
                                />
                            </div>

                            {isRegister && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">年级</label>
                                            <input
                                                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                                value={grade}
                                                onChange={e => setGrade(e.target.value)}
                                                placeholder="例如：2024"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">班级</label>
                                            <input
                                                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                                value={className}
                                                onChange={e => setClassName(e.target.value)}
                                                placeholder="例如：1班"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            id="role"
                                            checked={role === 'teacher'}
                                            onChange={e => setRole(e.target.checked ? 'teacher' : 'student')}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="role" className="text-sm text-gray-600">注册为教师账户</label>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {isBatch && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                管理员已为您准备了批量注册通道，请联系管理员获取导入模板，或使用单人注册。
                            </p>
                            <button type="button" onClick={() => setIsBatch(false)} className="text-blue-600 text-sm hover:underline">
                                返回单人注册
                            </button>
                        </div>
                    )}

                    {error && <div className="text-red-500 text-sm mt-4 bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white p-3 rounded-xl mt-6 hover:bg-blue-700 transition-all font-medium shadow-md disabled:opacity-70 flex justify-center items-center"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                处理中...
                            </span>
                        ) : (isRegister ? '立即注册' : '登录')}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    {/* Registration disabled per user request */}
                    {/* 
            {isRegister ? '已有账号？' : '还没有账号？'}
            <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-blue-600 font-medium hover:underline ml-1">
                {isRegister ? '去登录' : '去注册'}
            </button> 
            */}
                </div>
            </div>
        </div>
    );
}
