import React, { useState } from 'react';
import axios from 'axios';

const Terminal = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const handleCommandSubmit = async (e) => {
    e.preventDefault();
    setOutput('');
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/terminal/execute',
        { command },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setOutput(response.data.output);
      setError(response.data.error);
    } catch (err) {
      console.error('Error executing command:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.error || err.response.data.message);
        setOutput(err.response.data.output || '');
      } else {
        setError('An unexpected error occurred.');
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Terminal</h1>
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <form onSubmit={handleCommandSubmit} className="space-y-4">
          <div>
            <label htmlFor="command" className="block text-sm font-medium text-gray-700">Command</label>
            <input
              type="text"
              id="command"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Execute
          </button>
        </form>
      </div>

      {(output || error) && (
        <div className="bg-gray-800 text-white p-4 rounded-lg font-mono text-sm">
          {output && (
            <pre className="whitespace-pre-wrap">
              {output}
            </pre>
          )}
          {error && (
            <pre className="whitespace-pre-wrap text-red-400">
              {error}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default Terminal;


