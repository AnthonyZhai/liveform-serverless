import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { fetchWithAuth, API_BASE_URL } from '../utils/api';
import { Copy, ExternalLink, Download, BarChart, ChevronDown, ChevronUp, Eye, X, Edit, Check, Bot, Save, Code, MonitorPlay, LayoutList, ArrowLeft, Upload, Settings, FileText, BrainCircuit } from 'lucide-react';
import { useTaskGeneration } from '../context/TaskGenerationContext';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function TaskDetails() {
    const { uuid } = useParams();
    /* const navigate = useNavigate(); // unused */
    const [searchParams, setSearchParams] = useSearchParams();
    const activeView = (searchParams.get('view') as 'details' | 'edit' | 'analysis' | 'dashboard') || 'details';
    const setActiveView = (view: 'details' | 'edit' | 'analysis' | 'dashboard') => setSearchParams({ view });

    const [task, setTask] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    // activeView is now controlled by URL
    // const [activeView, setActiveView] = useState<'details' | 'edit' | 'analysis'>('details');

    // --- Common Logic ---
    const [copiedReport, setCopiedReport] = useState(false);

    useEffect(() => {
        loadData();
        loadUser();
    }, [uuid]);

    const loadData = async () => {
        if (!uuid) return;
        try {
            const [taskRes, subRes] = await Promise.all([
                fetchWithAuth(`/tasks/${uuid}`),
                fetchWithAuth(`/api/submit/${uuid}`)
            ]);

            if (taskRes.ok) {
                const taskData = await taskRes.json();
                setTask(taskData);

                // Fetch HTML content if available
                if (taskData.html_file_path) {
                    try {
                        const htmlRes = await fetch(`${API_BASE_URL}/${taskData.html_file_path}`);
                        if (htmlRes.ok) {
                            setHtmlContent(await htmlRes.text());
                        }
                    } catch (e) {
                        console.error("Failed to load HTML", e);
                    }
                }
            }
            if (subRes.ok) {
                const data = await subRes.json();
                setSubmissions(data.submissions);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadUser = async () => {
        try {
            const res = await fetchWithAuth('/users/me');
            if (res.ok) {
                setUser(await res.json());
            }
        } catch (err) {
            console.error(err);
        }
    };

    // --- View: Details Logic ---
    const [fullPromptOpen, setFullPromptOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
    const [fullPromptText, setFullPromptText] = useState("");
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedShort, setCopiedShort] = useState(false);
    const [copiedFull, setCopiedFull] = useState(false);

    useEffect(() => {
        if (task && user && activeView === 'details') {
            const template = user.post_prompt_template || `生成应用后，产生的数据用以下方法传到服务器：
 
 <script> 
 function sendTestData() { 
     const url = '{URL}'; 
     const data = {"字段1": "值1", "字段2": "值2"}; 
     document.getElementById('send-result').textContent = "提交中..."; 
     fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)}) 
     .then(async r => { 
         const text = await r.text(); 
         let json = {}; 
         try { json = JSON.parse(text); } catch(e) { json = {raw: text}; } 
         if (!r.ok) throw new Error(json.error || json.message || \`HTTP \${r.status}\`); 
         return json; 
     }) 
     .then(d => { 
         document.getElementById('send-result').textContent = "提交成功: " + JSON.stringify(d); 
         document.getElementById('send-result').style.color = '#28a745'; 
         console.log('提交成功:', d); 
     }) 
     .catch(e => { 
         document.getElementById('send-result').textContent = "提交失败: " + e.message; 
         document.getElementById('send-result').style.color = '#dc3545'; 
         console.error('提交失败:', e, 'URL:', url, 'Data:', data); 
     }); 
 } 
 </script>`;

            const submitUrl = `${API_BASE_URL}/api/submit/${task.uuid}`;
            setFullPromptText(template.replace('{URL}', submitUrl));
        }
    }, [task, user, activeView]);

    const handleCopy = (text: string, setCopiedState: (val: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setCopiedState(true);
        setTimeout(() => setCopiedState(false), 2000);
    };

    // --- View: Edit Logic ---
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editFile, setEditFile] = useState<File | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [htmlSummary, setHtmlSummary] = useState<string | null>(null);

    // Initialize edit form when switching to edit view
    useEffect(() => {
        if (activeView === 'edit' && task) {
            setEditTitle(task.title);
            setEditDescription(task.description || '');
            setEditFile(null);
        }
    }, [activeView, task]);

    // Initialize htmlSummary from task
    useEffect(() => {
        if (task?.html_summary) {
            setHtmlSummary(task.html_summary);
        }
    }, [task]);

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingEdit(true);

        const formData = new FormData();
        formData.append('title', editTitle);
        if (editDescription) formData.append('description', editDescription);
        if (editFile) formData.append('file', editFile);

        try {
            // Check if file is being uploaded
            if (editFile) {
                showToastNotification("正在分析上传的 HTML 内容，请稍候...");
                try {
                    const text = await editFile.text();
                    const prompt = `你是一个智能助手。请仔细阅读以下HTML内容（可能包含试卷、问卷或表单题目），并用不超过300字简要概述其中的内容。

**重要要求：**
1. 如果HTML中包含题目，请列出每道题目的内容
2. 如果HTML中包含答案信息（例如：value属性、data-correct属性、checked属性、或注释中的答案），请务必提取并标注每道题的正确答案
3. 如果是选择题，请列出所有选项及正确答案
4. 如果是填空题或简答题，请说明题目要求
5. 概述格式应清晰，便于后续进行数据分析（如计算正确率）

HTML内容：
${text.substring(0, 20000)}`;

                    const aiRes = await fetchWithAuth('/api/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: prompt,
                            model: user?.ai_model || 'deepseek-chat',
                            api_url: user?.ai_api_url,
                            api_key: user?.ai_api_key,
                            stream: false // We want full response at once if possible, but api/analyze might be stream only.
                        })
                    });

                    if (aiRes.ok) {
                        // api/analyze returns stream by default. We need to read it.
                        const reader = aiRes.body?.getReader();
                        const decoder = new TextDecoder();
                        let summary = "";
                        if (reader) {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                summary += decoder.decode(value, { stream: true });
                            }
                        }
                        formData.append('html_summary', summary);
                        setHtmlSummary(summary);
                    }
                } catch (e) {
                    console.error("Summary generation failed", e);
                    showToastNotification("摘要生成失败，将使用原始文件");
                }
            }

            const res = await fetchWithAuth(`/tasks/${uuid}`, {
                method: 'PUT',
                body: formData,
            });

            if (res.ok) {
                const updatedTask = await res.json();
                setTask(updatedTask);
                if (updatedTask.html_summary) setHtmlSummary(updatedTask.html_summary);
                setActiveView('details'); // Switch back to details after save
                showToastNotification("任务修改成功");
            } else {
                showToastNotification("修改失败");
            }
        } catch (error) {
            console.error(error);
            showToastNotification("修改失败");
        } finally {
            setSavingEdit(false);
        }
    };

    // --- View: Analysis Logic ---
    const [promptTemplate, setPromptTemplate] = useState("");
    const [fullAnalysisPrompt, setFullAnalysisPrompt] = useState("");
    // htmlContent & htmlSummary moved up
    // const [analysisResult, setAnalysisResult] = useState<string | null>(null); // MOVED TO CONTEXT
    // const [analyzing, setAnalyzing] = useState(false); // MOVED TO CONTEXT

    const { getTaskState, startAnalysis, startDashboardGeneration } = useTaskGeneration();
    const taskState = getTaskState(uuid || '');

    const analyzing = taskState.analysis.loading;
    const analysisResult = taskState.analysis.result || task?.analysis_result;

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    // Individual Analysis State
    const [analyzingSubmissionId, setAnalyzingSubmissionId] = useState<number | null>(null);
    const [viewAnalysisSubmission, setViewAnalysisSubmission] = useState<any>(null);
    const [viewDataSubmission, setViewDataSubmission] = useState<any>(null);

    const showToastNotification = (msg: string) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const DEFAULT_ANALYSIS_TEMPLATE = `你是一个数据分析专家，请基于以下表单题目（HTML）和提交数据提供详细的分析报告：

【表单题目信息 (HTML)】
{HTML_SECTION}

【提交数据信息】
{DATA_SECTION}

请提供一个全面的数据分析报告 (Markdown格式)，包括但不限于：
1. 试卷/表单结构分析：基于HTML分析题目类型、数量和内容。
2. 答题情况分析：如果有正确答案（如HTML中包含 value 或 data-correct 属性），分析正确率；如果是调查问卷，分析选项分布。
3. 数据概览：总量提交、关键数据分布。
4. 主要发现：数据中的趋势、模式、异常和相关性。
`;

    useEffect(() => {
        if (activeView === 'analysis' && user) {
            // Load template
            const savedTemplate = localStorage.getItem(`analysis_template_${uuid}`);
            if (savedTemplate) {
                setPromptTemplate(savedTemplate);
            } else {
                setPromptTemplate(user.analysis_prompt_template || DEFAULT_ANALYSIS_TEMPLATE);
            }
        }
    }, [activeView, user, uuid]);

    useEffect(() => {
        if (activeView === 'analysis' && task && submissions) {
            updateFullAnalysisPrompt();
        }
    }, [promptTemplate, submissions, task, activeView, htmlContent]);

    const updateFullAnalysisPrompt = () => {
        let dataStr = "";
        if (submissions.length === 0) {
            dataStr = "暂无提交数据";
        } else {
            dataStr = `任务标题：${task?.title}\n任务描述：${task?.description || '无'}\n\n提交数据信息：\n${submissions.map((s: any) => s.data).join('\n')}`;
        }

        let prompt = promptTemplate;

        if (prompt.includes("{HTML_SECTION}")) {
            prompt = prompt.replace("{HTML_SECTION}", htmlContent || "无 HTML 文件内容");
        }
        if (prompt.includes("{HTML_SUMMARY}")) {
            prompt = prompt.replace("{HTML_SUMMARY}", htmlSummary || "AI 摘要生成中或失败");
        }

        if (prompt.includes("{DATA_SECTION}")) {
            prompt = prompt.replace("{DATA_SECTION}", dataStr);
        } else {
            prompt = `${prompt}\n\n${dataStr}`;
        }
        setFullAnalysisPrompt(prompt);
    };

    const handleSaveTemplate = () => {
        localStorage.setItem(`analysis_template_${uuid}`, promptTemplate);
        alert("模板保存成功");
    };

    const handleAnalyze = async () => {
        if (!uuid) return;
        try {
            await startAnalysis(uuid, fullAnalysisPrompt, user);
        } catch (e: any) {
            setToastMessage("启动分析失败: " + e.message);
            setShowToast(true);
        }
    };

    const handleAnalyzeSubmission = async (sub: any) => {
        if (!user) {
            showToastNotification("请先登录");
            return;
        }

        // If already has result, just view
        if (sub.analysis_result) {
            setViewAnalysisSubmission(sub);
            return;
        }

        setAnalyzingSubmissionId(sub.id);

        try {
            const htmlStr = htmlContent || "无 HTML 文件内容";
            const prompt = `你是一个教育专家。请分析以下特定学生的提交数据。

【题目上下文 (HTML)】
${htmlStr}

【学生提交数据】
${sub.data}

请提供简短的分析（100-200字），指出该学生的强项、弱项和建议。`;

            // Check AI config
            if (!user.ai_api_key) {
                showToastNotification("请先在个人设置中配置 AI API Key");
                return;
            }

            // 1. Call AI API (Streaming, but we just gather result)
            const aiRes = await fetchWithAuth('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    model: user.ai_model || 'deepseek-chat',
                    api_url: user.ai_api_url,
                    api_key: user.ai_api_key
                })
            });

            if (!aiRes.ok) {
                let errorDetail = `HTTP ${aiRes.status}`;
                try {
                    const errBody = await aiRes.text();
                    errorDetail = errBody || errorDetail;
                } catch { /* ignore */ }
                throw new Error(`AI调用失败: ${errorDetail}`);
            }

            const reader = aiRes.body?.getReader();
            const decoder = new TextDecoder();
            let resultText = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    resultText += decoder.decode(value, { stream: true });
                }
            }

            // Check if the result contains an error JSON
            try {
                const parsed = JSON.parse(resultText);
                if (parsed.error) {
                    throw new Error(parsed.error + (parsed.details ? `: ${parsed.details}` : ''));
                }
            } catch (e) {
                // Not JSON or no error field, it's the actual result - continue
                if (e instanceof Error && e.message.includes('API')) throw e;
            }

            // 2. Save result
            await fetchWithAuth(`/api/submissions/${sub.id}/analysis`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysis_result: resultText })
            });

            // 3. Update local state
            const updatedSub = { ...sub, analysis_result: resultText };
            setSubmissions(prev => prev.map(s => s.id === sub.id ? updatedSub : s));
            setViewAnalysisSubmission(updatedSub);
            showToastNotification("单体分析完成");

        } catch (e: any) {
            console.error(e);
            showToastNotification("分析失败: " + e.message);
        } finally {
            setAnalyzingSubmissionId(null);
        }
    };


    // --- View: Dashboard Logic ---
    const [dashboardPromptTemplate, setDashboardPromptTemplate] = useState("");
    // Removed fullDashboardPrompt state as we don't show preview anymore
    // const [dashboardHtml, setDashboardHtml] = useState<string | null>(null); // MOVED TO CONTEXT
    // const [generatingDashboard, setGeneratingDashboard] = useState(false); // MOVED TO CONTEXT

    const generatingDashboard = taskState.dashboard.loading;
    const dashboardHtml = taskState.dashboard.html; // We don't persist dashboard HTML in task object field for preview usually, but we can if previously saved.
    // Actually dashboard_html might not be on task object directly or it might be separate. 
    // In existing code: `saveRes` update task to get new `dashboard_file_path`.
    // But checking `task` definition in original code, it didn't use `dashboard_html` from task for preview? 
    // It only used `dashboardHtml` state.
    // So `taskState.dashboard.html` is the primary source for "Live Preview" of generation.


    const DEFAULT_DASHBOARD_TEMPLATE = `你是一个前端开发专家。请基于以下上下文生成一个现代化的、交互式的数据可视化大屏（HTML单页应用）。

【表单题目信息 (HTML)】
{HTML_SECTION}

【数据接口】
- URL: {URL}
- 方法: GET
- 响应格式: \`{ "submissions": [ { "data": "{\\"field\\":\\"value\\"}", "created_at": "...", "id": ... }, ... ] }\`
  - 注意：\`data\` 字段是一个 JSON 字符串，需要解析。其中包含具体的表单填写内容。

【设计要求】
风格：数据驾驶舱，暗色背景，霓虹渐变标题，扁平化卡片，科技 Hud 风  
布局：上下分区，顶部大标题+关键指标横排，下方左侧 TOP20 排行榜表格，右侧明细表格，底部更新时间  
主色调：深空蓝 #0a0e27，强调色：荧光青 #00f5ff、荧光紫 #b967ff  
字体：阿里巴巴普惠体 28px 标题 / 18px 指标 / 16px 表格，数字用等宽字体 DIN  
动效：页面加载时指标卡片从上方淡入，数字翻牌器滚动到目标值，表格行隔行微光扫过  
组件：  
  - 大标题：发光字，左侧带闪电 icon，右侧带“游戏版本：3.4”标签  
  - 关键指标：4 个横向卡片（学生人数、平均分数、最高分数、完美通关数），白框+青紫渐变内阴影，数字用 56px 翻牌器  
  - 排行榜：左侧，表头固定，行高 48px，前 3 名金色皇冠 icon，奇偶行半透明差异，悬停高亮  
  - 成绩明细：右侧，支持学校/班级/排序方式下拉筛选，显示 9 条记录，列包含排名、姓名、班级、总分、完成关卡、完美关卡、满分次数、重置次数、最新提交时间，时间列右对齐  
  - 底部：刷新按钮+最后更新时间，微光脉冲提示  
技术：HTML5 + CSS3 + ECharts5 + 原生 JS，响应式 1920×1080，适配 scale 缩放，无需第三方 UI 框架，单文件即可运行  
额外：暗色背景附带低透明度网格线，标题栏做 1px 水平扫描线，表格滚动条隐藏但可滚，所有交互色值用 CSS 变量，方便一键换肤

请生成完整的 HTML 代码。`;

    useEffect(() => {
        if (activeView === 'dashboard' && user) {
            // Load template
            const savedTemplate = localStorage.getItem(`dashboard_template_${uuid}`);
            if (savedTemplate) {
                setDashboardPromptTemplate(savedTemplate);
            } else {
                setDashboardPromptTemplate(user.dashboard_prompt_template || DEFAULT_DASHBOARD_TEMPLATE);
            }
        }
    }, [activeView, user, uuid, task]);

    // Removed updateFullDashboardPrompt effect

    const handleSaveDashboardTemplate = () => {
        localStorage.setItem(`dashboard_template_${uuid}`, dashboardPromptTemplate);
        alert("模板保存成功");
    };

    const handleGenerateDashboard = async () => {
        if (!uuid) return;

        // Construct the prompt by injecting the URL
        const submitUrl = `${API_BASE_URL}/api/submit/${task.uuid}`;

        let prompt = dashboardPromptTemplate;

        if (prompt.includes("{HTML_SECTION}")) {
            prompt = prompt.replace("{HTML_SECTION}", htmlContent || "无 HTML 文件内容");
        }
        if (prompt.includes("{HTML_SUMMARY}")) {
            prompt = prompt.replace("{HTML_SUMMARY}", htmlSummary || "AI 摘要生成中或失败");
        }

        try {
            // Note: startDashboardGeneration will perform the {{url}} replacement
            await startDashboardGeneration(uuid, prompt, submitUrl, user);
        } catch (e: any) {
            showToastNotification("启动大屏生成失败");
        }
    };

    // showToastNotification moved up

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/tasks/${uuid}/export`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `task_${uuid}_data.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                await res.json();
                // Show toast instead of alert
                showToastNotification("导出失败，暂无数据");
            }
        } catch (error) {
            console.error("Export failed:", error);
            showToastNotification("导出失败，请重试");
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!task) return <div>Task not found</div>;

    const submitUrl = `${API_BASE_URL}/api/submit/${task.uuid}`;
    const hostedUrl = task.html_file_path ? `${API_BASE_URL}/${task.html_file_path}` : null;

    return (
        <div className="space-y-6 relative">
            {/* Toast Notification */}
            {showToast && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="bg-black/80 text-white px-6 py-3 rounded-lg shadow-xl animate-fade-in-up">
                        {toastMessage}
                    </div>
                </div>
            )}

            {/* Modal for Submission Details */}
            {selectedSubmission && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setSelectedSubmission(null)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 relative" onClick={e => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700" onClick={() => setSelectedSubmission(null)}>
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold mb-4">提交数据详情</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex py-2">
                                <span className="font-bold w-24">ID:</span>
                                <span>{selectedSubmission.id}</span>
                            </div>
                            <div className="flex py-2">
                                <span className="font-bold w-24">提交时间:</span>
                                <span>{new Date(selectedSubmission.submitted_at).toLocaleString()}</span>
                            </div>
                            <div className="mt-4">
                                <span className="font-bold block mb-2">数据内容 (JSON):</span>
                                <pre className="bg-white p-4 rounded overflow-auto max-h-96 text-xs font-mono border-2 border-dashed border-blue-300">
                                    {(() => {
                                        try {
                                            return JSON.stringify(JSON.parse(selectedSubmission.data), null, 2);
                                        } catch {
                                            return selectedSubmission.data;
                                        }
                                    })()}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Header Info (Always Visible) */}
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">{task.title}</h2>
                        <div className="text-sm text-gray-500 mb-4">
                            创建时间: {new Date(task.created_at).toLocaleString()} | 提交数量: {submissions.length}
                        </div>
                        <div className="text-gray-700 mb-4">{task.description}</div>
                        {hostedUrl && (
                            <div className="bg-green-50 p-3 rounded border border-green-200 inline-block">
                                <span className="font-bold text-green-700">已上传文件: </span>
                                <a href={hostedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 inline-flex">
                                    点击访问托管页面 <ExternalLink size={14} />
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setActiveView(activeView === 'edit' ? 'details' : 'edit')}
                            className={`border px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all ${activeView === 'edit' ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                            {activeView === 'edit' ? <ArrowLeft size={18} /> : <Edit size={18} />}
                            {activeView === 'edit' ? '返回详情' : '任务修改'}
                        </button>

                        <button
                            onClick={() => setActiveView(activeView === 'analysis' ? 'details' : 'analysis')}
                            className={`border px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all ${activeView === 'analysis' ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'bg-white border-blue-400 text-blue-600 hover:bg-blue-50'}`}
                        >
                            {activeView === 'analysis' ? <ArrowLeft size={18} /> : <BarChart size={18} />}
                            {activeView === 'analysis' ? '返回详情' : '数据分析'}
                        </button>

                        <button
                            onClick={() => setActiveView(activeView === 'dashboard' ? 'details' : 'dashboard')}
                            className={`border px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all ${activeView === 'dashboard' ? 'bg-purple-600 text-white border-purple-600 font-bold' : 'bg-white border-purple-400 text-purple-600 hover:bg-purple-50'}`}
                        >
                            {activeView === 'dashboard' ? <ArrowLeft size={18} /> : <MonitorPlay size={18} />}
                            {activeView === 'dashboard' ? '返回详情' : '数据大屏'}
                        </button>

                        <button
                            onClick={handleExport}
                            className="bg-gray-600 text-white px-3 py-1.5 rounded-xl text-sm flex items-center gap-1 hover:bg-gray-700 transition-colors"
                        >
                            <Download size={16} /> 导出数据
                        </button>
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA SWITCHER --- */}

            {/* 1. DETAILS VIEW */}
            {activeView === 'details' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600 flex items-center gap-2">
                        <LayoutList size={24} className="text-blue-600" />
                        <h3 className="text-xl font-bold text-gray-800">任务详情</h3>
                    </div>

                    <div className="bg-white rounded-lg shadow border-l-4 border-blue-600 overflow-hidden">
                        {/* Code Prompts */}
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-bold text-lg mb-4 text-blue-600 flex items-center gap-2">
                                <Code size={20} /> 提交代码提示词
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">数据接口地址 (URL):</label>
                                    <div className="flex mt-1">
                                        <input readOnly value={submitUrl} className="flex-grow border-2 border-dashed border-blue-300 bg-gray-50 p-2 rounded-l text-sm font-mono" />
                                        <button
                                            onClick={() => handleCopy(submitUrl, setCopiedUrl)}
                                            className={`border-2 border-dashed border-l-0 px-3 rounded-r transition-colors ${copiedUrl ? 'bg-green-100 text-green-600 border-green-200 border-solid' : 'bg-white hover:bg-gray-50 text-gray-600 border-blue-300'}`}
                                        >
                                            {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-600">精简版提示词 (点击复制):</label>
                                    <div className="flex mt-1">
                                        <input
                                            readOnly
                                            value={`创建完应用后，向 '${submitUrl}' 发送post格式的json数据`}
                                            className="flex-grow border-2 border-dashed border-blue-300 bg-gray-50 p-2 rounded-l text-sm font-mono"
                                        />
                                        <button
                                            onClick={() => {
                                                const text = `创建完应用后，向 '${submitUrl}' 发送post格式的json数据`;
                                                handleCopy(text, setCopiedShort);
                                            }}
                                            className={`border-2 border-dashed border-l-0 px-3 rounded-r transition-colors ${copiedShort ? 'bg-green-100 text-green-600 border-green-200 border-solid' : 'bg-white hover:bg-gray-50 text-gray-600 border-blue-300'}`}
                                        >
                                            {copiedShort ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div
                                        className="flex justify-between items-center cursor-pointer"
                                        onClick={() => setFullPromptOpen(!fullPromptOpen)}
                                    >
                                        <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                            完整版提示词 (默认折叠，点击展开/复制)
                                            {fullPromptOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </label>
                                    </div>

                                    {fullPromptOpen && (
                                        <div className="mt-2 relative">
                                            <textarea
                                                className="w-full border-2 border-dashed border-blue-300 bg-white text-gray-800 p-4 rounded-lg text-sm font-mono h-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                value={fullPromptText}
                                                onChange={(e) => setFullPromptText(e.target.value)}
                                            />
                                            <button
                                                onClick={() => handleCopy(fullPromptText, setCopiedFull)}
                                                className={`absolute top-2 right-2 p-1.5 rounded transition-colors border shadow-sm ${copiedFull ? 'bg-green-100 text-green-600 border-green-200' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200'}`}
                                                title="复制"
                                            >
                                                {copiedFull ? <Check size={16} /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Submissions List */}
                        <div className="p-6 bg-white">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-blue-600 flex items-center gap-2">
                                    <LayoutList size={20} /> 提交数据列表
                                </h3>
                                <button className="bg-red-500 text-white px-3 py-1.5 rounded text-sm hover:bg-red-600">删除全部数据</button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left bg-white border-2 border-dashed border-blue-300 rounded-lg overflow-hidden">
                                    <thead className="bg-white text-gray-700 uppercase">
                                        <tr>
                                            <th className="px-4 py-3 border-b-2 border-dashed border-blue-300">ID</th>
                                            <th className="px-4 py-3 border-b-2 border-dashed border-blue-300">提交时间</th>
                                            <th className="px-4 py-3 border-b-2 border-dashed border-blue-300">数据内容</th>
                                            <th className="px-4 py-3 border-b-2 border-dashed border-blue-300">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.length === 0 ? (
                                            <tr><td colSpan={4} className="text-center py-4 text-gray-500 border-b-2 border-dashed border-blue-300">暂无提交数据</td></tr>
                                        ) : (
                                            submissions.map((sub: any) => (
                                                <tr key={sub.id} className="border-b-2 border-dashed border-blue-300 hover:bg-gray-50">
                                                    <td className="px-4 py-3">{sub.id}</td>
                                                    <td className="px-4 py-3">{new Date(sub.submitted_at).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-gray-400 italic">
                                                        <button
                                                            onClick={() => setViewDataSubmission(sub)}
                                                            className="text-blue-500 hover:text-blue-700 underline text-xs flex items-center gap-1"
                                                        >
                                                            <Eye size={12} /> 查看数据
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => handleAnalyzeSubmission(sub)}
                                                            disabled={analyzingSubmissionId === sub.id}
                                                            className="text-blue-600 hover:underline mr-3 flex items-center gap-1 inline-flex disabled:opacity-50"
                                                        >
                                                            {analyzingSubmissionId === sub.id ? (
                                                                <span className="animate-pulse">分析中...</span>
                                                            ) : (
                                                                sub.analysis_result ? <><Eye size={14} /> 查看分析</> : <><BrainCircuit size={14} /> 生成分析</>
                                                            )}
                                                        </button>
                                                        <button className="text-red-600 hover:underline">删除</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-center text-gray-500 text-xs">
                                共 {submissions.length} 条记录
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. EDIT VIEW */}
            {activeView === 'edit' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600 flex items-center gap-2">
                        <Edit size={24} className="text-blue-600" />
                        <h3 className="text-xl font-bold text-gray-800">修改任务信息</h3>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
                        <form onSubmit={handleEditSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">任务标题</label>
                                <input
                                    className="w-full border-2 border-dashed border-blue-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                    placeholder="请输入任务标题"
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">任务描述 (可选)</label>
                                <textarea
                                    className="w-full border-2 border-dashed border-blue-300 p-3 rounded-xl h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                    placeholder="请输入任务描述"
                                    value={editDescription}
                                    onChange={e => setEditDescription(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">HTML文件 (上传以替换现有文件)</label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".html"
                                    onChange={e => setEditFile(e.target.files?.[0] || null)}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-blue-300 rounded-xl p-6 flex flex-col items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors gap-2"
                                >
                                    <Upload size={32} />
                                    <span className="font-medium">{editFile ? editFile.name : "点击选择新 HTML 文件"}</span>
                                </button>
                                <p className="text-xs text-gray-500 mt-2 text-center">如果不上传，则保留原文件</p>
                            </div>

                            <div className="flex justify-end mt-8">
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow-md w-full sm:w-auto"
                                >
                                    {savingEdit ? '保存中...' : '保存修改'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Analysis Result Modal */}
            {viewAnalysisSubmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="font-bold flex items-center gap-2">
                                <Bot className="text-blue-600" size={20} />
                                单体分析报告 (ID: {viewAnalysisSubmission.id})
                            </h3>
                            <button onClick={() => setViewAnalysisSubmission(null)} className="p-1 hover:bg-gray-200 rounded-full">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <h4 className="font-bold text-gray-700 mb-2">学生提交数据:</h4>
                            <div className="bg-gray-100 p-3 rounded text-xs font-mono mb-6 overflow-x-auto">
                                {viewAnalysisSubmission.data}
                            </div>

                            <h4 className="font-bold text-green-700 mb-2">AI 分析建议:</h4>
                            <div className="prose max-w-none text-sm whitespace-pre-wrap bg-green-50 p-4 rounded border border-green-100">
                                {viewAnalysisSubmission.analysis_result}
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 rounded-b-xl text-right">
                            <button
                                onClick={() => setViewAnalysisSubmission(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium text-sm"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Result Modal */}
            {viewAnalysisSubmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="font-bold flex items-center gap-2">
                                <Bot className="text-blue-600" size={20} />
                                单体分析报告 (ID: {viewAnalysisSubmission.id})
                            </h3>
                            <button onClick={() => setViewAnalysisSubmission(null)} className="p-1 hover:bg-gray-200 rounded-full">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <h4 className="font-bold text-gray-700 mb-2">学生提交数据:</h4>
                            <div className="bg-gray-100 p-3 rounded text-xs font-mono mb-6 overflow-x-auto">
                                {viewAnalysisSubmission.data}
                            </div>

                            <h4 className="font-bold text-green-700 mb-2">AI 分析建议:</h4>
                            <div className="prose max-w-none text-sm whitespace-pre-wrap bg-green-50 p-4 rounded border border-green-100">
                                {viewAnalysisSubmission.analysis_result}
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 rounded-b-xl text-right">
                            <button
                                onClick={() => setViewAnalysisSubmission(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium text-sm"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. ANALYSIS VIEW */}
            {activeView === 'analysis' && (
                <div className="space-y-6">
                    {/* Analysis Header */}
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Bot size={24} className="text-blue-600" />
                            <h2 className="text-xl font-bold text-gray-800">数据分析</h2>
                        </div>
                        <Link
                            to="/profile?tab=ai"
                            className="border border-blue-400 text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-50 bg-white"
                        >
                            配置AI
                        </Link>
                    </div>

                    {/* Combined Template and Preview Block */}
                    <div className="bg-white rounded-lg shadow border-l-4 border-blue-600 overflow-hidden">
                        {/* Section 1: Template Settings */}
                        <div className="p-6 border-b border-gray-100">
                            <div className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                                <Settings size={20} className="text-blue-600" /> 提示词模板设置
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-4">
                                    您可以在这里设置提示词模板。使用 <span className="text-red-500 font-mono">{`{DATA_SECTION}`}</span> 作为数据占位符。
                                </p>

                                <textarea
                                    className="w-full border-2 border-dashed border-blue-300 p-3 rounded-lg h-48 font-mono text-sm mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={promptTemplate}
                                    onChange={e => setPromptTemplate(e.target.value)}
                                />

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSaveTemplate}
                                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                                    >
                                        <Save size={16} /> 保存模板
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Full Prompt Editor */}
                        <div className="p-6 bg-white">
                            <div className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                                <FileText size={20} className="text-blue-600" /> 最终提示词预览
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-4">
                                    下方是包含数据的完整提示词，您可以最后确认或修改：
                                </p>

                                <textarea
                                    className="w-full border-2 border-dashed border-blue-300 p-3 rounded-lg h-64 font-mono text-sm mb-4 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={fullAnalysisPrompt}
                                    onChange={e => setFullAnalysisPrompt(e.target.value)}
                                />

                                <button
                                    onClick={handleAnalyze}
                                    disabled={analyzing}
                                    className={`w-full text-white py-3 rounded-xl font-bold hover:bg-opacity-90 disabled:opacity-50 flex justify-center items-center gap-2 text-lg shadow-md transition-all ${analysisResult ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    {analyzing ? '分析中 (请稍候)...' : <><Bot size={24} /> {analysisResult ? '重新生成报告' : '开始生成报告'}</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Result Display */}
                    {analysisResult && (
                        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600 relative">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-blue-600 flex items-center gap-2">
                                    <Bot size={20} /> 分析报告
                                </h3>
                                <button
                                    onClick={() => handleCopy(analysisResult, setCopiedReport)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded border transition-colors ${copiedReport ? 'bg-green-100 text-green-600 border-green-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {copiedReport ? <Check size={14} /> : <Copy size={14} />}
                                    <span className="text-sm">{copiedReport ? '已复制' : '复制报告'}</span>
                                </button>
                            </div>
                            <div className="markdown-body bg-white p-8 rounded border-2 border-dashed border-blue-300 overflow-auto max-h-[800px]">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {analysisResult}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* 4. DASHBOARD VIEW */}
            {activeView === 'dashboard' && (
                <div className="space-y-6">
                    {/* Dashboard Header */}
                    <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-600 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <MonitorPlay size={24} className="text-purple-600" />
                            <h2 className="text-xl font-bold text-gray-800">数据可视化大屏</h2>
                        </div>
                        <Link
                            to="/profile?tab=ai"
                            className="border border-purple-400 text-purple-600 px-3 py-1 rounded text-sm hover:bg-purple-50 bg-white"
                        >
                            配置AI
                        </Link>
                    </div>

                    {/* Combined Template and Preview Block */}
                    <div className="bg-white rounded-lg shadow border-l-4 border-purple-600 overflow-hidden">
                        {/* Section 1: Template Settings */}
                        <div className="p-6 border-b border-gray-100">
                            <div className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                                <Settings size={20} className="text-purple-600" /> 提示词设置
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-4">
                                    设置用于生成大屏的提示词。系统会自动将 <span className="text-red-500 font-mono">{"{URL}"}</span> 替换为真实数据接口地址。
                                </p>

                                <textarea
                                    className="w-full border-2 border-dashed border-purple-300 p-3 rounded-lg h-48 font-mono text-sm mb-4 focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={dashboardPromptTemplate}
                                    onChange={e => setDashboardPromptTemplate(e.target.value)}
                                />

                                <div className="flex justify-between">
                                    <button
                                        onClick={handleSaveDashboardTemplate}
                                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                                    >
                                        <Save size={16} /> 保存模板
                                    </button>

                                    <button
                                        onClick={handleGenerateDashboard}
                                        disabled={generatingDashboard}
                                        className={`px-6 py-2 rounded-xl font-bold hover:bg-opacity-90 disabled:opacity-50 flex justify-center items-center gap-2 text-white shadow-md transition-all ${dashboardHtml || task?.dashboard_file_path ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                                    >
                                        {generatingDashboard ? '生成中...' : <><MonitorPlay size={20} /> {dashboardHtml || task?.dashboard_file_path ? '重新生成大屏' : '生成大屏'}</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result Display (Iframe) */}
                    {(dashboardHtml || task?.dashboard_file_path) && (
                        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-600 relative">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-purple-600 flex items-center gap-2">
                                    <MonitorPlay size={20} /> 大屏预览
                                </h3>
                                {task?.dashboard_file_path && (
                                    <a
                                        href={`${API_BASE_URL}/${task.dashboard_file_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-1.5 rounded border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        <ExternalLink size={14} />
                                        <span className="text-sm">新窗口打开</span>
                                    </a>
                                )}
                            </div>

                            <div className="border-2 border-dashed border-purple-300 rounded overflow-hidden h-[800px] bg-gray-50 relative">
                                {generatingDashboard && !dashboardHtml && (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                                        生成中...
                                    </div>
                                )}
                                <iframe
                                    src={task?.dashboard_file_path && !generatingDashboard ? `${API_BASE_URL}/${task.dashboard_file_path}` : undefined}
                                    srcDoc={generatingDashboard || !task?.dashboard_file_path ? dashboardHtml || "" : undefined}
                                    className="w-full h-full border-0"
                                    title="Dashboard Preview"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Analysis Result Modal */}
            {viewAnalysisSubmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="font-bold flex items-center gap-2">
                                <Bot className="text-blue-600" size={20} />
                                单体分析报告 (ID: {viewAnalysisSubmission.id})
                            </h3>
                            <button onClick={() => setViewAnalysisSubmission(null)} className="p-1 hover:bg-gray-200 rounded-full">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <h4 className="font-bold text-gray-700 mb-2">学生提交数据:</h4>
                            <div className="bg-gray-100 p-3 rounded text-xs font-mono mb-6 overflow-x-auto">
                                {viewAnalysisSubmission.data}
                            </div>

                            <h4 className="font-bold text-green-700 mb-2">AI 分析建议:</h4>
                            <div className="prose max-w-none text-sm whitespace-pre-wrap bg-green-50 p-4 rounded border border-green-100">
                                {viewAnalysisSubmission.analysis_result}
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 rounded-b-xl text-right">
                            <button
                                onClick={() => setViewAnalysisSubmission(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium text-sm"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Data Modal */}
            {viewDataSubmission && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
                    onClick={() => setViewDataSubmission(null)} // Click outside to close
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
                    >
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="font-bold flex items-center gap-2">
                                <FileText className="text-blue-600" size={20} />
                                提交数据详情 (ID: {viewDataSubmission.id})
                            </h3>
                            <button onClick={() => setViewDataSubmission(null)} className="p-1 hover:bg-gray-200 rounded-full">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="bg-gray-100 p-4 rounded text-sm font-mono whitespace-pre-wrap overflow-auto">
                                {(() => {
                                    try {
                                        const json = JSON.parse(viewDataSubmission.data);
                                        return JSON.stringify(json, null, 2);
                                    } catch {
                                        return viewDataSubmission.data;
                                    }
                                })()}
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 rounded-b-xl text-right">
                            <button
                                onClick={() => setViewDataSubmission(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium text-sm"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}