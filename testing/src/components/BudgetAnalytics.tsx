import { useState } from 'react';
import { TrendingDown, TrendingUp, AlertCircle, Bot, Loader } from 'lucide-react';
import { StudentEvent } from '../types';
import { askAI, initGemini } from '../services/gemini';

interface BudgetAnalyticsProps {
  events: StudentEvent[];
}

export function BudgetAnalytics({ events }: BudgetAnalyticsProps) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

  // Derived state (moved up so getBudgetAdvice can access it)
  const totalBudget = events.reduce((acc, curr) => acc + curr.totalBudget, 0);
  const totalSpent = events.reduce((acc, curr) => acc + curr.totalSpent, 0);
  const variance = totalBudget - totalSpent;
  const percentageSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const highestSpendingEvent = [...events].sort((a, b) => b.totalSpent - a.totalSpent)[0];
  const overBudgetEvents = events.filter(e => e.totalSpent > e.totalBudget);
  
  const getBudgetAdvice = async () => {
     // prompt user for key if not already set globally (handling this simply for now)
     // Use the provided API key directly
     const apiKey = "AIzaSyCcJBVFj9lFB-_SkfHrVyqGNxZu2VQ6GMU"; 
     
     setIsLoadingAdvice(true);
     initGemini(apiKey);
     
     const context = `
       Analyze this student budget:
       Total Budget: ${totalBudget}
       Total Spent: ${totalSpent}
       Events: ${JSON.stringify(events.map(e => ({ title: e.title, budget: e.totalBudget, spent: e.totalSpent })))}
       
       Give 3 specific, short tips to save money based on this data.
     `;
     
     try {
        const response = await askAI(context);
        setAdvice(response);
     } catch (e) {
        alert("Failed to get advice.");
     } finally {
        setIsLoadingAdvice(false);
     }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Budget Analytics</h2>
        <button 
          onClick={getBudgetAdvice}
          disabled={isLoadingAdvice}
          className="flex items-center gap-2 text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-200 transition-colors"
        >
           {isLoadingAdvice ? <Loader size={16} className="animate-spin" /> : <Bot size={16} />}
           {isLoadingAdvice ? 'Analyzing...' : 'Get AI Advice'}
        </button>
      </div>

      {advice && (
        <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg mb-6 text-sm text-purple-900 whitespace-pre-line">
           <h4 className="font-bold mb-2 flex items-center gap-2"><Bot size={16}/> AI Insights</h4>
           {advice}
        </div>
      )}


      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">KES {totalBudget.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Spent</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">KES {totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Remaining Variance</p>
          <p className={`text-2xl font-bold mt-1 ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
             {variance >= 0 ? '+' : ''}KES {variance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Budget Utilization</span>
          <span className="text-sm font-medium text-gray-700">{percentageSpent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className={`h-4 rounded-full transition-all duration-500 ${percentageSpent > 100 ? 'bg-red-500' : percentageSpent > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(percentageSpent, 100)}%` }}
          ></div>
        </div>
        {percentageSpent > 100 && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={14} /> You have exceeded your total budget!
          </p>
        )}
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Highest Spending Event */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" /> Highest Spending Event
          </h3>
          {highestSpendingEvent ? (
            <div>
              <p className="text-lg font-medium">{highestSpendingEvent.title}</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">Budget</p>
                  <p className="font-bold">KES {highestSpendingEvent.totalBudget}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-xs text-gray-500">Spent</p>
                  <p className="font-bold text-blue-700">KES {highestSpendingEvent.totalSpent}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>

        {/* Over Budget Alerts */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" /> Budget Alerts
          </h3>
          {overBudgetEvents.length > 0 ? (
            <div className="space-y-3">
              {overBudgetEvents.map(event => (
                <div key={event.id} className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-100">
                  <span className="text-sm font-medium text-red-800">{event.title}</span>
                  <span className="text-sm font-bold text-red-800">
                    Over by KES {(event.totalSpent - event.totalBudget).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-32 text-green-600">
               <TrendingDown size={32} className="mb-2" />
               <p className="text-sm font-medium">All events are within budget!</p>
             </div>
          )}
        </div>
      </div>
      
      {/* Event Breakdown Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 text-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
           <h3 className="font-bold text-gray-900">Event Budget Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Event</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Budget</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Spent</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Variation</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">% Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map(event => {
                 const pct = event.totalBudget > 0 ? (event.totalSpent / event.totalBudget) * 100 : 0;
                 return (
                   <tr key={event.id} className="hover:bg-gray-50">
                     <td className="px-6 py-4 font-medium text-gray-900">{event.title}</td>
                     <td className="px-6 py-4 text-right">KES {event.totalBudget.toLocaleString()}</td>
                     <td className="px-6 py-4 text-right">KES {event.totalSpent.toLocaleString()}</td>
                     <td className={`px-6 py-4 text-right font-medium ${event.totalBudget - event.totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                       {(event.totalBudget - event.totalSpent).toLocaleString()}
                     </td>
                     <td className="px-6 py-4 text-right">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${pct > 100 ? 'bg-red-100 text-red-800' : pct > 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                         {pct.toFixed(0)}%
                       </span>
                     </td>
                   </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
