import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Email = () => {
  const [accounts, setAccounts] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEmailAccounts();
  }, []);

  const fetchEmailAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/email/accounts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('Error fetching email accounts:', error);
      setMessage('Error fetching email accounts.');
    }
  };

  const handleCreateEmailAccount = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/email/accounts',
        { email: newEmail, password: newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage(response.data.message);
      setNewEmail('');
      setNewPassword('');
      fetchEmailAccounts();
    } catch (error) {
      console.error('Error creating email account:', error);
      setMessage('Error creating email account.');
    }
  };

  const handleDeleteEmailAccount = async (accountId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/email/accounts/${accountId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMessage(response.data.message);
      fetchEmailAccounts();
    } catch (error) {
      console.error('Error deleting email account:', error);
      setMessage('Error deleting email account.');
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/email/send',
        { to: sendTo, subject: sendSubject, body: sendBody },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage(response.data.message);
      setSendTo('');
      setSendSubject('');
      setSendBody('');
    } catch (error) {
      console.error('Error sending email:', error);
      setMessage('Error sending email.');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Email Management</h1>
      {message && <div className="mb-4 text-green-500">{message}</div>}

      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Create New Email Account</h2>
        <form onSubmit={handleCreateEmailAccount} className="space-y-4">
          <div>
            <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="newEmail"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="newPassword"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Create Account
          </button>
        </form>
      </div>

      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Your Email Accounts</h2>
        {accounts.length === 0 ? (
          <p>No email accounts found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {accounts.map((account) => (
              <li key={account.id} className="py-3 flex justify-between items-center">
                <span>{account.email}</span>
                <button
                  onClick={() => handleDeleteEmailAccount(account.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-3">Send Email</h2>
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div>
            <label htmlFor="sendTo" className="block text-sm font-medium text-gray-700">To</label>
            <input
              type="email"
              id="sendTo"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="sendSubject" className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              id="sendSubject"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={sendSubject}
              onChange={(e) => setSendSubject(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="sendBody" className="block text-sm font-medium text-gray-700">Body</label>
            <textarea
              id="sendBody"
              rows="5"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={sendBody}
              onChange={(e) => setSendBody(e.target.value)}
              required
            ></textarea>
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Send Email
          </button>
        </form>
      </div>
    </div>
  );
};

export default Email;


