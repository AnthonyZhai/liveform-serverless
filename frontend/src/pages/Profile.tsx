import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { Save, FileText } from 'lucide-react';


export default function Profile() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'info';
    const setActiveTab = (tab: string) => setSearchParams({ tab });

    const [user, setUser] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // AI Test State
    const [testPrompt, setTestPrompt] = useState('例如：请回复“OK”，用于连通性测试。');
    const [testResult, setTestResult] = useState('');
    const [testing, setTesting] = useState(false);

    // Default Prompt Templates
    // Using string concatenation to avoid template literal interpolation issues
    const DEFAULT_POST_TEMPLATE = "生成应用后，产生的数据用以下方法传到服务器：\n\n" +
        "<div id=\"send-result\"></div>\n" +
        "<script>\n" +
        "function sendTestData() {\n" +
        "    const url = '{URL}';\n" +
        "    const data = {\"字段1\": \"值1\", \"字段2\": \"值2\"};\n" +
        "    document.getElementById('send-result').textContent = \"提交中...\";\n" +
        "    fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)})\n" +
        "    .then(async r => {\n" +
        "        const text = await r.text();\n" +
        "        let json = {};\n" +
        "        try { json = JSON.parse(text); } catch(e) { json = {raw: text}; }\n" +
        "        if (!r.ok) throw new Error(json.error || json.message || `HTTP ${r.status}`);\n" +
        "        return json;\n" +
        "    })\n" +
        "    .then(d => {\n" +
        "        document.getElementById('send-result').textContent = \"提交成功: \" + JSON.stringify(d);\n" +
        "        document.getElementById('send-result').style.color = '#28a745';\n" +
        "        console.log('提交成功:', d);\n" +
        "    })\n" +
        "    .catch(e => {\n" +
        "        document.getElementById('send-result').textContent = \"提交失败: \" + e.message;\n" +
        "        document.getElementById('send-result').style.color = '#dc3545';\n" +
        "        console.error('提交失败:', e);\n" +
        "    });\n" +
        "}\n" +
        "</script>";

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

    const DEFAULT_DASHBOARD_TEMPLATE = `你是一个前端开发专家。请基于以下要求生成一个包含数据可视化的HTML单页应用。
  
数据接口URL: {URL}

要求：
1. **数据获取**：页面加载时，使用 \`fetch('{URL}')\` 获取数据。接口返回格式为 \`{ "submissions": [ { "data": "{\\"field\\":\\"value\\"}", ... }, ... ] }\`。你需要解析 JSON 字符串格式的 \`data\` 字段。
2. **主题风格**：使用深色科技感主题（参考深蓝色/紫色背景，霓虹色图表）。
3. **页面布局**：
    - 顶部：大标题“数据可视化大屏”。
    - 上部：4个关键指标卡片（如提交总数、今日提交、平均值等，需根据数据计算）。
    - 中部：两个主要图表（左侧柱状图/折线图，右侧饼图/雷达图），使用 ECharts 实现。
    - 下部：数据表格或排行榜（展示前10条数据）。
4. **交互**：包含一个“刷新数据”按钮。
5. **健壮性**：
    - 处理日期时，必须使用 \`try-catch\` 或检查 \`new Date()\` 的结果是否为 \`NaN\`。如果 \`submitted_at\` 解析失败，请使用当前时间。
    - 确保解析 \`data\` JSON 字符串时处理异常。
6. **技术栈**：
    - 使用 CDN 引入 ECharts。
    - 使用 TailwindCSS (CDN) 进行样式布局。
    - 纯 HTML/JS，无构建步骤。
6. **代码输出**：只返回 HTML 代码，不要包含 Markdown 标记。确保代码完整可运行。
`;

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const res = await fetchWithAuth('/users/me');
            if (res.ok) {
                const userData = await res.json();
                // Initialize templates if they are null
                if (!userData.post_prompt_template) userData.post_prompt_template = DEFAULT_POST_TEMPLATE;
                if (!userData.analysis_prompt_template) userData.analysis_prompt_template = DEFAULT_ANALYSIS_TEMPLATE;
                if (!userData.dashboard_prompt_template) userData.dashboard_prompt_template = DEFAULT_DASHBOARD_TEMPLATE;
                setUser(userData);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetchWithAuth('/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });
            if (res.ok) {
                setMessage('个人信息已保存');
                setUser(await res.json());
            } else {
                setMessage('保存失败');
            }
        } catch (err) {
            setMessage('保存出错');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            alert("两次输入的密码不一致");
            return;
        }
        if (newPassword.length < 6) {
            alert("密码长度至少为6个字符");
            return;
        }

        setLoading(true);
        try {
            const res = await fetchWithAuth('/users/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            if (res.ok) {
                alert("密码修改成功");
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const data = await res.json();
                alert(`修改失败: ${data.detail || '未知错误'}`);
            }
        } catch (err) {
            alert("修改出错");
        } finally {
            setLoading(false);
        }
    };

    const handleTestAI = async () => {
        setTesting(true);
        setTestResult('');

        try {
            const res = await fetchWithAuth('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: [{ test: "ping" }],
                    prompt: testPrompt === '例如：请回复“OK”，用于连通性测试。' ? '请回复“OK”，用于连通性测试。' : testPrompt,
                    model: user.ai_model,
                    api_url: user.ai_api_url,
                    api_key: user.ai_api_key
                })
            });

            if (!res.ok) {
                const data = await res.json();
                setTestResult(`连接失败: ${data.error} ${data.details || ''}`);
                return;
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";

            if (!reader) {
                setTestResult("Error: Cannot read response stream");
                return;
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value, { stream: true });

                if (text.includes('{"error":')) {
                    try {
                        const errJson = JSON.parse(text);
                        setTestResult(`连接失败: ${errJson.error}\nDetails: ${errJson.details || ''}`);
                        return;
                    } catch { }
                }

                fullContent += text;
                setTestResult(`测试成功！\nAI回复: ${fullContent}`);
            }

        } catch (err: any) {
            setTestResult(`请求出错: ${err.message}`);
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 rounded-t-lg shadow">
                <h2 className="text-xl font-bold">个人设置</h2>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-b-lg shadow p-6 -mt-6">

                {/* Tabs */}
                <div className="flex border-b mb-6">
                    <button
                        className={`px-4 py-2 text-sm font-medium ${activeTab === 'info' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('info')}
                    >
                        个人信息
                    </button>

                    {(user.role === 'teacher' || user.role === 'admin') && (
                        <button
                            className={`px-4 py-2 text-sm font-medium ${activeTab === 'ai' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('ai')}
                        >
                            AI配置
                        </button>
                    )}

                    <button
                        className={`px-4 py-2 text-sm font-medium ${activeTab === 'password' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('password')}
                    >
                        密码修改
                    </button>

                    {(user.role === 'teacher' || user.role === 'admin') && (
                        <button
                            className={`px-4 py-2 text-sm font-medium ${activeTab === 'templates' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('templates')}
                        >
                            提示词模板
                        </button>
                    )}
                </div>

                {/* Tab Content: Info */}
                {activeTab === 'info' && (
                    <div className="space-y-4 max-w-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                            <input
                                className="w-full border p-2 rounded bg-gray-50 text-gray-500"
                                value={user.username || ''}
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                            <input
                                className="w-full border p-2 rounded"
                                value={user.email || ''}
                                onChange={e => setUser({ ...user, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">学校</label>
                            <input
                                className="w-full border p-2 rounded"
                                value={user.school || ''}
                                onChange={e => setUser({ ...user, school: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                            <input
                                className="w-full border p-2 rounded"
                                value={user.phone || ''}
                                onChange={e => setUser({ ...user, phone: e.target.value })}
                                placeholder="请输入11位手机号码"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 flex items-center gap-2"
                            >
                                <Save size={16} /> {loading ? '保存中...' : '保存个人信息'}
                            </button>
                            {message && <span className="ml-3 text-sm text-green-600">{message}</span>}
                        </div>
                    </div>
                )}

                {/* Tab Content: AI Config */}
                {activeTab === 'ai' && (user.role === 'teacher' || user.role === 'admin') && (
                    <div className="space-y-6 max-w-2xl">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">AI模型名称</label>
                            <div className="flex gap-2">
                                <input
                                    className="w-full border border-blue-300 p-2 rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={user.ai_model || ''}
                                    onChange={e => setUser({ ...user, ai_model: e.target.value })}
                                    placeholder="例如: deepseek-chat, gpt-3.5-turbo"
                                    list="model-suggestions"
                                />
                                <datalist id="model-suggestions">
                                    <option value="deepseek-chat">DeepSeek</option>
                                    <option value="deepseek-coder">DeepSeek Coder</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                    <option value="gpt-4o">GPT-4o</option>
                                    <option value="qwen-turbo">通义千问 (Qwen)</option>
                                </datalist>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">可以直接输入，或从下拉列表中选择常用模型。</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-gray-800 mb-2">模型配置 ({user.ai_model || 'deepseek-chat'})</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">API 地址 (可选)</label>
                                    <input
                                        className="w-full border p-2 rounded"
                                        value={user.ai_api_url || ''}
                                        onChange={e => setUser({ ...user, ai_api_url: e.target.value })}
                                        placeholder="None (不填则使用系统默认地址)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">API Token (可选)</label>
                                    <input
                                        type="password"
                                        className="w-full border p-2 rounded"
                                        value={user.ai_api_key || ''}
                                        onChange={e => setUser({ ...user, ai_api_key: e.target.value })}
                                        placeholder="None (不填则使用系统默认Token)"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 flex items-center gap-2"
                            >
                                <Save size={16} /> {loading ? '保存中...' : '保存配置'}
                            </button>
                            {message && <span className="ml-3 text-sm text-green-600">{message}</span>}
                        </div>

                        {/* Connectivity Test */}
                        <div className="bg-gray-50 border border-gray-200 rounded p-4 mt-6">
                            <h4 className="text-sm font-bold text-gray-700 mb-2">API 连通性测试</h4>
                            <p className="text-xs text-gray-500 mb-4">保存配置后，可通过下方快速测试按钮确认模型接口是否可正常响应。</p>

                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-600 mb-1">测试提示词 (可选)</label>
                                <textarea
                                    className="w-full border p-2 rounded text-sm h-16"
                                    value={testPrompt}
                                    onChange={e => setTestPrompt(e.target.value)}
                                    placeholder="例如：请回复“OK”，用于连通性测试。"
                                />
                            </div>

                            <button
                                onClick={handleTestAI}
                                disabled={testing}
                                className="bg-white border border-blue-500 text-blue-600 px-4 py-1.5 rounded text-sm hover:bg-blue-50"
                            >
                                {testing ? '测试中...' : '测试接口'}
                            </button>

                            {testResult && (
                                <div className="mt-4 p-3 bg-white border rounded text-sm whitespace-pre-wrap">
                                    {testResult}
                                </div>
                            )}

                            <p className="text-xs text-gray-500 mt-4">若修改了上方配置，请先点击“保存配置”，再进行连通性测试。</p>
                        </div>
                    </div>
                )}

                {/* Tab Content: Password */}
                {activeTab === 'password' && (
                    <div className="space-y-4 max-w-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
                            <input
                                type="password"
                                className="w-full border p-2 rounded"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                            <input
                                type="password"
                                className="w-full border p-2 rounded"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                            <input
                                type="password"
                                className="w-full border p-2 rounded"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">密码长度至少为6个字符</p>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handlePasswordChange}
                                disabled={loading}
                                className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 flex items-center gap-2"
                            >
                                <Save size={16} /> {loading ? '修改中...' : '修改密码'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Tab Content: Templates */}
                {activeTab === 'templates' && (user.role === 'teacher' || user.role === 'admin') && (
                    <div className="space-y-6 max-w-3xl">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                            <p className="text-sm text-blue-700">
                                您可以自定义系统中的提示词模板。这些模板将应用于您未来查看的所有任务。
                                <br />
                                <strong>注意：</strong> 使用 <span className="font-mono bg-blue-100 px-1 rounded">{`{URL}`}</span> 代表数据接口地址，<span className="font-mono bg-blue-100 px-1 rounded">{`{HTML_SUMMARY}`}</span> 代表AI摘要，<span className="font-mono bg-blue-100 px-1 rounded">{`{DATA_SECTION}`}</span> 代表提交数据。
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">POST提示词模板 (任务详情页)</label>
                            <p className="text-xs text-gray-500 mb-2">显示在任务详情页的“完整版提示词”中。请保留 <span className="font-mono text-red-500">{`{URL}`}</span> 占位符。</p>
                            <textarea
                                className="w-full border border-gray-300 p-3 rounded-lg font-mono text-sm h-48 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={user.post_prompt_template || ''}
                                onChange={e => setUser({ ...user, post_prompt_template: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">数据分析提示词模板 (数据分析页)</label>
                            <p className="text-xs text-gray-500 mb-2">用于AI数据分析。请保留 <span className="font-mono text-red-500">{`{DATA_SECTION}`}</span>，以及 <span className="font-mono text-red-500">{`{HTML_SUMMARY}`}</span> (AI摘要) 或 <span className="font-mono text-red-500">{`{HTML_SECTION}`}</span> (原始HTML) 占位符。</p>
                            <textarea
                                className="w-full border border-gray-300 p-3 rounded-lg font-mono text-sm h-48 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={user.analysis_prompt_template || ''}
                                onChange={e => setUser({ ...user, analysis_prompt_template: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">数据大屏提示词模板 (数据大屏页)</label>
                            <p className="text-xs text-gray-500 mb-2">用于生成HTML可视化大屏。请保留 <span className="font-mono text-red-500">{`{URL}`}</span> 占位符（代表数据API地址）。</p>
                            <textarea
                                className="w-full border border-gray-300 p-3 rounded-lg font-mono text-sm h-48 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={user.dashboard_prompt_template || ''}
                                onChange={e => setUser({ ...user, dashboard_prompt_template: e.target.value })}
                            />
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 flex items-center gap-2"
                            >
                                <Save size={16} /> {loading ? '保存中...' : '保存模板配置'}
                            </button>

                            <button
                                onClick={() => setUser({
                                    ...user,
                                    post_prompt_template: DEFAULT_POST_TEMPLATE,
                                    analysis_prompt_template: DEFAULT_ANALYSIS_TEMPLATE,
                                    dashboard_prompt_template: DEFAULT_DASHBOARD_TEMPLATE
                                })}
                                className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded hover:bg-gray-50 flex items-center gap-2"
                            >
                                <FileText size={16} /> 恢复默认模板
                            </button>
                            {message && <span className="ml-3 text-sm text-green-600 flex items-center">{message}</span>}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className="bg-white p-6 rounded-lg shadow border-t-4 border-gray-500">
                <h3 className="font-bold text-gray-700 mb-2">配置说明</h3>
                <p className="text-sm text-gray-600 mb-2">
                    配置完成AI模型后，您可以在任务分析页面使用智能分析功能。智能分析将根据您的表单数据和附件内容，生成详细的分析报告。
                </p>
                <p className="text-sm text-gray-600">
                    请注意保护您的API密钥安全，避免泄露。数据将通过安全通道发送至AI模型进行分析。
                </p>
            </div>
        </div>
    );
}