import { useState } from 'react';
import { RefreshCw, AlertTriangle, FileUp, Loader, Key } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { StudentEvent, Task } from '../types';

interface TimetableProps {
  events: StudentEvent[];
  onUpdateEvent: (event: StudentEvent) => void;
  onAddEvents?: (events: StudentEvent[]) => void;
}

export function Timetable({ events, onUpdateEvent, onAddEvents }: TimetableProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('AIzaSyCcJBVFj9lFB-_SkfHrVyqGNxZu2VQ6GMU');


  // Function to process timetable with Gemini
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!apiKey) {
      alert("Please enter a Google Gemini API Key first.");
      return;
    }

    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result?.toString().split(',')[1];
        
        if (base64String) {
          try {
            const { GoogleGenerativeAI } = await import("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `
              Analyze this timetable image. Extract all the classes/events.
              
              RULES:
              1. For "Academic" events (classes, lectures, labs), set "priority" to "High".
              2. For "Academic" events, generate 2-3 relevant study tasks (e.g., "Review notes", "Complete assignment", "Prepare for quiz") and include them in the "tasks" array.
              3. "Academic" events must have a budget of 0.
              4. Return ONLY a valid JSON array with no extra text or markdown formatting.
              
              The start date for "Monday" of the current week is ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')}.
              Calculate the correct date for each day of the week based on this start date.
              
              Format:
              [
                { 
                  "title": "Class Name", 
                  "date": "YYYY-MM-DD", 
                  "time": "HH:MM", 
                  "type": "Academic", 
                  "priority": "High", 
                  "description": "Extracted from timetable",
                  "tasks": [
                    { "title": "Review lecture notes", "status": "Pending" },
                    { "title": "Check for assignments", "status": "Pending" }
                  ]
                }
              ]
            `;
            
            // Use JSON mode for cleaner output
            const result = await model.generateContent([
              prompt,
              {
                inlineData: {
                  data: base64String,
                  mimeType: file.type || "image/jpeg",
                },
              },
            ], {
                generationConfig: { responseMimeType: "application/json" }
            } as any);

            const response = await result.response;
            const text = response.text();
            
            // Clean the response (remove ```json block)
            let cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBracket = cleanJson.indexOf('[');
            const lastBracket = cleanJson.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1) {
                cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
            }

            console.log("Gemini Raw Response:", text); // Debugging
            console.log("Cleaned JSON:", cleanJson);   // Debugging

            let extractedEvents;
            try {
               extractedEvents = JSON.parse(cleanJson);
            } catch (jsonError) {
               console.error("JSON Parse Error:", jsonError);
               alert("Failed to parse schedule from AI response.");
               setIsProcessing(false);
               return;
            }

            // Helper to map AI types to allowed DB types
            const mapEventType = (type: string): string => {
                if (!type) return 'Academic';
                const lower = type.toLowerCase();
                if (['class', 'lecture', 'lab', 'exam', 'quiz', 'study', 'school', 'university', 'assignment', 'homework'].some(t => lower.includes(t))) return 'Academic';
                if (['party', 'club', 'hangout', 'date', 'friend', 'meetup'].some(t => lower.includes(t))) return 'Social';
                if (['job', 'work', 'meeting', 'shift', 'interview', 'career'].some(t => lower.includes(t))) return 'Work';
                if (['personal', 'gym', 'health', 'doctor', 'appointment', 'errand'].some(t => lower.includes(t))) return 'Personal';
                
                // Fallback: If it matches exactly one of the known types (case-insensitive) return it properly capitalized
                if (lower === 'academic') return 'Academic';
                if (lower === 'social') return 'Social';
                if (lower === 'personal') return 'Personal';
                if (lower === 'work') return 'Work';

                return 'Personal'; // Safe default
            };

            // Check if extractedEvents is valid array before proceeding
            if (Array.isArray(extractedEvents) && extractedEvents.length > 0) {
                 if (confirm(`Gemini found ${extractedEvents.length} events. Add them?`)) {
                    if (onAddEvents) {
                        const newEvents = extractedEvents.map((evt: any) => ({
                            id: crypto.randomUUID(), // Temp ID
                            title: evt.title,
                            date: evt.date,
                            time: evt.time,
                            location: 'TBD',
                            type: mapEventType(evt.type),
                            priority: mapEventType(evt.type) === 'Academic' ? 'High' : (evt.priority || 'Medium'), // Enforce High for Academic
                            description: evt.description || 'Extracted via Gemini Vision',
                            tasks: Array.isArray(evt.tasks) ? evt.tasks.map((t: any) => ({
                                id: crypto.randomUUID(),
                                title: t.title || "Study Task",
                                status: 'Pending',
                                deadline: evt.date // Default deadline to event date
                            })) : [],
                            budgetItems: [],
                            totalBudget: 0,
                            totalSpent: 0
                        }));
                        onAddEvents(newEvents as any);
                    } else {
                        // THIS BRANCH IS LIKELY UNUSED IF onAddEvents IS PROVIDED
                        // Fallback for individual updates (may have race conditions if called rapidly)
                        console.warn("Using fallback per-item update, which is less efficient.");
                        extractedEvents.forEach((evt: any) => {
                            const newEvent: StudentEvent = {
                               id: crypto.randomUUID(),
                               title: evt.title,
                               date: evt.date,
                               time: evt.time,
                               location: 'TBD',
                               type: mapEventType(evt.type) as any,
                               priority: evt.priority || 'Medium',
                               description: evt.description || 'Extracted via Gemini Vision',
                               tasks: [],
                               budgetItems: [],
                               totalBudget: 0,
                               totalSpent: 0
                            };
                            onUpdateEvent(newEvent);
                        });
                    }
                    // alert('Timetable imported successfully!'); // Moved into App.tsx handleAddEvents for better success tracking
                 }
            } else {
                alert('Could not find any clear timetable events in the image.');
            }

          } catch (error: any) {
            console.error("Gemini/Processing Error:", error);
            alert(`Failed to process image with Gemini: ${error.message || 'Check your API Key and image.'}`);
          }
        }
        setIsProcessing(false);
      };
      reader.onerror = () => {
         setIsProcessing(false);
         alert("Failed to read the file.");
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("File Read Error:", error);
      setIsProcessing(false);
      alert("An error occurred while starting the upload.");
    }
  };
  
  // Get start of the week (Monday)
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  // Flatten events and tasks into timetable items
  const items = events.flatMap(event => [
    {
      id: event.id,
      type: 'event',
      title: event.title,
      date: parseISO(event.date),
      time: event.time,
      originalData: event
    },
    ...event.tasks.filter(t => t.deadline).map(task => ({
      id: task.id,
      type: 'task',
      title: `${task.title} (Task)`,
      date: parseISO(task.deadline!),
      time: '09:00', // Default task time
      originalEvent: event,
      originalData: task
    }))
  ]);

  const handleReschedule = (item: any) => {
    // Dynamic rescheduling logic (simplified)
    // Find next available day next week same time
    const newDate = addDays(item.date, 7);
    const dateStr = format(newDate, 'yyyy-MM-dd');
    
    if (confirm(`Reschedule "${item.title}" to next week (${dateStr})?`)) {
        if (item.type === 'event') {
            const updatedEvent = { ...item.originalData, date: dateStr };
            onUpdateEvent(updatedEvent);
        } else {
            // For tasks we need to update the parent event's task list
            const parentEvent = item.originalEvent;
            const updatedTasks = parentEvent.tasks.map((t: Task) => 
                t.id === item.id ? { ...t, deadline: dateStr } : t
            );
            onUpdateEvent({ ...parentEvent, tasks: updatedTasks });
        }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
        <div>
          <h3 className="font-bold text-blue-900 flex items-center gap-2">
            <FileUp size={20} /> Smart Timetable Import
          </h3>
          <p className="text-sm text-blue-700">Upload your class timetable (Image/PDF) and our AI will auto-schedule your week.</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-gray-400" />
              <input 
                type="password" 
                placeholder="Paste Gemini API Key" 
                className="text-sm border border-gray-300 rounded px-2 py-1 w-48"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <label className={`cursor-pointer bg-white ${apiKey ? 'text-blue-600' : 'text-gray-400'} px-4 py-2 rounded-md font-medium border border-blue-200 hover:bg-blue-50 transition-colors flex items-center gap-2`}>
               {isProcessing ? <Loader className="animate-spin" size={18} /> : <FileUp size={18} />}
               {isProcessing ? 'Processing...' : 'Upload Timetable'}
               <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} disabled={isProcessing || !apiKey} />
            </label>
        </div>
      </div>

      <div className="flex justify-between items-center mb-2">
        <button 
          onClick={() => setCurrentDate(addDays(currentDate, -7))}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-1"
        >
          &lt; Previous Week
        </button>
        <span className="font-semibold text-gray-700">
          {format(startDate, 'MMMM d')} - {format(addDays(startDate, 6), 'MMMM d, yyyy')}
        </span>
        <button 
          onClick={() => setCurrentDate(addDays(currentDate, 7))}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-1"
        >
          Next Week &gt;
        </button>
      </div>

      <div className="flex flex-col h-[600px] border border-gray-200 rounded-lg bg-white overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {weekDays.map(day => (
            <div key={day.toString()} className={`p-4 text-center border-r border-gray-200 last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-blue-50' : ''}`}>
              <p className="text-xs font-semibold text-gray-500 uppercase">{format(day, 'EEE')}</p>
              <p className={`text-lg font-bold mt-1 ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'}`}>{format(day, 'd')}</p>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDays.map(day => {
            const dayItems = items.filter(item => isSameDay(item.date, day));
            return (
              <div key={day.toString()} className="border-r border-gray-200 last:border-r-0 p-2 space-y-2 bg-white hover:bg-gray-50 transition-colors">
                {dayItems.length > 0 ? dayItems.map((item, idx) => (
                   <div key={`${item.id}-${idx}`} className={`p-2 rounded border text-xs relative group ${item.type === 'event' ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-purple-50 border-purple-100 text-purple-800'}`}>
                      <div className="font-semibold truncate">{item.time}</div>
                      <div className="line-clamp-2" title={item.title}>{item.title}</div>
                      
                      {/* Dynamic Reschedule Button */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleReschedule(item); }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-white rounded text-gray-500 hover:text-blue-600 transition-all"
                        title="Reschedule to next week"
                      >
                       <RefreshCw size={12} />
                      </button>
                   </div>
                )) : (
                   <div className="h-full flex items-center justify-center">
                   </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => setCurrentDate(addDays(currentDate, -7))}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 mr-2"
        >
          &lt; Prev Week
        </button>
        <span className="font-semibold text-gray-700 mr-2">
          {format(startDate, 'MMM d')} - {format(addDays(startDate, 6), 'MMM d, yyyy')}
        </span>
        <button 
          onClick={() => setCurrentDate(addDays(currentDate, 7))}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          Next Week &gt;
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
         <AlertTriangle className="text-blue-600 shrink-0 mt-0.5" size={20} />
         <div>
           <h4 className="font-bold text-blue-900 text-sm">Dynamic Rescheduling Active</h4>
           <p className="text-sm text-blue-700 mt-1">
             The system automatically detects conflicts. Hover over any item and click the reschedule icon <RefreshCw size={12} className="inline"/> to automatically move an item to the same time next week.
           </p>
         </div>
      </div>
    </div>
  );
}
