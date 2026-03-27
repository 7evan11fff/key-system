'use client';

import { useState, useEffect, useCallback } from 'react';
import { Software, LicenseKey } from '@/lib/types';

// Get admin token from localStorage
const getToken = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') || '';
};

const setToken = (token: string) => {
  localStorage.setItem('adminToken', token);
};

// API helpers
const api = {
  async get(path: string) {
    const res = await fetch(path, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return res.json();
  },
  async post(path: string, body: object) {
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  async patch(path: string, body: object) {
    const res = await fetch(path, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  async delete(path: string, body: object) {
    const res = await fetch(path, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

// Format date helper
function formatDate(ts: number | null): string {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleString();
}

// Check if expired
function isExpired(ts: number | null): boolean {
  if (!ts) return false;
  return Date.now() > ts;
}

export default function Dashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [software, setSoftware] = useState<Software[]>([]);
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showNewSoftware, setShowNewSoftware] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [editingKey, setEditingKey] = useState<LicenseKey | null>(null);
  
  // Form states
  const [newSoftwareName, setNewSoftwareName] = useState('');
  const [newSoftwareDesc, setNewSoftwareDesc] = useState('');
  const [newKeyNote, setNewKeyNote] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [newKeyHwidLock, setNewKeyHwidLock] = useState(false);

  // Load software list
  const loadSoftware = useCallback(async () => {
    const data = await api.get('/api/admin/software');
    if (data.software) {
      setSoftware(data.software);
      if (data.software.length > 0 && !selectedSoftware) {
        setSelectedSoftware(data.software[0]);
      }
    }
  }, [selectedSoftware]);

  // Load keys for selected software
  const loadKeys = useCallback(async () => {
    if (!selectedSoftware) return;
    setLoading(true);
    const data = await api.get(`/api/admin/keys?softwareId=${selectedSoftware.id}`);
    if (data.keys) {
      setKeys(data.keys);
    }
    setLoading(false);
  }, [selectedSoftware]);

  // Check auth on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      setAuthenticated(true);
      loadSoftware();
    }
  }, [loadSoftware]);

  // Load keys when software changes
  useEffect(() => {
    if (authenticated && selectedSoftware) {
      loadKeys();
    }
  }, [authenticated, selectedSoftware, loadKeys]);

  // Handle login
  const handleLogin = () => {
    setToken(tokenInput);
    setAuthenticated(true);
    loadSoftware();
  };

  // Create software
  const handleCreateSoftware = async () => {
    if (!newSoftwareName) return;
    await api.post('/api/admin/software', {
      name: newSoftwareName,
      description: newSoftwareDesc,
    });
    setNewSoftwareName('');
    setNewSoftwareDesc('');
    setShowNewSoftware(false);
    loadSoftware();
  };

  // Delete software
  const handleDeleteSoftware = async (id: string) => {
    if (!confirm('Delete this software and ALL its keys?')) return;
    await api.delete('/api/admin/software', { id });
    setSelectedSoftware(null);
    loadSoftware();
  };

  // Create key
  const handleCreateKey = async () => {
    if (!selectedSoftware) return;
    
    let expiresAt: number | null = null;
    if (newKeyExpiry) {
      expiresAt = new Date(newKeyExpiry).getTime();
    }
    
    await api.post('/api/admin/keys', {
      softwareId: selectedSoftware.id,
      expiresAt,
      hwidLocked: newKeyHwidLock,
      note: newKeyNote || undefined,
    });
    
    setNewKeyNote('');
    setNewKeyExpiry('');
    setNewKeyHwidLock(false);
    setShowNewKey(false);
    loadKeys();
  };

  // Toggle key enabled
  const handleToggleKey = async (key: LicenseKey) => {
    await api.patch('/api/admin/keys', {
      id: key.id,
      enabled: !key.enabled,
    });
    loadKeys();
  };

  // Reset HWID
  const handleResetHwid = async (key: LicenseKey) => {
    if (!confirm('Reset HWID binding? The key will bind to the next device that uses it.')) return;
    await api.patch('/api/admin/keys', {
      id: key.id,
      hwid: null,
    });
    loadKeys();
  };

  // Delete key
  const handleDeleteKey = async (id: string) => {
    if (!confirm('Delete this key?')) return;
    await api.delete('/api/admin/keys', { id });
    loadKeys();
  };

  // Copy key to clipboard
  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[var(--card)] p-8 rounded-lg border border-[var(--border)] w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6">🔐 Key System</h1>
          <p className="text-[var(--muted)] mb-4">Enter your admin token to continue</p>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Admin Token"
            className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg mb-4 focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            onClick={handleLogin}
            className="w-full p-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg font-medium transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-[var(--card)] border-r border-[var(--border)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <h1 className="text-xl font-bold">🔑 Key System</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider px-2 py-2">
            Software
          </div>
          {software.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSoftware(s)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                selectedSoftware?.id === s.id
                  ? 'bg-[var(--primary)] text-white'
                  : 'hover:bg-[var(--card-hover)]'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        
        <div className="p-2 border-t border-[var(--border)]">
          <button
            onClick={() => setShowNewSoftware(true)}
            className="w-full p-2 bg-[var(--card-hover)] hover:bg-[var(--border)] rounded-lg transition-colors text-sm"
          >
            + Add Software
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {selectedSoftware ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedSoftware.name}</h2>
                {selectedSoftware.description && (
                  <p className="text-[var(--muted)] mt-1">{selectedSoftware.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewKey(true)}
                  className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg font-medium transition-colors"
                >
                  + New Key
                </button>
                <button
                  onClick={() => handleDeleteSoftware(selectedSoftware.id)}
                  className="px-4 py-2 bg-[var(--danger)] hover:bg-[var(--danger-hover)] rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Keys table */}
            <div className="flex-1 overflow-auto p-6">
              {loading ? (
                <div className="text-center text-[var(--muted)] py-12">Loading...</div>
              ) : keys.length === 0 ? (
                <div className="text-center text-[var(--muted)] py-12">
                  No keys yet. Create one to get started.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[var(--muted)] text-sm border-b border-[var(--border)]">
                      <th className="pb-3 font-medium">Key</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Expires</th>
                      <th className="pb-3 font-medium">HWID</th>
                      <th className="pb-3 font-medium">Note</th>
                      <th className="pb-3 font-medium">Uses</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => (
                      <tr key={key.id} className="border-b border-[var(--border)] hover:bg-[var(--card)]">
                        <td className="py-3">
                          <button
                            onClick={() => copyKey(key.key)}
                            className="font-mono text-sm bg-[var(--card)] px-2 py-1 rounded hover:bg-[var(--card-hover)] transition-colors"
                            title="Click to copy"
                          >
                            {key.key}
                          </button>
                        </td>
                        <td className="py-3">
                          {!key.enabled ? (
                            <span className="text-[var(--danger)] text-sm">Disabled</span>
                          ) : isExpired(key.expiresAt) ? (
                            <span className="text-[var(--warning)] text-sm">Expired</span>
                          ) : (
                            <span className="text-[var(--success)] text-sm">Active</span>
                          )}
                        </td>
                        <td className="py-3 text-sm text-[var(--muted)]">
                          {key.expiresAt ? (
                            <span className={isExpired(key.expiresAt) ? 'text-[var(--warning)]' : ''}>
                              {formatDate(key.expiresAt)}
                            </span>
                          ) : (
                            'Never'
                          )}
                        </td>
                        <td className="py-3 text-sm">
                          {key.hwidLocked ? (
                            key.hwid ? (
                              <span className="text-[var(--muted)]" title={key.hwid}>
                                🔒 {key.hwid.slice(0, 8)}...
                              </span>
                            ) : (
                              <span className="text-[var(--warning)]">🔓 Unbound</span>
                            )
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="py-3 text-sm text-[var(--muted)]">
                          {key.note || '—'}
                        </td>
                        <td className="py-3 text-sm text-[var(--muted)]">
                          {key.usageCount}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleToggleKey(key)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                key.enabled
                                  ? 'bg-[var(--warning)] hover:opacity-80 text-black'
                                  : 'bg-[var(--success)] hover:opacity-80 text-black'
                              }`}
                            >
                              {key.enabled ? 'Disable' : 'Enable'}
                            </button>
                            {key.hwidLocked && key.hwid && (
                              <button
                                onClick={() => handleResetHwid(key)}
                                className="px-2 py-1 text-xs bg-[var(--card-hover)] hover:bg-[var(--border)] rounded transition-colors"
                              >
                                Reset HWID
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteKey(key.id)}
                              className="px-2 py-1 text-xs bg-[var(--danger)] hover:bg-[var(--danger-hover)] rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
            Select a software from the sidebar or add a new one
          </div>
        )}
      </div>

      {/* New Software Modal */}
      {showNewSoftware && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)] w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Software</h3>
            <input
              type="text"
              value={newSoftwareName}
              onChange={(e) => setNewSoftwareName(e.target.value)}
              placeholder="Software Name"
              className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg mb-3 focus:outline-none focus:border-[var(--primary)]"
            />
            <input
              type="text"
              value={newSoftwareDesc}
              onChange={(e) => setNewSoftwareDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg mb-4 focus:outline-none focus:border-[var(--primary)]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewSoftware(false)}
                className="flex-1 p-3 bg-[var(--card-hover)] hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSoftware}
                className="flex-1 p-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Key Modal */}
      {showNewKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)] w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create Key</h3>
            
            <div className="mb-3">
              <label className="block text-sm text-[var(--muted)] mb-1">Note (optional)</label>
              <input
                type="text"
                value={newKeyNote}
                onChange={(e) => setNewKeyNote(e.target.value)}
                placeholder="e.g., Customer name or email"
                className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            
            <div className="mb-3">
              <label className="block text-sm text-[var(--muted)] mb-1">Expiration (optional)</label>
              <input
                type="datetime-local"
                value={newKeyExpiry}
                onChange={(e) => setNewKeyExpiry(e.target.value)}
                className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
            
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newKeyHwidLock}
                  onChange={(e) => setNewKeyHwidLock(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>HWID Lock</span>
                <span className="text-sm text-[var(--muted)]">(bind to first device)</span>
              </label>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNewKey(false);
                  setNewKeyNote('');
                  setNewKeyExpiry('');
                  setNewKeyHwidLock(false);
                }}
                className="flex-1 p-3 bg-[var(--card-hover)] hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                className="flex-1 p-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
