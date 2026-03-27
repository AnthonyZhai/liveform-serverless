import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import { Upload } from 'lucide-react';

export default function CreateTask() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('title', title);
    if (description) formData.append('description', description);
    if (file) formData.append('file', file);

    try {
      // Note: We don't set Content-Type header so browser sets it with boundary for FormData
      const res = await fetchWithAuth('/tasks', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/task/${data.uuid}`);
      } else {
        alert("Failed to create task");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-xl font-bold mb-6 bg-blue-600 text-white p-3 rounded-t-xl -mt-6 -mx-6 text-center shadow-sm">创建数据任务</h2>

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
          <label className="block text-sm font-medium mb-2 text-gray-700">HTML文件 (可选)</label>
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
            <span className="font-medium">{file ? file.name : "点击选择 HTML 文件"}</span>
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">您可以稍后在“任务修改”中上传</p>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow-md"
          >
            {loading ? (file ? '创建中(后台生成摘要)...' : '创建中...') : '创建任务'}
          </button>
        </div>
      </form>
    </div>
  );
}
