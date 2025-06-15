import { useState, useEffect } from 'react';
import apiService from '../lib/api';

export default function SSLManager() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sslStats, setSSLStats] = useState({});
  const [checkDomain, setCheckDomain] = useState('');
  const [checkResult, setCheckResult] = useState(null);

  const [newCertificate, setNewCertificate] = useState({
    domain: '',
    type: 'self_signed',
    certificate: '',
    private_key: '',
    auto_renew: false
  });

  useEffect(() => {
    loadCertificates();
    loadSSLStats();
  }, [selectedDomain]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSSLCertificates(selectedDomain);
      setCertificates(response.certificates || []);
    } catch (err) {
      setError('Gagal memuat SSL certificates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSSLStats = async () => {
    try {
      const response = await apiService.getSSLStats();
      setSSLStats(response);
    } catch (err) {
      console.error('Gagal memuat SSL stats:', err);
    }
  };

  const handleCreateCertificate = async (e) => {
    e.preventDefault();
    try {
      await apiService.createSSLCertificate(newCertificate);
      setShowCreateForm(false);
      setNewCertificate({
        domain: '',
        type: 'self_signed',
        certificate: '',
        private_key: '',
        auto_renew: false
      });
      loadCertificates();
      loadSSLStats();
    } catch (err) {
      setError('Gagal membuat SSL certificate: ' + err.message);
    }
  };

  const handleDeleteCertificate = async (certId) => {
    if (confirm('Apakah Anda yakin ingin menghapus SSL certificate ini?')) {
      try {
        await apiService.deleteSSLCertificate(certId);
        loadCertificates();
        loadSSLStats();
      } catch (err) {
        setError('Gagal menghapus SSL certificate: ' + err.message);
      }
    }
  };

  const handleCheckSSL = async (e) => {
    e.preventDefault();
    try {
      const response = await apiService.checkSSL(checkDomain);
      setCheckResult(response);
    } catch (err) {
      setError('Gagal check SSL: ' + err.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'revoked': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getExpiryColor = (days) => {
    if (days < 7) return 'text-red-600';
    if (days < 30) return 'text-orange-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">SSL Certificate Manager</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tambah SSL Certificate
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* SSL Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Certificates</h3>
          <p className="text-3xl font-bold text-blue-600">{sslStats.total || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Active</h3>
          <p className="text-3xl font-bold text-green-600">{sslStats.active || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Expired</h3>
          <p className="text-3xl font-bold text-red-600">{sslStats.expired || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Expiring Soon</h3>
          <p className="text-3xl font-bold text-orange-600">{sslStats.expiring_soon || 0}</p>
        </div>
      </div>

      {/* SSL Check Tool */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">SSL Certificate Checker</h2>
        <form onSubmit={handleCheckSSL} className="flex gap-4 mb-4">
          <input
            type="text"
            value={checkDomain}
            onChange={(e) => setCheckDomain(e.target.value)}
            placeholder="Masukkan domain (contoh: google.com)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Check SSL
          </button>
        </form>

        {checkResult && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">SSL Check Result for {checkResult.domain}:</h3>
            {checkResult.valid ? (
              <div className="space-y-2 text-sm">
                <p><strong>Status:</strong> <span className="text-green-600">Valid</span></p>
                <p><strong>Common Name:</strong> {checkResult.common_name}</p>
                <p><strong>Issuer:</strong> {checkResult.issuer}</p>
                <p><strong>Valid From:</strong> {new Date(checkResult.not_before).toLocaleDateString()}</p>
                <p><strong>Valid Until:</strong> {new Date(checkResult.not_after).toLocaleDateString()}</p>
                <p><strong>Days Until Expiry:</strong> 
                  <span className={getExpiryColor(checkResult.days_until_expiry)}>
                    {checkResult.days_until_expiry} days
                  </span>
                </p>
                {checkResult.san && checkResult.san.length > 0 && (
                  <p><strong>Subject Alternative Names:</strong> {checkResult.san.join(', ')}</p>
                )}
              </div>
            ) : (
              <p className="text-red-600">SSL Certificate tidak valid: {checkResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Filter by Domain:</label>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Domains</option>
            {/* Add domain options here */}
          </select>
          <button
            onClick={loadCertificates}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Certificates List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">SSL Certificates</h2>
        </div>
        
        {certificates.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Tidak ada SSL certificates ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issuer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto Renew</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cert.domain}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cert.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(cert.status)}`}>
                        {cert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cert.issuer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cert.not_after ? (
                        <div>
                          <div>{new Date(cert.not_after).toLocaleDateString()}</div>
                          <div className={`text-xs ${getExpiryColor(cert.days_until_expiry)}`}>
                            {cert.days_until_expiry} days left
                          </div>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cert.auto_renew ? (
                        <span className="text-green-600">✓ Enabled</span>
                      ) : (
                        <span className="text-gray-400">✗ Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleDeleteCertificate(cert.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Certificate Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create SSL Certificate</h2>
            <form onSubmit={handleCreateCertificate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <input
                  type="text"
                  value={newCertificate.domain}
                  onChange={(e) => setNewCertificate({...newCertificate, domain: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newCertificate.type}
                  onChange={(e) => setNewCertificate({...newCertificate, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="self_signed">Self-Signed</option>
                  <option value="uploaded">Upload Certificate</option>
                  <option value="letsencrypt">Let's Encrypt</option>
                </select>
              </div>

              {newCertificate.type === 'uploaded' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certificate (PEM)</label>
                    <textarea
                      value={newCertificate.certificate}
                      onChange={(e) => setNewCertificate({...newCertificate, certificate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="4"
                      placeholder="-----BEGIN CERTIFICATE-----"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Private Key (PEM)</label>
                    <textarea
                      value={newCertificate.private_key}
                      onChange={(e) => setNewCertificate({...newCertificate, private_key: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="4"
                      placeholder="-----BEGIN PRIVATE KEY-----"
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_renew"
                  checked={newCertificate.auto_renew}
                  onChange={(e) => setNewCertificate({...newCertificate, auto_renew: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="auto_renew" className="text-sm text-gray-700">Auto Renew</label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Certificate
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

