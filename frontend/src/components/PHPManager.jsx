import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function PHPManager() {
  const [phpVersions, setPhpVersions] = useState([]);
  const [phpSettings, setPhpSettings] = useState({});
  const [selectedVersion, setSelectedVersion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const fetchPhpVersions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/php/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPhpVersions(response.data.versions || []);
    } catch (error) {
      console.error('Error fetching PHP versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPhpSettings = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/php/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPhpSettings(response.data.settings || {});
    } catch (error) {
      console.error('Error fetching PHP settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePhpSettings = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/php/settings`, {
        settings: phpSettings,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('PHP settings updated successfully');
    } catch (error) {
      console.error('Error updating PHP settings:', error);
      alert('Failed to update PHP settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPhpVersions();
      fetchPhpSettings();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">PHP Manager</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>PHP Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select PHP Version" />
                  </SelectTrigger>
                  <SelectContent>
                    {phpVersions.map((version) => (
                      <SelectItem key={version} value={version}>
                        PHP {version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={fetchPhpVersions} disabled={isLoading} className="w-full">
                  Refresh Versions
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>PHP Settings</span>
                <Button onClick={updatePhpSettings} disabled={isLoading}>
                  Save Settings
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Memory Limit</label>
                  <Input
                    value={phpSettings.memory_limit || ''}
                    onChange={(e) => setPhpSettings({...phpSettings, memory_limit: e.target.value})}
                    placeholder="e.g., 256M"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Execution Time</label>
                  <Input
                    value={phpSettings.max_execution_time || ''}
                    onChange={(e) => setPhpSettings({...phpSettings, max_execution_time: e.target.value})}
                    placeholder="e.g., 30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Upload Max Filesize</label>
                  <Input
                    value={phpSettings.upload_max_filesize || ''}
                    onChange={(e) => setPhpSettings({...phpSettings, upload_max_filesize: e.target.value})}
                    placeholder="e.g., 64M"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

