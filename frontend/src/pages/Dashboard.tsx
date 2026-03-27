import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchWithAuth, API_BASE_URL } from '../utils/api';
import { Plus, BarChart, Trash2, Download, Code, Edit } from 'lucide-react';

export default function Dashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<{ uuid: string, title: string } | null>(null);
  const [successModal, setSuccessModal] = useState<{ title: string, msg: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await fetchWithAuth('/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ msg: "已复制到剪贴板", type: 'success' });
  };

  const handleDeleteClick = (taskUuid: string, taskTitle: string) => {
    setDeleteConfirmTask({ uuid: taskUuid, title: taskTitle });
  };

  const confirmDeleteTask = async () => {
    if (!deleteConfirmTask) return;
    try {
      const res = await fetchWithAuth(`/tasks/${deleteConfirmTask.uuid}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.uuid !== deleteConfirmTask.uuid));
        setSuccessModal({ title: "删除成功", msg: "任务已成功删除" });
      } else {
        setToast({ msg: "删除失败", type: 'error' });
      }
    } catch (e) {
      console.error("Delete failed", e);
      setToast({ msg: "删除出错", type: 'error' });
    } finally {
      setDeleteConfirmTask(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">仪表盘</h2>
        <Link to="/create" className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-md transition-all font-medium">
          <Plus size={20} /> 创建新任务
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all border border-gray-100 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-600 text-white p-3 px-4 font-bold text-lg truncate">
              {task.title}
            </div>

            {/* Content */}
            <div className="p-4 flex-grow space-y-3">
              <div className="text-gray-600 text-sm line-clamp-2 h-10">
                {task.description || "暂无描述"}
              </div>

              <div className="text-xs text-gray-500">
                创建时间: {new Date(task.created_at).toLocaleString()}
              </div>

              <div className="text-sm font-medium text-gray-700">
                提交数量: {task.submission_count || 0}
              </div>

              <div className="pt-2">
                <label className="text-xs font-bold text-gray-600 mb-1 block">数据接口地址 (URL) :</label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <input
                    readOnly
                    value={`${API_BASE_URL}/api/submit/${task.uuid}`}
                    className="flex-grow bg-gray-50 px-2 py-1 text-xs text-gray-600 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => copyToClipboard(`${API_BASE_URL}/api/submit/${task.uuid}`)}
                    className="bg-white px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 border-l border-gray-300 transition-colors"
                  >
                    复制
                  </button>
                </div>
              </div>

              <Link
                to={`/task/${task.uuid}`}
                className="block w-full text-center border border-blue-300 text-blue-500 py-1.5 rounded-xl text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 mt-2 font-medium"
              >
                <Code size={14} /> 查看POST提示词
              </Link>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-3 bg-gray-50 flex justify-between gap-2">
              <Link
                to={`/task/${task.uuid}?view=details`}
                className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 font-medium"
              >
                查看详情
              </Link>

              <Link
                to={`/task/${task.uuid}?view=edit`}
                className="flex-1 bg-white border border-gray-400 text-gray-600 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
              >
                <Edit size={14} /> 修改
              </Link>

              <button className="flex-1 bg-white border border-green-600 text-green-600 py-1.5 rounded-lg text-sm hover:bg-green-50 transition-colors flex items-center justify-center gap-1">
                <Download size={14} /> 导出
              </button>

              <Link
                to={`/task/${task.uuid}?view=analysis`}
                className="flex-1 bg-white border border-blue-400 text-blue-500 py-1.5 rounded-lg text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
              >
                <BarChart size={14} /> 分析
              </Link>

              <button
                onClick={() => handleDeleteClick(task.uuid, task.title)}
                className="flex-1 bg-white border border-red-400 text-red-500 py-1.5 rounded-lg text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-1">
                <Trash2 size={14} /> 删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-800 mb-2">删除任务确认</h3>
            <p className="text-sm text-gray-600 mb-6">
              您确定要删除任务 <span className="font-bold text-red-600">{deleteConfirmTask.title}</span> 吗？<br />
              此操作将删除所有相关数据（提交记录、分析结果），且<span className="font-bold">无法恢复</span>。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmTask(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium text-sm"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteTask}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium text-sm"
              >
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
