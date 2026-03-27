import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import { Save, Image as ImageIcon, Globe } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetchWithAuth('/api/settings');
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetchWithAuth('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage('网站设置已保存');
        setSettings(await res.json());
        // Reload page to apply changes globally
        window.location.reload();
      } else {
        setMessage('保存失败');
      }
    } catch (err) {
      setMessage('保存出错');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-purple-600 text-white p-4 rounded-t-lg shadow">
        <h2 className="text-xl font-bold">网站个性化设置</h2>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-b-lg shadow p-6 -mt-6">
        <div className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Globe size={16} /> 网站名称
            </label>
            <input
              className="w-full border p-2 rounded"
              value={settings.site_name || ''}
              onChange={e => setSettings({ ...settings, site_name: e.target.value })}
              placeholder="LiveForm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <ImageIcon size={16} /> 网站 Logo URL
            </label>
            <input
              className="w-full border p-2 rounded"
              value={settings.logo_url || ''}
              onChange={e => setSettings({ ...settings, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-gray-500 mt-1">请输入图片的完整 URL 地址</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <ImageIcon size={16} /> 网站背景图片 URL
            </label>
            <input
              className="w-full border p-2 rounded"
              value={settings.background_image_url || ''}
              onChange={e => setSettings({ ...settings, background_image_url: e.target.value })}
              placeholder="https://example.com/bg.jpg"
            />
            <p className="text-xs text-gray-500 mt-1">设置后将替换默认的灰色背景</p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 flex items-center gap-2 font-medium shadow-md transition-all"
            >
              <Save size={18} /> {loading ? '保存中...' : '保存设置'}
            </button>
            {message && <span className="ml-3 text-sm text-green-600 font-medium">{message}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
