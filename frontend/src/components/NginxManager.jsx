import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function NginxManager() {
  const [nginxConfig, setNginxConfig] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const fetchNginxConfig = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/nginx/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNginxConfig(response.data.config || 'No configuration available');
    } catch (error) {
      console.error('Error fetching Nginx config:', error);
      setNginxConfig('Error loading configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const updateNginxConfig = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/nginx/config`, {
        config: nginxConfig,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Nginx configuration updated successfully');
    } catch (error) {
      console.error('Error updating Nginx config:', error);
      alert('Failed to update Nginx configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const restartNginx = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/nginx/restart`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Nginx restarted successfully');
    } catch (error) {
      console.error('Error restarting Nginx:', error);
      alert('Failed to restart Nginx');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNginxConfig();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Nginx Manager</h1>
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Nginx Configuration</span>
              <div className="flex space-x-2">
                <Button onClick={fetchNginxConfig} disabled={isLoading}>
                  Refresh
                </Button>
                <Button onClick={updateNginxConfig} disabled={isLoading}>
                  Save Config
                </Button>
                <Button onClick={restartNginx} disabled={isLoading} variant="destructive">
                  Restart Nginx
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={nginxConfig}
              onChange={(e) => setNginxConfig(e.target.value)}
              className="min-h-[400px] font-mono"
              placeholder="Nginx configuration will appear here..."
              disabled={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

