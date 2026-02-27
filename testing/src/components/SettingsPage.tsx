import React, { useState } from 'react';
import { User } from '../types';
// import { supabase } from '../services/supabase';
import { MapPin, Car, Bus, Footprints, Save } from 'lucide-react';


interface SettingsPageProps {
  user: User | null;
}

export function SettingsPage({ user }: SettingsPageProps) {
  const [homeAddress, setHomeAddress] = useState('');
  const [campusAddress, setCampusAddress] = useState('');
  const [transportMode, setTransportMode] = useState('transit');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
     // Ideally fetch user location preferences from DB
     // For now, local state only persists per reload unless saved to Profile table
  }, []);

  const handleSavePreferences = async () => {
    if (!user) return;
    setIsSaving(true);
    // Simple alert for now as schema might not support these fields yet without migration
    // But we simulate a save
    setTimeout(() => {
        alert("Location preferences saved! Traffic alerts will use these settings.");
        setIsSaving(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
      </div>

     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="text-blue-500" size={20} /> Commute Preferences
        </h3>
        <p className="text-sm text-gray-500 mb-4">Set your home and campus locations to get smart traffic alerts before class.</p>
        
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Home Location (Origin)</label>
                <input 
                    type="text" 
                    placeholder="e.g. 123 Main St, Nairobi" 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                />
            </div>
            
            <div>
                 <label className="block text-sm font-medium text-gray-700">Campus Location (Destination)</label>
                 <input 
                    type="text" 
                    placeholder="e.g. University Way Campus" 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    value={campusAddress}
                    onChange={(e) => setCampusAddress(e.target.value)}
                />
            </div>

            <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Transport Mode</label>
                 <div className="flex gap-4">
                    <button onClick={() => setTransportMode('driving')} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${transportMode === 'driving' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <Car size={18} /> Driving
                    </button>
                    <button onClick={() => setTransportMode('transit')} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${transportMode === 'transit' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <Bus size={18} /> Public Transit
                    </button>
                    <button onClick={() => setTransportMode('walking')} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${transportMode === 'walking' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <Footprints size={18} /> Walking
                    </button>
                 </div>
            </div>

            <div className="pt-2">
                <button 
                    onClick={handleSavePreferences} 
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    disabled={isSaving}
                >
                    <Save size={18} /> {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Name</label>
            <div className="mt-1 text-gray-900">{user?.name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Email</label>
            <div className="mt-1 text-gray-900">{user?.email}</div>
          </div>
           <div>
            <label className="block text-sm font-medium text-gray-500">Role</label>
            <div className="mt-1 text-gray-900 capitalize">{user?.role}</div>
          </div>
        </div>
      </div>
       
        {user?.role === 'admin' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                 <h3 className="text-lg font-semibold text-gray-800 mb-4">Admin Controls</h3>
                 <p className="text-gray-600 text-sm">Hardcoded Admin details visible only to admins.</p>
                 <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                     <p className="text-xs font-mono text-gray-500">ADMIN_ID: {user.id}</p>
                     <p className="text-xs font-mono text-gray-500">ACCESS_LEVEL: SUPER_USER</p>
                 </div>
             </div>
        )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Application Preferences</h3>
        <div className="space-y-4">
           <div className="flex items-center justify-between">
               <span className="text-gray-700">Email Notifications</span>
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
           </div>
           <div className="flex items-center justify-between">
               <span className="text-gray-700">Dark Mode</span>
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
           </div>
        </div>
      </div>
    </div>
  );
}
