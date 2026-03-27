import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { Upload } from 'lucide-react';

export default function EditTask() {
  const { uuid } = useParams<{ uuid: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTask();
  }, [uuid]);

  const loadTask = async () => {
    try {
      const res = await fetchWithAuth(`/tasks/${uuid}`);
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title);
        setDescription(data.description || '');
      } else {
        alert("Failed to load task");
        navigate('/dashboard');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.append('title', title);
    if (description) formData.append('description', description);
    if (file) formData.append('file', file);

    try {
      // Note: We don't set Content-Type header so browser sets it with boundary for FormData

      const res = await fetchWithAuth(`/tasks/${uuid}`, {
        method: 'PUT',
        body: formData,
      });

      if (res.ok) {
        navigate(`/task/${uuid}`);
      } else {
        alert("Failed to update task");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-xl font-bold mb-6 bg-blue-600 text-white p-3 rounded-t-xl -mt-6 -mx-6 text-center shadow-sm">修改任务</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">任务标题</label>
          <input
            className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
            placeholder="请输入任务标题"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">任务描述 (可选)</label>
          <textarea
            className="w-full border border-gray-300 p-3 rounded-xl h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
            placeholder="请输入任务描述"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">HTML文件 (上传以替换现有文件)</label>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".html"
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-blue-300 rounded-xl p-6 flex flex-col items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors gap-2"
          >
            <Upload size={32} />
            <span className="font-medium">{file ? file.name : "点击选择新 HTML 文件"}</span>
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">如果不上传，则保留原文件</p>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={() => navigate(`/task/${uuid}`)}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow-md"
          >
            {saving ? (file ? '保存中(后台生成摘要)...' : '保存中...') : '保存修改'}
          </button>
        </div>
      </form>
    </div>
  );
}