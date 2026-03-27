import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateTask from './pages/CreateTask';
import EditTask from './pages/EditTask';
import TaskDetails from './pages/TaskDetails';
import Analysis from './pages/Analysis';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
import AdminSettings from './pages/AdminSettings';
import { useState, useEffect } from 'react';
import { LogOut, Settings, ChevronDown, Wrench } from 'lucide-react';
import MySubmissions from './pages/MySubmissions';
import { fetchWithAuth } from './utils/api';

// Placeholder components until we implement them
const NotFound = () => <div className="p-10 text-center">404 - Not Found</div>;

// Layout component
const Layout = ({ children }: { children: React.ReactNode }) => {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>({ site_name: 'LiveForm' });
  const navigate = useNavigate();

  useEffect(() => {
    setUsername(localStorage.getItem('username') || 'User');
    setRole(localStorage.getItem('role') || 'student');
    loadSiteSettings();
  }, []);

  const loadSiteSettings = async () => {
    try {
      const res = await fetchWithAuth('/api/settings');
      if (res.ok) {
        const settings = await res.json();
        setSiteSettings(settings);
        document.title = settings.site_name || 'LiveForm';
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const bgStyle = siteSettings.background_image_url
    ? { backgroundImage: `url(${siteSettings.background_image_url})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }
    : {};

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col transition-all duration-500" style={bgStyle}>
      {/* Overlay for readability if bg image exists */}
      {siteSettings.background_image_url && <div className="absolute inset-0 bg-white/80 z-0 fixed"></div>}

      <header className="bg-white/90 backdrop-blur-md text-gray-800 p-4 shadow-sm border-b border-gray-200 z-50 sticky top-0">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold flex items-center gap-3 cursor-pointer text-blue-600" onClick={() => navigate('/dashboard')}>
              {siteSettings.logo_url && <img src={siteSettings.logo_url} alt="Logo" className="h-8 w-8 object-contain" />}
              {siteSettings.site_name}
              <span className="text-xs font-normal text-gray-500 hidden sm:inline-block">| 简易表单数据回收系统</span>
            </h1>
            <nav className="flex gap-1 text-sm hidden md:flex">
              <Link to="/dashboard" className="px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-gray-600 font-medium">仪表盘</Link>
              <Link to="/create" className="px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-gray-600 font-medium">创建任务</Link>
              <Link to="/my-submissions" className="px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-gray-600 font-medium">我的提交</Link>
              {(role === 'admin' || role === 'teacher') && (
                <Link to="/users" className="px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-gray-600 font-medium">用户管理</Link>
              )}
            </nav>
          </div>

          <div className="relative">
            <button
              className="flex items-center gap-2 text-sm hover:bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 transition-all shadow-sm bg-white"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-gray-700">{username}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-50 text-gray-700 border border-gray-100 overflow-hidden ring-1 ring-black/5">
                  <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                    <p className="text-xs text-gray-500">已登录为</p>
                    <p className="font-bold text-gray-800 truncate">{username}</p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  </div>

                  <div onClick={() => setDropdownOpen(false)}>
                    <Link to="/profile" className="block px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                      <Settings size={16} className="text-gray-400" /> 个人设置
                    </Link>

                    {role === 'admin' && (
                      <Link to="/admin/settings" className="block px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-purple-600">
                        <Wrench size={16} /> 网站设置
                      </Link>
                    )}

                    <div className="h-px bg-gray-100 my-1"></div>

                    <button
                      className="block w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} /> 退出登录
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto p-6 flex-grow z-10 relative">
        {children}
      </main>
      <footer className="bg-white/80 backdrop-blur border-t border-gray-200 text-gray-500 p-4 text-center text-xs z-10">
        2025© {siteSettings.site_name}. Powered by LiveForm.
      </footer>
    </div>
  );
};

// Protected Route wrapper (mock)
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" />;
  if (adminOnly && role !== 'admin') return <Navigate to="/dashboard" />;

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/create" element={<ProtectedRoute><CreateTask /></ProtectedRoute>} />
      <Route path="/task/:uuid/edit" element={<ProtectedRoute><EditTask /></ProtectedRoute>} />
      <Route path="/task/:uuid" element={<ProtectedRoute><TaskDetails /></ProtectedRoute>} />
      <Route path="/analysis/:uuid" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/my-submissions" element={<ProtectedRoute><MySubmissions /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute adminOnly={true}><AdminSettings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
