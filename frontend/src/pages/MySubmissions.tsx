import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import { FileText, Calendar, TrendingUp } from 'lucide-react';

export default function MySubmissions() {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null); // For modal

    useEffect(() => {
        loadSubmissions();
    }, []);

    const loadSubmissions = async () => {
        try {
            const res = await fetchWithAuth('/api/my-submissions');
            if (res.ok) {
                const data = await res.json();
                setSubmissions(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <FileText className="text-blue-600" /> 我的提交记录
            </h1>

            {loading ? <div>Loading...</div> : (
                <div className="grid gap-4">
                    {submissions.length === 0 && <p className="text-gray-500">暂无提交记录</p>}
                    {submissions.map((sub: any) => (
                        <div key={sub.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{sub.task?.title || '未知任务'}</h3>
                                    <div className="flex gap-4 text-sm text-gray-500 mt-2">
                                        <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(sub.submitted_at).toLocaleString()}</span>
                                        {sub.score !== null && <span className="flex items-center gap-1 text-green-600 font-bold"><TrendingUp size={14} /> {sub.score} 分</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedSubmission(sub)}
                                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 text-sm"
                                >
                                    {sub.analysis_result ? '查看分析' : '查看详情'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Analysis Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="font-bold">详细分析 - {selectedSubmission.task?.title}</h3>
                            <button onClick={() => setSelectedSubmission(null)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                                <p><strong>提交时间:</strong> {new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
                                <p className="mt-1 font-mono text-xs text-gray-500 truncate">数据: {selectedSubmission.data}</p>
                            </div>

                            {selectedSubmission.analysis_result ? (
                                <div>
                                    <h4 className="font-bold mb-2 text-green-700">AI 分析报告</h4>
                                    <div className="prose max-w-none text-sm whitespace-pre-wrap bg-green-50 p-4 rounded border border-green-100">
                                        {selectedSubmission.analysis_result}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-10">
                                    <p>暂无分析报告。</p>
                                    <p className="text-xs mt-2">请联系教师生成针对此提交的详细分析。</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 rounded-b-xl text-right">
                            <button onClick={() => setSelectedSubmission(null)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm">关闭</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
