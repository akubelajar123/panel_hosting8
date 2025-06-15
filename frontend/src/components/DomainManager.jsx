import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DomainManager() {
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState({
    name: '',
    type: 'primary'
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const fetchDomains = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/domains`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDomains(response.data.domains || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDomain = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/domains`, newDomain, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewDomain({ name: '', type: 'primary' });
      setShowCreateDialog(false);
      fetchDomains();
      alert('Domain created successfully');
    } catch (error) {
      console.error('Error creating domain:', error);
      alert('Failed to create domain');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDomain = async (domainName) => {
    if (window.confirm(`Are you sure you want to delete domain "${domainName}"?`)) {
      setIsLoading(true);
      try {
        await axios.delete(`${API_URL}/domains/${domainName}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchDomains();
        alert('Domain deleted successfully');
      } catch (error) {
        console.error('Error deleting domain:', error);
        alert('Failed to delete domain');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const checkDomainStatus = async (domainName) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/domains/${domainName}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`Domain Status: ${response.data.status}\nExpiry: ${response.data.expiry || 'Unknown'}`);
    } catch (error) {
      console.error('Error checking domain status:', error);
      alert('Failed to check domain status');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  useEffect(() => {
    if (token) {
      fetchDomains();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Domain Manager</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Domains</span>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>Add Domain</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Domain</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Domain Name</label>
                      <Input
                        placeholder="example.com"
                        value={newDomain.name}
                        onChange={(e) => setNewDomain({...newDomain, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Type</label>
                      <select
                        value={newDomain.type}
                        onChange={(e) => setNewDomain({...newDomain, type: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="primary">Primary</option>
                        <option value="addon">Addon</option>
                        <option value="subdomain">Subdomain</option>
                        <option value="parked">Parked</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                    <Button onClick={createDomain} disabled={isLoading}>Add Domain</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {domains.length === 0 ? (
                <p className="text-gray-600">No domains found.</p>
              ) : (
                <div className="grid gap-4">
                  {domains.map((domain) => (
                    <div
                      key={domain.name}
                      className="flex items-center justify-between p-4 border rounded-lg bg-white"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium">{domain.name}</h3>
                          <Badge className={getStatusColor(domain.status)}>
                            {domain.status || 'active'}
                          </Badge>
                          <Badge variant="outline">
                            {domain.type || 'primary'}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Created: {domain.created_at || 'Unknown'}</p>
                          {domain.expiry && <p>Expires: {domain.expiry}</p>}
                          {domain.document_root && <p>Document Root: {domain.document_root}</p>}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => checkDomainStatus(domain.name)}
                          disabled={isLoading}
                        >
                          Check Status
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`http://${domain.name}`, '_blank')}
                        >
                          Visit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteDomain(domain.name)}
                          disabled={isLoading}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Domain Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {domains.filter(d => d.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active Domains</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {domains.filter(d => d.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending Domains</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {domains.filter(d => d.status === 'expired').length}
                </div>
                <div className="text-sm text-gray-600">Expired Domains</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {domains.length}
                </div>
                <div className="text-sm text-gray-600">Total Domains</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

