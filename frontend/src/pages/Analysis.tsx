import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { Settings, Bot, Save, FileText, Lightbulb } from 'lucide-react';
import { useTaskGeneration } from '../context/TaskGenerationContext';

export default function Analysis() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [htmlSummary, setHtmlSummary] = useState<string | null>(null);

  // Analysis Config
  const [promptTemplate, setPromptTemplate] = useState("");
  const [fullPrompt, setFullPrompt] = useState("");
  // const [result, setResult] = useState<string | null>(null); // MOVED TO CONTEXT
  // const [analyzing, setAnalyzing] = useState(false); // MOVED TO CONTEXT

  const { getTaskState, startAnalysis } = useTaskGeneration();
  // Using uuid || '' for safety, though uuid should exist in this route
  const taskState = getTaskState(uuid || '');

  const analyzing = taskState.analysis.loading;
  const result = taskState.analysis.result || taskState.analysis.error;


  const DEFAULT_TEMPLATE = `你是一个数据分析专家，请基于以下表单题目（HTML）和提交数据提供详细的分析报告：

【表单题目信息 (HTML)】
【表单题目信息 (HTML摘要)】
{HTML_SUMMARY}
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
    loadData();
  }, [uuid]);

  // Effect to update full prompt when template or data changes
  useEffect(() => {
    if (task && submissions) {
      updateFullPrompt();
    }
  }, [promptTemplate, submissions, task, htmlContent, htmlSummary]);

  const loadData = async () => {
    if (!uuid) return;
    try {
      const [taskRes, subRes, userRes] = await Promise.all([
        fetchWithAuth(`/tasks/${uuid}`),
        fetchWithAuth(`/api/submit/${uuid}`),
        fetchWithAuth(`/users/me`)
      ]);

      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTask(taskData);
        if (taskData.html_summary) {
          setHtmlSummary(taskData.html_summary);
        }

        // Fetch HTML content if available
        if (taskData.html_file_path) {
          try {
            // Determine full URL, task.html_file_path is like "view/uuid/index.html"
            // API_BASE_URL is imported from utils/api
            // We need to fetch it as text
            const { API_BASE_URL } = await import('../utils/api');
            const htmlRes = await fetch(`${API_BASE_URL}/${taskData.html_file_path}`);
            if (htmlRes.ok) {
              const text = await htmlRes.text();
              setHtmlContent(text);
            }
          } catch (err) {
            console.error("Failed to load HTML content", err);
          }
        }
      }
      if (userRes.ok) setUser(await userRes.json());

      let subsData = [];
      if (subRes.ok) {
        const data = await subRes.json();
        subsData = data.submissions;
        setSubmissions(subsData);
      }

      // Load template from user settings, then local storage, then default
      const savedTemplate = localStorage.getItem(`analysis_template_${uuid}`);

      if (savedTemplate) {
        setPromptTemplate(savedTemplate);
      } else if (userRes.ok) {
        const userData = await userRes.json();
        // Use user's global template if available, otherwise default
        setPromptTemplate(userData.analysis_prompt_template || DEFAULT_TEMPLATE);
      } else {
        setPromptTemplate(DEFAULT_TEMPLATE);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateFullPrompt = () => {
    let dataStr = "";
    if (submissions.length === 0) {
      dataStr = "暂无提交数据";
    } else {
      dataStr = `任务标题：${task?.title}\n任务描述：${task?.description || '无'}\n\n提交数据信息：\n${submissions.map(s => s.data).join('\n')}`;
    }

    let prompt = promptTemplate;

    // Replace HTML_SUMMARY
    const summaryStr = task.html_summary || (task.html_summary_status === 'processing' ? 'AI 摘要生成中...' : (task.html_summary_status === 'failed' ? 'AI 摘要生成失败' : '无 AI 摘要'));
    if (prompt.includes("{HTML_SUMMARY}")) {
      prompt = prompt.replace("{HTML_SUMMARY}", summaryStr);
    }

    // Replace HTML_SECTION
    const htmlStr = htmlContent || "无 HTML 文件内容";
    if (prompt.includes("{HTML_SECTION}")) {
      prompt = prompt.replace("{HTML_SECTION}", htmlStr);
    } else {
      // Optional: Append if missing, but better to respect template
    }

    // Replace DATA_SECTION
    if (prompt.includes("{DATA_SECTION}")) {
      prompt = prompt.replace("{DATA_SECTION}", dataStr);
    } else {
      prompt = `${prompt}\n\n${dataStr}`;
    }
    setFullPrompt(prompt);
  };

  const handleSaveTemplate = () => {
    localStorage.setItem(`analysis_template_${uuid}`, promptTemplate);
    alert("模板保存成功");
  };

  const handleAnalyze = async () => {
    if (!uuid) return;

    // We don't check for local user settings here as closely because context handles it with user object passed
    // But good to keep user object check if we want validation before calling context

    try {
      await startAnalysis(uuid, fullPrompt, user);
    } catch (e) {
      // Error handling is mostly done in context and stored in state
      console.error("Analysis failed to start", e);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-green-600 text-white p-4 rounded-t-lg shadow flex items-center gap-2">
        <Bot size={24} />
        <h2 className="text-xl font-bold">智能分析 - {task?.title}</h2>
      </div>

      {/* Info Bar */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-yellow-800 flex justify-between items-center -mt-6 rounded-t-none">
        <div className="text-sm">
          当前使用 <span className="font-bold">{user?.ai_model || '默认'}</span> 模型处理分析。如需修改 API Token，请点击右侧按钮。
        </div>
        <button
          onClick={() => navigate('/profile?tab=ai')}
          className="border border-blue-400 text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-50 bg-white"
        >
          修改API Token
        </button>
      </div>

      {/* Tip */}
      <div className="bg-cyan-50 border-l-4 border-cyan-400 p-4 text-cyan-800 text-sm flex items-center gap-2">
        <Lightbulb size={18} />
        如果您已经生成了HTML网页，请先上传到任务中，稍作等待就能在提示词中看到分析结果。
      </div>

      {/* Template Settings */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-cyan-500 text-white p-3 font-bold flex items-center gap-2">
          <Settings size={18} /> 提示词模板设置
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            您可以在这里设置提示词模板（不包含数据部分）。每次生成报告时，系统会自动将最新数据插入到模板中。在模板中使用 <span className="text-red-500 font-mono">{`{DATA_SECTION}`}</span> 作为数据占位符，<span className="text-red-500 font-mono">{`{HTML_SUMMARY}`}</span> 作为 AI 摘要占位符，<span className="text-red-500 font-mono">{`{HTML_SECTION}`}</span> 作为原始 HTML 内容占位符。
          </p>

          <label className="block text-sm font-bold text-gray-700 mb-2">提示词模板:</label>
          <textarea
            className="w-full border p-3 rounded h-48 font-mono text-sm mb-2"
            value={promptTemplate}
            onChange={e => setPromptTemplate(e.target.value)}
          />
          <p className="text-xs text-gray-500 mb-4">提示：使用 <span className="text-red-500">{`{DATA_SECTION}`}</span> , <span className="text-red-500">{`{HTML_SUMMARY}`}</span> 和 <span className="text-red-500">{`{HTML_SECTION}`}</span> 占位符来指定内容插入位置。</p>

          <button
            onClick={handleSaveTemplate}
            className="w-full bg-cyan-500 text-white py-2 rounded hover:bg-cyan-600 flex justify-center items-center gap-2"
          >
            <Save size={18} /> 保存模板
          </button>
        </div>
      </div>

      {/* Full Prompt Editor */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-blue-200">
        <div className="bg-blue-600 text-white p-3 font-bold flex items-center gap-2">
          <FileText size={18} /> 提示词编辑
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            下方显示的是完整的提示词（包含数据部分），您可以查看和修改后开始生成分析报告：
          </p>

          <textarea
            className="w-full border p-3 rounded h-64 font-mono text-sm mb-4 bg-gray-50"
            value={fullPrompt}
            onChange={e => setFullPrompt(e.target.value)}
          />

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2 text-lg shadow-md"
          >
            {analyzing ? '分析中 (请稍候)...' : <><Bot size={24} /> 开始生成报告</>}
          </button>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-green-500">
          <h3 className="font-bold text-lg mb-4 text-green-700">分析报告</h3>
          <div className="prose max-w-none bg-gray-50 p-4 rounded whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
