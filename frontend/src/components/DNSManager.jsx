import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DNSManager() {
  const [dnsRecords, setDnsRecords] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [newRecord, setNewRecord] = useState({
    name: '',
    type: 'A',
    value: '',
    ttl: '3600'
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV'];

  const fetchDomains = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/domains`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDomains(response.data.domains || []);
      if (response.data.domains && response.data.domains.length > 0) {
        setSelectedDomain(response.data.domains[0].name);
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDnsRecords = async (domain) => {
    if (!domain) return;
    
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/dns/records`, {
        params: { domain },
        headers: { Authorization: `Bearer ${token}` },
      });
      setDnsRecords(response.data.records || []);
    } catch (error) {
      console.error('Error fetching DNS records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDnsRecord = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/dns/records`, {
        domain: selectedDomain,
        ...newRecord
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewRecord({ name: '', type: 'A', value: '', ttl: '3600' });
      setShowCreateDialog(false);
      fetchDnsRecords(selectedDomain);
      alert('DNS record created successfully');
    } catch (error) {
      console.error('Error creating DNS record:', error);
      alert('Failed to create DNS record');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDnsRecord = async (recordId) => {
    if (window.confirm('Are you sure you want to delete this DNS record?')) {
      setIsLoading(true);
      try {
        await axios.delete(`${API_URL}/dns/records/${recordId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchDnsRecords(selectedDomain);
        alert('DNS record deleted successfully');
      } catch (error) {
        console.error('Error deleting DNS record:', error);
        alert('Failed to delete DNS record');
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchDomains();
    }
  }, [token]);

  useEffect(() => {
    if (selectedDomain) {
      fetchDnsRecords(selectedDomain);
    }
  }, [selectedDomain]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">DNS Manager</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Domain</label>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={isLoading}
          >
            <option value="">Select a domain</option>
            {domains.map((domain) => (
              <option key={domain.name} value={domain.name}>
                {domain.name}
              </option>
            ))}
          </select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>DNS Records for {selectedDomain || 'No domain selected'}</span>
              {selectedDomain && (
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button>Add Record</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create DNS Record</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <Input
                          placeholder="www"
                          value={newRecord.name}
                          onChange={(e) => setNewRecord({...newRecord, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                          value={newRecord.type}
                          onChange={(e) => setNewRecord({...newRecord, type: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          {recordTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Value</label>
                        <Input
                          placeholder="192.168.1.1"
                          value={newRecord.value}
                          onChange={(e) => setNewRecord({...newRecord, value: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">TTL</label>
                        <Input
                          placeholder="3600"
                          value={newRecord.ttl}
                          onChange={(e) => setNewRecord({...newRecord, ttl: e.target.value})}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                      <Button onClick={createDnsRecord} disabled={isLoading}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {!selectedDomain ? (
                <p className="text-gray-600">Please select a domain to view DNS records.</p>
              ) : dnsRecords.length === 0 ? (
                <p className="text-gray-600">No DNS records found for this domain.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left">Name</th>
                        <th className="border border-gray-300 p-2 text-left">Type</th>
                        <th className="border border-gray-300 p-2 text-left">Value</th>
                        <th className="border border-gray-300 p-2 text-left">TTL</th>
                        <th className="border border-gray-300 p-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dnsRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="border border-gray-300 p-2">{record.name}</td>
                          <td className="border border-gray-300 p-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              record.type === 'A' ? 'bg-blue-100 text-blue-800' :
                              record.type === 'CNAME' ? 'bg-green-100 text-green-800' :
                              record.type === 'MX' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.type}
                            </span>
                          </td>
                          <td className="border border-gray-300 p-2">{record.value}</td>
                          <td className="border border-gray-300 p-2">{record.ttl}</td>
                          <td className="border border-gray-300 p-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteDnsRecord(record.id)}
                              disabled={isLoading}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

