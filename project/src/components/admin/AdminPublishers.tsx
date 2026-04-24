import { useEffect, useState } from 'react';
import { getPublishers, createPublisher, updatePublisher, deletePublisher } from '../../services/api';
import Input from '../Input';
import Button from '../Button';

interface Publisher {
  id: string;
  name: string;
  country: string;
  website?: string;
  contact_email?: string;
  is_active: boolean;
}

export default function AdminPublishers() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPublisher, setEditingPublisher] = useState<Publisher | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterCountry, setFilterCountry] = useState('');

  useEffect(() => {
    loadPublishers();
  }, []);

  const loadPublishers = async () => {
    try {
      setLoading(true);
      const data = await getPublishers();
      setPublishers(data);
    } catch (err) {
      console.error('Failed to load publishers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPublisher) return;

    try {
      if (isCreating) {
        await createPublisher(editingPublisher);
      } else {
        await updatePublisher(editingPublisher.id, editingPublisher);
      }
      setEditingPublisher(null);
      setIsCreating(false);
      loadPublishers();
    } catch (err) {
      console.error('Failed to save publisher', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this publisher?')) return;

    try {
      await deletePublisher(id);
      loadPublishers();
    } catch (err) {
      console.error('Failed to delete publisher', err);
    }
  };

  const handleCreate = () => {
    setEditingPublisher({
      id: '',
      name: '',
      country: '',
      website: '',
      contact_email: '',
      is_active: true,
    });
    setIsCreating(true);
  };

  const countries = Array.from(new Set(publishers.map((p) => p.country))).sort();
  const filteredPublishers = filterCountry
    ? publishers.filter((p) => p.country === filterCountry)
    : publishers;

  if (loading) {
    return <div className="text-gray-600 dark:text-gray-400">Loading publishers...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Publishers Management</h2>
        <Button onClick={handleCreate}>Add Publisher</Button>
      </div>

      <div className="mb-6 flex gap-4">
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Countries</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Publisher
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPublishers.map((publisher) => (
              <tr key={publisher.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {publisher.name}
                  </div>
                  {publisher.website && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <a
                        href={publisher.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {publisher.website}
                      </a>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {publisher.country}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {publisher.contact_email || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      publisher.is_active
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {publisher.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setEditingPublisher(publisher);
                      setIsCreating(false);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(publisher.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingPublisher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {isCreating ? 'Add Publisher' : `Edit ${editingPublisher.name}`}
            </h3>

            <div className="space-y-4">
              <Input
                label="Publisher Name"
                value={editingPublisher.name}
                onChange={(e) => setEditingPublisher({ ...editingPublisher, name: e.target.value })}
                required
              />

              <Input
                label="Country"
                value={editingPublisher.country}
                onChange={(e) =>
                  setEditingPublisher({ ...editingPublisher, country: e.target.value })
                }
                required
              />

              <Input
                label="Website"
                value={editingPublisher.website || ''}
                onChange={(e) =>
                  setEditingPublisher({ ...editingPublisher, website: e.target.value })
                }
                placeholder="https://example.com"
              />

              <Input
                label="Contact Email"
                type="email"
                value={editingPublisher.contact_email || ''}
                onChange={(e) =>
                  setEditingPublisher({ ...editingPublisher, contact_email: e.target.value })
                }
                placeholder="contact@publisher.com"
              />

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingPublisher.is_active}
                  onChange={(e) =>
                    setEditingPublisher({ ...editingPublisher, is_active: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Publisher Active</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} className="flex-1">
                {isCreating ? 'Create' : 'Save'}
              </Button>
              <Button
                onClick={() => {
                  setEditingPublisher(null);
                  setIsCreating(false);
                }}
                className="flex-1 bg-gray-300 dark:bg-gray-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
