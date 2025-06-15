import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DatabaseManager() {
  const [databases, setDatabases] = useState([]);
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [databaseUsers, setDatabaseUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const fetchDatabases = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/databases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDatabases(response.data.databases || []);
    } catch (error) {
      console.error('Error fetching databases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDatabase = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/databases`, {
        name: newDatabaseName,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewDatabaseName('');
      setShowCreateDialog(false);
      fetchDatabases();
      alert('Database created successfully');
    } catch (error) {
      console.error('Error creating database:', error);
      alert('Failed to create database');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDatabase = async (databaseName) => {
    if (window.confirm(`Are you sure you want to delete database "${databaseName}"?`)) {
      setIsLoading(true);
      try {
        await axios.delete(`${API_URL}/databases/${databaseName}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchDatabases();
        alert('Database deleted successfully');
      } catch (error) {
        console.error('Error deleting database:', error);
        alert('Failed to delete database');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const fetchDatabaseUsers = async (databaseName) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/databases/${databaseName}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDatabaseUsers(response.data.users || []);
      setSelectedDatabase(databaseName);
    } catch (error) {
      console.error('Error fetching database users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDatabaseUser = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/databases/${selectedDatabase}/users`, {
        username: newUserName,
        password: newUserPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewUserName('');
      setNewUserPassword('');
      setShowCreateUserDialog(false);
      fetchDatabaseUsers(selectedDatabase);
      alert('Database user created successfully');
    } catch (error) {
      console.error('Error creating database user:', error);
      alert('Failed to create database user');
    } finally {
      setIsLoading(false);
    }
  };

  const backupDatabase = async (databaseName) => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/databases/${databaseName}/backup`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Database backup initiated successfully');
    } catch (error) {
      console.error('Error backing up database:', error);
      alert('Failed to backup database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDatabases();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Database Manager</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Databases</span>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button>Create Database</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Database</DialogTitle>
                    </DialogHeader>
                    <Input
                      placeholder="Database Name"
                      value={newDatabaseName}
                      onChange={(e) => setNewDatabaseName(e.target.value)}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                      <Button onClick={createDatabase} disabled={isLoading}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {databases.length === 0 ? (
                  <p className="text-gray-600">No databases found.</p>
                ) : (
                  databases.map((db) => (
                    <div
                      key={db.name}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <span className="font-medium">{db.name}</span>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => fetchDatabaseUsers(db.name)}
                          disabled={isLoading}
                        >
                          Users
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => backupDatabase(db.name)}
                          disabled={isLoading}
                        >
                          Backup
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteDatabase(db.name)}
                          disabled={isLoading}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Database Users {selectedDatabase && `(${selectedDatabase})`}</span>
                {selectedDatabase && (
                  <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
                    <DialogTrigger asChild>
                      <Button>Create User</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Database User</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Username"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                        />
                        <Input
                          type="password"
                          placeholder="Password"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateUserDialog(false)}>Cancel</Button>
                        <Button onClick={createDatabaseUser} disabled={isLoading}>Create</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {!selectedDatabase ? (
                  <p className="text-gray-600">Select a database to view users.</p>
                ) : databaseUsers.length === 0 ? (
                  <p className="text-gray-600">No users found for this database.</p>
                ) : (
                  databaseUsers.map((user) => (
                    <div
                      key={user.username}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <span className="font-medium">{user.username}</span>
                      <span className="text-sm text-gray-500">{user.permissions}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

