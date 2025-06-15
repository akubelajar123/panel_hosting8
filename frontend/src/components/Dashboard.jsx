import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Server, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Globe, 
  Database, 
  Mail, 
  Shield,
  Terminal,
  FileText,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stats = [
    { label: 'CPU Usage', value: 25, icon: Cpu, color: 'bg-blue-500' },
    { label: 'RAM Usage', value: 50, icon: MemoryStick, color: 'bg-green-500' },
    { label: 'Storage', value: 23, icon: HardDrive, color: 'bg-yellow-500' },
    { label: 'Bandwidth', value: 10, icon: Globe, color: 'bg-purple-500' },
  ];

  const menuItems = [
    { label: 'Dashboard', icon: Server, path: '/dashboard' },
    { label: 'File Manager', icon: FileText, path: '/files' },
    { label: 'Nginx', icon: Settings, path: '/nginx' },
    { label: 'PHP', icon: Settings, path: '/php' },
    { label: 'Database', icon: Database, path: '/database' },
    { label: 'Domains', icon: Globe, path: '/domains' },
    { label: 'DNS', icon: Settings, path: '/dns' },
    { label: 'SSL Certificates', icon: Shield, path: '/ssl' },
    { label: 'Email', icon: Mail, path: '/email' },
    { label: 'Terminal', icon: Terminal, path: '/terminal' },
  ];

  const quickActions = [
    { label: 'Create Domain', action: () => {} },
    { label: 'Upload Files', action: () => {} },
    { label: 'Manage DNS', action: () => {} },
  ];

  const notifications = [
    { message: 'SSL certificate expires in 30 days', type: 'warning' },
    { message: 'Backup completed successfully', type: 'success' },
    { message: 'New domain added: example.com', type: 'info' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Hosting Panel</h1>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="mt-6 px-3">
          {menuItems.map((item, index) => (
            <Button
              key={index}
              variant={location.pathname === item.path ? "default" : "ghost"}
              className="w-full justify-start mb-1"
              onClick={() => item.path && navigate(item.path)}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard</h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Welcome, <span className="font-medium">{user?.username}</span>
                <Badge variant="secondary" className="ml-2">{user?.role}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard content */}
        <main className="p-6">
          {/* Server Statistics */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Server Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}%</p>
                      </div>
                      <div className={`p-3 rounded-full ${stat.color}`}>
                        <stat.icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Progress value={stat.value} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.map((action, index) => (
                  <Button key={index} variant="outline" className="w-full justify-start">
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {notifications.map((notification, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notification.type === 'warning' ? 'bg-yellow-500' :
                      notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <p className="text-sm text-gray-700 dark:text-gray-300">{notification.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

