import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function FileManager() {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFile, setEditingFile] = useState({ path: '', content: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const fetchFiles = async (path = '/') => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/files`, {
        params: { path },
        headers: { Authorization: `Bearer ${token}` },
      });
      setFiles(response.data.files || []);
      setCurrentPath(path);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createFolder = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/files/create-folder`, {
        path: currentPath,
        name: newFolderName,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewFolderName('');
      setShowCreateDialog(false);
      fetchFiles(currentPath);
      alert('Folder created successfully');
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFile = async (fileName) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      setIsLoading(true);
      try {
        await axios.delete(`${API_URL}/files/delete`, {
          data: { path: currentPath, name: fileName },
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchFiles(currentPath);
        alert('File deleted successfully');
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Failed to delete file');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const editFile = async (fileName) => {
    const filePath = currentPath === '/' ? fileName : `${currentPath}/${fileName}`;
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/files/edit`, {
        params: { path: filePath },
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditingFile({
        path: filePath,
        content: response.data.content
      });
      setShowEditDialog(true);
    } catch (error) {
      console.error('Error loading file for edit:', error);
      alert('Failed to load file for editing');
    } finally {
      setIsLoading(false);
    }
  };

  const saveFile = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/files/edit`, {
        path: editingFile.path,
        content: editingFile.content
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowEditDialog(false);
      setEditingFile({ path: '', content: '' });
      alert('File saved successfully');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save file');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToFolder = (folderName) => {
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    fetchFiles(newPath);
  };

  const navigateUp = () => {
    if (currentPath !== '/') {
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
      fetchFiles(parentPath);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isTextFile = (fileName) => {
    const textExtensions = ['.txt', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.xml', '.md', '.py', '.php', '.java', '.c', '.cpp', '.h', '.sql', '.sh', '.yml', '.yaml', '.ini', '.conf', '.log'];
    return textExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  useEffect(() => {
    if (token) {
      fetchFiles();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">File Manager</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span>Current Path: {currentPath}</span>
                {currentPath !== '/' && (
                  <Button size="sm" variant="outline" onClick={navigateUp}>
                    ← Back
                  </Button>
                )}
              </div>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>Create Folder</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                  </DialogHeader>
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                    <Button onClick={createFolder} disabled={isLoading}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {files.length === 0 ? (
                <p className="text-gray-600">This folder is empty.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left">Name</th>
                        <th className="border border-gray-300 p-2 text-left">Type</th>
                        <th className="border border-gray-300 p-2 text-left">Size</th>
                        <th className="border border-gray-300 p-2 text-left">Modified</th>
                        <th className="border border-gray-300 p-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr key={file.name}>
                          <td className="border border-gray-300 p-2">
                            {file.type === 'directory' ? (
                              <button
                                onClick={() => navigateToFolder(file.name)}
                                className="text-blue-600 hover:underline font-medium"
                              >
                                📁 {file.name}
                              </button>
                            ) : (
                              <span>📄 {file.name}</span>
                            )}
                          </td>
                          <td className="border border-gray-300 p-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              file.type === 'directory' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {file.type}
                            </span>
                          </td>
                          <td className="border border-gray-300 p-2">
                            {file.type === 'directory' ? '-' : formatFileSize(file.size)}
                          </td>
                          <td className="border border-gray-300 p-2">{file.modified}</td>
                          <td className="border border-gray-300 p-2">
                            <div className="flex space-x-1">
                              {file.type === 'file' && isTextFile(file.name) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => editFile(file.name)}
                                  disabled={isLoading}
                                >
                                  Edit
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteFile(file.name)}
                                disabled={isLoading}
                              >
                                Delete
                              </Button>
                            </div>
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

        {/* File Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Edit File: {editingFile.path}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <textarea
                value={editingFile.content}
                onChange={(e) => setEditingFile({...editingFile, content: e.target.value})}
                className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm"
                placeholder="File content..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={saveFile} disabled={isLoading}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

