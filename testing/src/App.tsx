import * as React from 'react';
import { Plus, Calendar as CalendarIcon, DollarSign, CheckSquare, Clock, MapPin, AlertCircle, Trash2, Edit2, X, ChevronRight, PieChart, Car, Settings } from 'lucide-react';
import { User, StudentEvent, Task, Budget, Priority, EventType } from './types';
import { Marketplace } from './components/Marketplace';
import { AdminDashboard } from './components/AdminDashboard';
import { BudgetAnalytics } from './components/BudgetAnalytics';
import { Timetable } from './components/Timetable';
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SplashScreen } from './components/SplashScreen';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { AIChatbot } from './components/AIChatbot';
import { SettingsPage } from './components/SettingsPage';
import { sendEmail } from './services/emailService';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

import { supabase } from './services/supabase';

function App() {
  const [showSplash, setShowSplash] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [authView, setAuthView] = React.useState<'login' | 'signup' | 'forgot-password'>('login');
  const [events, setEvents] = React.useState<StudentEvent[]>([]);
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'calendar' | 'events' | 'marketplace' | 'admin' | 'settings'>('dashboard');
  const [showEventModal, setShowEventModal] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<StudentEvent | null>(null);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [calendarView, setCalendarView] = React.useState<'month' | 'week'>('month');
  const [attendees, setAttendees] = React.useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = React.useState(false);

  // Check for active session on load
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || 'User',
          email: session.user.email || '',
          role: session.user.user_metadata?.role || 'student',
        });
        setIsAuthenticated(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
         setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || 'User',
          email: session.user.email || '',
          role: session.user.user_metadata?.role || 'student',
        });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch events from Supabase
  const fetchEvents = React.useCallback(async () => {
    if (!user) {
        console.log("No user, skipping fetchEvents");
        return;
    }
    console.log("Fetching events for user:", user.id);
    try {
      // 1. Fetch Events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id); // RLS handles this, but explicit check is ok

      if (eventsError) throw eventsError;

      // 2. Fetch Tasks & Budget Items for these events (Basic relational fetch)
      // ideally we would use a join, but for simplicity with our types:
      const fullEvents = await Promise.all(eventsData.map(async (evt) => {
         const { data: tasks } = await supabase.from('tasks').select('*').eq('event_id', evt.id);
         const { data: budgetItems } = await supabase.from('budget_items').select('*').eq('event_id', evt.id);
         
         const mappedTasks: Task[] = (tasks || []).map(t => ({
            id: t.id,
            title: t.title,
            status: t.completed ? 'Completed' : 'Pending',
            deadline: t.deadline?.split('T')[0], // Extract YYYY-MM-DD
         }));

         const mappedBudget: Budget[] = (budgetItems || []).map(b => ({
            id: b.id,
            itemId: b.id,
            description: b.description,
            estimatedCost: b.amount,
            actualCost: b.amount, // Using same amount for now
            paid: b.paid || false
         }));

         return {
           id: evt.id,
           title: evt.title,
           date: evt.date,
           time: evt.time,
           location: evt.location || '',
           type: (evt.type as EventType) || 'Personal',
           priority: (evt.priority as Priority) || 'Medium',
           description: evt.description || '',
           tasks: mappedTasks,
           budgetItems: mappedBudget,
           totalBudget: evt.total_budget || 0,
           totalSpent: evt.total_spent || 0,
         } as StudentEvent;
      }));
      
      setEvents(fullEvents);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      // alert(`Failed to fetch events: ${err.message}`); // Optional: alert user
    }
  }, [user]);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      fetchEvents();
    }
  }, [isAuthenticated, user, fetchEvents]);

  // Dashboard Stats
  const stats = React.useMemo(() => {
    const totalEvents = events.length;
    const upcomingEvents = events.filter(e => new Date(e.date + 'T' + e.time) > new Date()).length;
    const highPriority = events.filter(e => e.priority === 'High').length;
    const totalBudget = events.reduce((acc, curr) => acc + curr.totalBudget, 0);
    const totalSpent = events.reduce((acc, curr) => acc + curr.totalSpent, 0);
    return { totalEvents, upcomingEvents, highPriority, totalBudget, totalSpent };
  }, [events]);

  const sortedEvents = React.useMemo(() => {
    return [...events].sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime());
  }, [events]);

  const handleDeleteEvent = (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(e => e.id !== id));
      if (selectedEvent?.id === id) setSelectedEvent(null);
    }
  };

  const handleSaveEvent = async (event: StudentEvent) => {
    if (!user) return;

    // Determine if we are creating or updating
    const isNew = !events.find(e => e.id === event.id);

    let savedEventId = event.id;
    let eventData: any = {};

    try {
      // 1. Upsert Event
      eventData = {
          user_id: user.id,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          location: event.location,
          type: event.type, // Save 'Organizer' type directly
          priority: event.priority,
          total_budget: event.totalBudget,
          total_spent: event.totalSpent
      };

      if (isNew) {
         // Insert
         const { data, error } = await supabase.from('events').insert(eventData).select().single();
         if (error) throw error;
         savedEventId = data.id;
      } else {
         // Update
         const { error } = await supabase.from('events').update(eventData).eq('id', event.id);
         if (error) throw error;
      }

      // 2. Handle Tasks
      // First delete existing tasks for this event (simple sync strategy)
      const { error: deleteTasksError } = await supabase.from('tasks').delete().eq('event_id', savedEventId);
      if (deleteTasksError) console.warn("Error clearing old tasks", deleteTasksError); // Not critical if empty

      const { error: deleteBudgetError } = await supabase.from('budget_items').delete().eq('event_id', savedEventId);
      if (deleteBudgetError) console.warn("Error clearing old budget", deleteBudgetError);

      // Insert Tasks with correct event_ID
      if (event.tasks.length > 0) {
        const { error: tasksError } = await supabase.from('tasks').insert(
          event.tasks.map(t => ({
            // id: t.id, // Let DB generate task IDs to avoid conflicts? Or keep consistent? 
            // If we keep consistent, we need to ensure they don't exist.
            // Since we just deleted them, we can potentially reuse IDs OR let DB gen new ones.
            // Safest -> No ID (let DB gen)
            event_id: savedEventId,
            title: t.title,
            completed: t.status === 'Completed',
            deadline: t.deadline
          }))
        );
        if (tasksError) throw tasksError;
      }

      // Insert Budget Items
      if (event.budgetItems.length > 0) {
        const { error: budgetError } = await supabase.from('budget_items').insert(
          event.budgetItems.map(b => ({
            event_id: savedEventId,
            description: b.description,
            amount: b.estimatedCost,
            paid: b.paid,
            category: 'General'
          }))
        );
        if (budgetError) throw budgetError;
      }

      // Update Local State (Refetching is safest, but we can manually update)
      // fetchEvents(); // Uncomment to force refresh
      // For now, update local state manually to avoid network roundtrip delay
      const updatedEvent = { ...event, id: savedEventId };
      
      if (isNew) {
        setEvents(prev => [...prev, updatedEvent]);
      } else {
        setEvents(prev => prev.map(e => (e.id === savedEventId ? updatedEvent : e)));
      }
      
      setShowEventModal(false);
      setSelectedEvent(null);
      alert('Event saved successfully!');

    } catch (error: any) {
      console.error('Error saving event:', error);
      
      // Auto-fix for missing profile (FK violation on user_id)
      // Looser check: error code MIGHT be 23503, but message is reliable.
      const isFKError = error.code === '23503' || 
                        error.message?.includes('foreign key constraint') || 
                        error.details?.includes('Key (user_id)=');

      if (isFKError) {
          console.log("Attempting to auto-create missing profile...");
          // Try to create the profile if it's missing
          if(user) {
             const { error: profileErr } = await supabase.from('profiles').upsert({
                 id: user.id,
                 full_name: user.name,
                 role: user.role,
                 email: user.email,
                 updated_at: new Date().toISOString()
             });
             
             if (!profileErr) {
                 console.log("Profile created. Retrying save...");
                 // Retry saving the event once
                 try {
                     if (isNew) {
                         const { data, error: retryError } = await supabase.from('events').insert(eventData).select().single();
                         if (retryError) throw retryError;
                         savedEventId = data.id;
                     } else {
                         const { error: retryError } = await supabase.from('events').update(eventData).eq('id', event.id);
                         if (retryError) throw retryError;
                     }
                     // If we reach here, retry succeeded. Continue with tasks...
                     // (We need to extract the task logic to a function to reuse it properly, but for now duplicate the happy path or alert success)
                     alert('Event saved successfully (profile created)!');
                     
                     // Need to update UI manually since happy path below was skipped
                     const updatedEvent = { ...event, id: savedEventId };
                     if (isNew) setEvents(prev => [...prev, updatedEvent]);
                     else setEvents(prev => prev.map(e => (e.id === savedEventId ? updatedEvent : e)));

                     setShowEventModal(false);
                     setSelectedEvent(null);
                     return;

                 } catch (retryFail: any) {
                     alert(`Failed even after creating profile: ${retryFail.message}`);
                     return;
                 }
             } else {
                 console.error("Failed to create missing profile:", profileErr);
                 alert(`Autofix failed: Could not create profile. ${profileErr.message}`);
                 return;
             }
          }
      }

      alert(`Failed to save event to database: ${error.message || error.details || 'Unknown error'} (Code: ${error.code})`);
    }
  };

  const handleAddEvents = async (newEvents: StudentEvent[]) => {
    if (!user) return;
    try {
      const dbEvents = newEvents.map(event => {
        // Ensure ID is a valid UUID or let Supabase generate one if it's a temp ID
        // Note: crypto.randomUUID() generates a valid UUID v4, so length check isn't strictly necessary if using that, but safe.
        // If event.id came from our frontend generator it is valid UUID. 
        // BUT for bulk insert, ideally we let DB generate ID or we must be sure it's unique.
        // Let's rely on DB generation for clean slate.
        
        let safeType = event.type;
        // Double check against allowed values just in case Timetable passed something odd
        if (!['Academic', 'Social', 'Personal', 'Work'].includes(safeType as string)) {
             // Fallback to 'Personal' if it's not one of the allowed 4
             safeType = 'Personal' as any;
        }

        const eventData: any = {
          user_id: user.id,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          location: event.location,
          type: safeType,
          priority: event.priority,
          total_budget: event.totalBudget,
          total_spent: event.totalSpent
        };
        
        return eventData;
      });

      const { data, error } = await supabase.from('events').insert(dbEvents).select(); // .select() returns the inserted rows with their new IDs
      
      if (error) {
         console.error("Supabase Insert Error:", error);
         throw error;
      }

      // Map back the generated IDs to our local state so React keys are stable and we can edit them immediately
      if (data) {
          // Simply reloading events from DB is safer after a bulk insert
          fetchEvents(); 
      }
      
      alert('Schedules saved successfully!');
    } catch (error: any) {
       console.error('Error saving events:', error);
       alert(`Failed to save schedules: ${error.message || 'Check console'}`);
    }
  };

  // Helper handling time string "HH:mm"
  const addHoursToTime = (timeStr: string, hours: number) => {
    const [h, m] = timeStr.split(':').map(Number);
    const newH = (h + hours) % 24;
    return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Register for Event (with conflict detection and rescheduling)
  const handleRegisterEvent = async (event: StudentEvent) => {
    // 1. Check for conflicts
    const conflict = events.find(e => 
      e.date === event.date && 
      e.time === event.time 
    ); // Simple exact match for now. Ideally check duration.

    if (conflict) {
      if (conflict.type === 'Academic') {
        alert(`Cannot register for "${event.title}" because you have a class "${conflict.title}" at this time.`);
        return;
      } else {
        // Dynamic Rescheduling Logic
        // Move the conflicting event to 1 hour later (or next slot)
        const newTime = addHoursToTime(conflict.time, 1); // Helper needed
        // Check if new time also has conflict? For simplicity, just move once or alert.
        // Let's try to move it to same day next hour.
        
        if (confirm(`You have a conflict with "${conflict.title}". Would you like to reschedule "${conflict.title}" to ${newTime} and register for "${event.title}"?`)) {
            // Update conflicting event
            const updatedConflict = { ...conflict, time: newTime };
            await handleSaveEvent(updatedConflict); // Reuse save logic
            
            // Register new event
            await handleSaveEvent(event);
            return;
        } else {
            return; // User cancelled
        }
      }
    }

    // No conflict, proceed with registration
    try {
        // 1. Register remotely in 'registrations' table (Official Registration)
        // Only do this if it's an Organizer event (Public)
        if (event.type === 'Organizer' || (event as any).organizerName) {
             if (!user) {
                 alert("You must be logged in to register.");
                 return;
             }
             const { error: regError } = await supabase.from('registrations').insert({
                 event_id: event.id,
                 user_id: user.id
             });

             if (regError) {
                 if (regError.code === '23505') {
                     alert("You are already registered for this event.");
                     return;
                 }
                 console.error("Registration error:", regError);
                 alert("Failed to register on server. Adding to personal calendar anyway.");
             }
        }
    } catch (e) {
        console.error("Registration exception:", e);
    }

    // 2. Add to Personal Calendar
    await handleSaveEvent(event);
    
    // Notify user via email
    if (user && user.email) {
       sendEmail(
          user.email,
          `Registration Confirmed: ${event.title}`,
          `You have successfully registered for <strong>${event.title}</strong>.<br>Date: ${event.date}<br>Time: ${event.time}<br>Location: ${event.location}`,
          user.name
       ).catch(err => console.error("Email notification failed", err));
    }
  };

  // Fetch attendees for an event
  const fetchAttendees = async (eventId: string) => {
    setLoadingAttendees(true);
    try {
        const { data, error } = await supabase
            .from('registrations')
            .select(`
                id,
                status,
                created_at,
                profiles:user_id ( full_name, email, role )
            `)
            .eq('event_id', eventId);
        
        if (error) throw error;
        setAttendees(data || []);
    } catch (err: any) {
        console.error("Error fetching attendees:", err);
        alert("Failed to load attendees.");
    } finally {
        setLoadingAttendees(false);
    }
  };

  const updateAttendance = async (registrationId: string, status: string) => {
      try {
          const { error } = await supabase
              .from('registrations')
              .update({ status })
              .eq('id', registrationId);
          
          if (error) throw error;
          
          setAttendees(prev => prev.map(a => 
              a.id === registrationId ? { ...a, status } : a
          ));
      } catch (err: any) {
          console.error("Error updating attendance:", err);
          alert("Failed to update status.");
      }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const handleLogin = (user: User) => {
     setUser(user);
     setIsAuthenticated(true);
     // Set default tab based on role
     if (user.role === 'admin') setActiveTab('admin');
     else if (user.role === 'organizer') setActiveTab('events'); // Organizer starts at events management
     else setActiveTab('dashboard');
  };

  if (!isAuthenticated) {
    if (authView === 'signup') {
      return (
        <SignUpPage 
          onSignUp={handleLogin} 
          onNavigateToLogin={() => setAuthView('login')} 
        />
      );
    }
    if (authView === 'forgot-password') {
      return (
        <ForgotPasswordPage 
          onNavigateToLogin={() => setAuthView('login')} 
        />
      );
    }
    return (
      <LoginPage 
        onLogin={handleLogin} 
        onNavigateToSignUp={() => setAuthView('signup')}
        onNavigateToForgotPassword={() => setAuthView('forgot-password')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {user?.role === 'admin' ? 'SED Admin' : user?.role === 'organizer' ? 'Organizer Portal' : 'Student Event Org'}
                </h1>
                <p className="text-xs text-gray-500">
                  {user?.role === 'admin' ? 'System Management' : user?.role === 'organizer' ? 'Manage Your Events' : 'Plan • Budget • Execute'}
                </p>
              </div>
            </div>
            <nav className="flex space-x-4">
              {user?.role === 'student' && (
                <>
                  <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<PieChart size={18} />} label="Dashboard" />
                  <NavButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={<CheckSquare size={18} />} label="My Events" />
                  <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={18} />} label="Calendar" />
                  <NavButton active={activeTab === 'marketplace'} onClick={() => setActiveTab('marketplace')} icon={<MapPin size={18} />} label="Marketplace" />
                  <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label="Settings" />
                </>
              )}
              
              {user?.role === 'organizer' && (
                <>
                  <NavButton active={activeTab === 'events'} onClick={() => setActiveTab('events')} icon={<CheckSquare size={18} />} label="My Events" />
                  <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={18} />} label="Calendar" />
                  <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label="Settings" />
                </>
              )}

              {user?.role === 'admin' && (
                <>
                    <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<PieChart size={18} />} label="Overview" />
                    <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label="Settings" />
                </>
              )}
            </nav>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 hidden md:block">Hi, {user?.name}</span>
               {user?.role !== 'admin' && (
                <button 
                  onClick={() => { setSelectedEvent(null); setShowEventModal(true); }}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <Plus size={16} /> New Event
                </button>
              )}
              <button 
                onClick={() => { setIsAuthenticated(false); setUser(null); }}
                className="text-sm text-red-600 hover:bg-red-50 px-3 py-1 rounded ml-2"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'marketplace' && <Marketplace onRegister={handleRegisterEvent} />}
        {activeTab === 'admin' && user?.role === 'admin' && (
            <AdminDashboard />
          )}

        {activeTab === 'dashboard' && user?.role === 'student' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Upcoming Events" value={stats.upcomingEvents} icon={<Clock className="text-blue-600" />} />
              <StatCard label="High Priority" value={stats.highPriority} icon={<AlertCircle className="text-red-500" />} />
              <StatCard label="Total Budget" value={`KES ${stats.totalBudget}`} icon={<DollarSign className="text-green-600" />} />
              <StatCard label="Total Spent" value={`KES ${stats.totalSpent}`} icon={<DollarSign className="text-orange-600" />} />
            </div>

            <BudgetAnalytics events={events} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-gray-500" /> Approaching Deadlines
                </h2>
                <div className="space-y-3">
                  {sortedEvents.slice(0, 3).map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition duration-150 cursor-pointer" onClick={() => { setSelectedEvent(event); setShowEventModal(true); }}>
                      <div>
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        <p className="text-sm text-gray-500">{format(new Date(event.date), 'MMM d, yyyy')} • {event.time}</p>
                      </div>
                      <span className={cn("px-2 py-1 text-xs rounded-full font-medium", 
                        event.priority === 'High' ? 'bg-red-100 text-red-700' : 
                        event.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      )}>
                        {event.priority}
                      </span>
                    </div>
                  ))}
                  {sortedEvents.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No upcoming events.</p>}
                </div>
              </div>


              {/* Traffic Alert Widget - Mock */}
              <div className="card border-l-4 border-l-blue-500 bg-blue-50">
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-blue-900">
                    <Car size={20} /> Traffic Status
                  </h2>
                  <p className="text-sm text-blue-700 mb-2">Based on your next class at 09:00 AM:</p>
                  <div className="flex items-center justify-between bg-white p-3 rounded border border-blue-100">
                      <div>
                        <p className="text-xs text-gray-500">To Campus</p>
                        <p className="font-bold text-gray-800">25 mins (Heavier than usual)</p>
                      </div>
                      <div className="text-right">
                         <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">Moderate Traffic</span>
                      </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2 font-medium">Suggestion: Leave by 08:25 AM to arrive on time.</p>
              </div>

              <div className="card">
                 <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckSquare size={20} className="text-gray-500" /> Pending Tasks
                </h2>
                 <div className="space-y-3">
                    {/* Flatten tasks from all events */}
                    {sortedEvents.flatMap(e => e.tasks.map(t => ({...t, eventTitle: e.title}))).filter(t => t.status !== 'Completed').slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-0">
                         <div>
                            <p className="text-sm font-medium text-gray-800">{task.title}</p>
                            <p className="text-xs text-gray-500">{task.eventTitle}</p>
                         </div>
                         <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{task.status}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">All Events</h2>
             </div>
             <div className="grid gap-4">
                {sortedEvents.map(event => (
                  <div key={event.id} className="card group flex flex-col md:flex-row gap-4 p-5 hover:border-blue-200 transition-all shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                         <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{event.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                               <span className="flex items-center gap-1"><CalendarIcon size={14}/> {format(new Date(event.date), 'MMMM d, yyyy')}</span>
                               <span className="flex items-center gap-1"><Clock size={14}/> {event.time}</span>
                               <span className="flex items-center gap-1"><MapPin size={14}/> {event.location}</span>
                            </div>
                            <p className="text-gray-600 mb-3 text-sm line-clamp-2">{event.description}</p>
                         </div>
                         <div className="flex flex-col items-end gap-2">
                            <span className={cn("px-3 py-1 text-xs rounded-full font-bold uppercase", 
                              event.type === 'Academic' ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'
                            )}>
                              {event.type}
                            </span>
                             <span className={cn("px-3 py-1 text-xs rounded-full font-bold uppercase", 
                              event.priority === 'High' ? 'bg-red-100 text-red-700' : 
                              event.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                            )}>
                              {event.priority}
                            </span>
                         </div>
                      </div>
                      
                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-sm border-t border-gray-100 pt-3">
                         <div className="flex flex-col">
                            <span className="text-gray-400 text-xs">Total Budget</span>
                            <span className="font-medium">KES {event.totalBudget}</span>
                         </div>
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xs">Spent</span>
                            <span className={cn("font-medium", event.totalSpent > event.totalBudget ? "text-red-600" : "text-green-600")}>KES {event.totalSpent}</span>
                         </div>
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xs">Tasks</span>
                            <span className="font-medium">{event.tasks.filter(t => t.status === 'Completed').length} / {event.tasks.length} Done</span>
                         </div>
                      </div>
                    </div>
                    
                    <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4">
                       <button onClick={() => { setSelectedEvent(event); setShowEventModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Event">
                          <Edit2 size={18} />
                       </button>
                       <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Event">
                          <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setCalendarView('month')}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                    calendarView === 'month' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  Month View
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                    calendarView === 'week' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  Week Timetable
                </button>
              </div>
            </div>

            {calendarView === 'week' ? (
              <Timetable events={events} onUpdateEvent={handleSaveEvent} onAddEvents={handleAddEvents} />
            ) : (
              <div className="card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">{format(currentDate, 'MMMM yyyy')}</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight className="rotate-180" /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200">Today</button>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight /></button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-500 uppercase">{day}</div>
                  ))}
                  {(() => {
                    const start = startOfMonth(currentDate);
                    const end = endOfMonth(currentDate);
                    const days = eachDayOfInterval({ start, end });
                    const paddingStart = new Array(start.getDay()).fill(null);
                    
                    return [...paddingStart, ...days].map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} className="bg-white p-2 min-h-[100px]" />;
                      
                      const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day));
                      return (
                        <div key={day.toString()} className={cn("bg-white p-2 min-h-[100px] hover:bg-gray-50 transition-colors border-t border-gray-100", 
                          isSameDay(day, new Date()) ? 'bg-blue-50/30' : ''
                        )}>
                            <p className={cn("text-xs font-medium mb-1 inline-block w-6 h-6 text-center leading-6 rounded-full", isSameDay(day, new Date()) ? 'bg-blue-600 text-white' : 'text-gray-500')}>
                              {format(day, 'd')}
                            </p>
                            <div className="space-y-1">
                              {dayEvents.map(e => (
                                <div 
                                    key={e.id} 
                                    onClick={() => { setSelectedEvent(e); setShowEventModal(true); }}
                                    className={cn("text-[10px] px-1 py-0.5 rounded truncate cursor-pointer", 
                                    e.type === 'Academic' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-pink-100 text-pink-700 border border-pink-200')}
                                    title={e.title}
                                >
                                  {e.time} {e.title}
                                </div>
                              ))}
                            </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
            <SettingsPage user={user} />
          )}

        </main>
      
      {/* Modal for Create/Edit Event */}
      {showEventModal && (
        <EventModal 
          event={selectedEvent} 
          onClose={() => { setShowEventModal(false); setSelectedEvent(null); }} 
          onSave={handleSaveEvent} 
          attendees={attendees}
          onFetchAttendees={fetchAttendees}
          loadingAttendees={loadingAttendees}
          onUpdateAttendance={updateAttendance}
          userRole={user?.role}
        />
      )}

      {/* Floating AI Chatbot - Only show when logged in and not admin */}
      {isAuthenticated && user && user.role !== 'admin' && (
        <AIChatbot user={user} events={events} />
      )}
    </div>
  );
}

// Sub-components

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150",
        active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      {icon} {label}
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="card flex items-center p-4">
      <div className="p-3 bg-gray-50 rounded-full mr-4">{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function EventModal({ event, onClose, onSave, attendees, onFetchAttendees, loadingAttendees, onUpdateAttendance, userRole }: { event: StudentEvent | null, onClose: () => void, onSave: (e: StudentEvent) => void, attendees: any[], onFetchAttendees: (eventId: string) => void, loadingAttendees: boolean, onUpdateAttendance: (registrationId: string, status: string) => void, userRole?: string }) {
  const [formData, setFormData] = React.useState<StudentEvent>(event || {
    id: crypto.randomUUID(),
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    location: '',
    type: 'Academic',
    priority: 'Medium',
    description: '',
    tasks: [],
    budgetItems: [],
    totalBudget: 0,
    totalSpent: 0
  });

  const [activeTab, setActiveTab] = React.useState<'details' | 'tasks' | 'budget' | 'attendees'>('details');

  // Determine available tabs
  const tabs = ['details', 'tasks', 'budget'];
  if (userRole === 'organizer' || userRole === 'admin') {
      tabs.push('attendees');
  }

  // Task Handlers
  const addTask = () => {
    const newTask: Task = { id: crypto.randomUUID(), title: 'New Task', status: 'Pending' };
    setFormData({ ...formData, tasks: [...formData.tasks, newTask] });
  };
  
  const updateTask = (id: string, field: keyof Task, value: any) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.map(t => t.id === id ? { ...t, [field]: value } : t)
    });
  };

  const removeTask = (id: string) => {
    setFormData({ ...formData, tasks: formData.tasks.filter(t => t.id !== id) });
  };

  // Budget Handlers
  const addBudgetItem = () => {
    const newItem: Budget = { id: crypto.randomUUID(), itemId: crypto.randomUUID(), description: 'New Item', estimatedCost: 0, actualCost: 0 };
    setFormData({ ...formData, budgetItems: [...formData.budgetItems, newItem] });
  };

  const updateBudgetItem = (id: string, field: keyof Budget, value: any) => {
     const updatedItems = formData.budgetItems.map(i => i.id === id ? { ...i, [field]: value } : i);
     // Recalculate totals
     const totalBudget = updatedItems.reduce((acc, curr) => acc + Number(curr.estimatedCost), 0);
     const totalSpent = updatedItems.reduce((acc, curr) => acc + Number(curr.actualCost), 0);
     
     setFormData({ ...formData, budgetItems: updatedItems, totalBudget, totalSpent });
  };

   const removeBudgetItem = (id: string) => {
     const updatedItems = formData.budgetItems.filter(i => i.id !== id);
     // Recalculate totals
     const totalBudget = updatedItems.reduce((acc, curr) => acc + Number(curr.estimatedCost), 0);
     const totalSpent = updatedItems.reduce((acc, curr) => acc + Number(curr.actualCost), 0);
     setFormData({ ...formData, budgetItems: updatedItems, totalBudget, totalSpent });
  };

  React.useEffect(() => {
    if (event) {
      setFormData({
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        type: event.type,
        priority: event.priority,
        description: event.description,
        tasks: event.tasks,
        budgetItems: event.budgetItems,
        totalBudget: event.totalBudget,
        totalSpent: event.totalSpent
      });
      
      // Fetch attendees for this event
      onFetchAttendees(event.id);
    }
  }, [event, onFetchAttendees]);

  return (
    <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">{event ? 'Edit Event' : 'Create New Event'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><X size={24} /></button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-gray-200 px-6">
           {tabs.map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn("py-3 px-4 text-sm font-medium border-b-2 transition-colors capitalize", 
                  activeTab === tab ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {tab}
              </button>
           ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
           {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                    <input type="text" className="input-field" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Final Exam, Birthday Party" />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" className="input-field" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input type="time" className="input-field" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select 
                        className="input-field" 
                        value={formData.type} 
                        onChange={e => setFormData({...formData, type: e.target.value as EventType})}
                    >
                       {userRole === 'organizer' && <option value="Organizer">Public Event</option>}
                       <option value="Academic">Academic</option>
                       <option value="Personal">Personal</option>
                       <option value="Social">Social</option>
                    </select>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select className="input-field" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as Priority})}>
                       <option value="High">High</option>
                       <option value="Medium">Medium</option>
                       <option value="Low">Low</option>
                    </select>
                 </div>

                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input type="text" className="input-field" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Room 405, Java House" />
                 </div>

                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea className="input-field h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Add details about the event..."></textarea>
                 </div>
              </div>
           )}

           {activeTab === 'tasks' && (
              <div>
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium text-gray-800">To-Do List</h4>
                    <button onClick={addTask} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"><Plus size={16}/> Add Task</button>
                 </div>
                 {formData.tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">No tasks added yet.</div>
                 ) : (
                    <div className="space-y-2">
                       {formData.tasks.map((task, idx) => (
                          <div key={task.id} className="flex gap-2 items-center bg-gray-50 p-2 rounded-md border border-gray-200">
                             <span className="text-gray-400 text-xs w-6">{idx + 1}.</span>
                             <input 
                                type="text" 
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm" 
                                value={task.title} 
                                onChange={e => updateTask(task.id, 'title', e.target.value)} 
                                placeholder="Task description"
                             />
                             <select 
                                className="text-xs border-gray-300 rounded focus:ring-blue-500 bg-white"
                                value={task.status}
                                onChange={e => updateTask(task.id, 'status', e.target.value)}
                             >
                                <option>Pending</option>
                                <option>In Progress</option>
                                <option>Completed</option>
                             </select>
                             <button onClick={() => removeTask(task.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           )}

           {activeTab === 'budget' && (
              <div>
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium text-gray-800">Budget Tracker (KES)</h4>
                    <button onClick={addBudgetItem} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"><Plus size={16}/> Add Item</button>
                 </div>
                 
                 <div className="bg-gray-50 p-4 rounded-lg mb-4 grid grid-cols-2 gap-4">
                    <div>
                       <p className="text-xs text-gray-500">Total Planned</p>
                       <p className="text-lg font-bold text-gray-900">KES {formData.totalBudget}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Total Spent</p>
                       <p className={cn("text-lg font-bold", formData.totalSpent > formData.totalBudget ? "text-red-600" : "text-green-600")}>KES {formData.totalSpent}</p>
                    </div>
                 </div>

                 {formData.budgetItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">No budget items added.</div>
                 ) : (
                    <div className="space-y-2">
                       <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                          <div className="col-span-5">Item</div>
                          <div className="col-span-3">Est. Cost</div>
                          <div className="col-span-3">Actual Cost</div>
                          <div className="col-span-1"></div>
                       </div>
                       {formData.budgetItems.map((item) => (
                          <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-md border border-gray-200">
                             <div className="col-span-5">
                                <input 
                                  type="text" 
                                  className="w-full text-sm border-gray-200 rounded focus:ring-blue-500 focus:border-blue-500" 
                                  value={item.description}
                                  onChange={e => updateBudgetItem(item.id, 'description', e.target.value)}
                                  placeholder="Item name"
                                />
                             </div>
                             <div className="col-span-3">
                                <input 
                                  type="number" 
                                  className="w-full text-sm border-gray-200 rounded focus:ring-blue-500 focus:border-blue-500"
                                  value={item.estimatedCost}
                                  onChange={e => updateBudgetItem(item.id, 'estimatedCost', Number(e.target.value))}
                                />
                             </div>
                             <div className="col-span-3">
                                <input 
                                  type="number" 
                                  className="w-full text-sm border-gray-200 rounded focus:ring-blue-500 focus:border-blue-500"
                                  value={item.actualCost}
                                  onChange={e => updateBudgetItem(item.id, 'actualCost', Number(e.target.value))}
                                />
                             </div>
                             <div className="col-span-1  flex justify-center">
                                <button onClick={() => removeBudgetItem(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           )}

           {activeTab === 'attendees' && (
              <div className="space-y-4">
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium text-gray-800">Event Attendees & Status</h4>
                    <button onClick={() => onFetchAttendees(formData.id)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <CheckSquare size={16} /> Refresh
                    </button>
                 </div>

                 {loadingAttendees ? (
                     <div className="text-center py-8 text-gray-500 italic">Loading registration data...</div>
                 ) : attendees.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        <p>No students have registered for this event yet.</p>
                        <p className="text-xs mt-2">Share your event on the Marketplace!</p>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       {attendees.map((att) => (
                          <div key={att.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 shadow-sm">
                             <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                    {(att.profiles?.full_name?.[0] || 'U').toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{att.profiles?.full_name || 'Unknown Student'}</p>
                                    <p className="text-xs text-gray-500">{att.profiles?.email}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Reg: {new Date(att.created_at).toLocaleDateString()}</p>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-2">
                                <select 
                                    value={att.status} 
                                    onChange={(e) => onUpdateAttendance(att.id, e.target.value)}
                                    className={cn("text-xs border-none rounded-full px-3 py-1 font-medium ring-1 ring-inset focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none", 
                                        att.status === 'registered' ? "bg-blue-50 text-blue-700 ring-blue-600/20" : 
                                        att.status === 'attended' ? "bg-green-50 text-green-700 ring-green-600/20" :
                                        "bg-red-50 text-red-700 ring-red-600/20"
                                    )}
                                >
                                    <option value="registered">Registered</option>
                                    <option value="attended">Attended</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
           <button onClick={onClose} className="btn-secondary">Cancel</button>
           <button onClick={() => onSave(formData)} className="btn-primary">Save Event</button>
        </div>
      </div>
    </div>
  );
}

export default App;
