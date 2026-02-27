import {useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';

interface OrganizerEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  organizerName?: string;
  category: string;
  price?: number;
  image?: string;
}

interface MarketplaceProps {
  onRegister: (event: any) => void; 
}

export function Marketplace({ onRegister }: MarketplaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, profiles:user_id(full_name)')
        .eq('type', 'Organizer')
        .order('date', { ascending: true });

      if (error) throw error;

      if (data) {
        const mappedEvents: OrganizerEvent[] = data.map((e: any) => ({
          id: e.id,
          title: e.title,
          description: e.description || '',
          date: e.date,
          time: e.time,
          location: e.location || 'TBA',
          organizerName: e.profiles?.full_name || 'Organizer',
          category: 'Event',
          price: 0,
          image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
        }));
        setEvents(mappedEvents);
      }
    } catch (err: any) {
      console.error('Error fetching marketplace events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => 
    (categoryFilter === 'All' || event.category === categoryFilter) &&
    (event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (event.organizerName && event.organizerName.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const categories = ['All', ...Array.from(new Set(events.map(e => e.category)))];

  if (loading) return <div className="text-center p-8">Loading events...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Event Marketplace</h2>
          <p className="text-gray-500">Discover events from campus organizers</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button onClick={fetchEvents} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200" title="Refresh">
            <RefreshCw size={18} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search events..." 
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="border border-gray-200 rounded-md px-4 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-red-500 bg-red-50 p-6 rounded-lg">
           <p className="text-lg font-semibold">{error}</p>
        </div>
      )}

      {!loading && !error && filteredEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 bg-gray-50 p-8 rounded-lg">
          <Calendar size={48} className="mb-4 text-gray-400" />
          <p className="text-xl font-semibold mb-2">No events currently</p>
          <p>Check back later for new events from student organizers.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map(event => (
          <div key={event.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition duration-200 flex flex-col">
            <div className="h-40 bg-gray-200 relative">
               <img 
                 src={event.image || `https://source.unsplash.com/random/800x600/?${event.category.toLowerCase()}`} 
                 alt={event.title}
                 className="w-full h-full object-cover"
                 onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x400?text=Event+Image'; }}
               />
               <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded text-xs font-bold text-blue-600 shadow-sm">
                 {event.category}
               </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                   <h3 className="font-bold text-lg text-gray-900 text-left line-clamp-1">{event.title}</h3>
                   <p className="text-sm text-blue-600 font-medium">{event.organizerName || 'Organizer'}</p>
                </div>
                <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                  {event.price === 0 || !event.price ? 'FREE' : `KES ${event.price}`}
                </div>
              </div>
              
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">{event.description}</p>
              
              <div className="space-y-2 mt-auto">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar size={16} className="mr-2 text-gray-400" />
                  {event.date}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock size={16} className="mr-2 text-gray-400" />
                  {event.time}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin size={16} className="mr-2 text-gray-400" />
                  {event.location}
                </div>
              </div>
              
              <button 
                onClick={() => {
                  const newEvent = {
                    id: crypto.randomUUID(),
                    title: event.title,
                    date: event.date,
                    time: event.time,
                    location: event.location,
                    description: event.description || `Registered from Marketplace (${event.organizerName})`,
                    type: 'Social', 
                    priority: 'Medium',
                    totalBudget: event.price || 0,
                    totalSpent: 0,
                    tasks: [],
                    budgetItems: []
                  };
                  onRegister(newEvent);
                }}
                className="mt-4 w-full active:scale-[.98] transition-transform btn-primary flex justify-center items-center gap-2"
              >
                Register Now <ExternalLink size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
