export type Priority = 'High' | 'Medium' | 'Low';
export type EventType = 'Academic' | 'Personal' | 'Organizer' | 'Social' | 'Work';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'organizer' | 'admin';
  homeAddress?: string; // For traffic
  campusAddress?: string; // Default campus
  transportMode?: 'driving' | 'transit' | 'walking';
}

export interface OrganizerEvent {
  id: string;
  title: string;
  organizerName: string;
  date: string;
  time: string;
  location: string;
  description: string;
  category: string;
  price: number;
  image?: string;
}

export const MOCK_ORGANIZER_EVENTS: OrganizerEvent[] = [
  {
    id: 'o1',
    title: 'University Career Fair',
    organizerName: 'Career Services',
    date: '2026-03-15',
    time: '09:00',
    location: 'Main Hall',
    description: 'Meet top employers and explore career opportunities.',
    category: 'Career',
    price: 0
  },
  {
    id: 'o2',
    title: 'Hackathon 2026',
    organizerName: 'Tech Club',
    date: '2026-04-10',
    time: '18:00',
    location: 'Innovation Hub',
    description: '48-hour coding challenge. Win amazing prizes!',
    category: 'Technology',
    price: 500
  },
  {
    id: 'o3',
    title: 'Music Festival',
    organizerName: 'Student Union',
    date: '2026-05-01',
    time: '16:00',
    location: 'Campus Grounds',
    description: 'Live performances by student bands and guest artists.',
    category: 'Entertainment',
    price: 1000
  }
];

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  deadline?: string;
}

export interface Budget {
  id: string;
  itemId: string;
  description: string;
  estimatedCost: number;
  actualCost: number;
  paid?: boolean;
}

export interface StudentEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: EventType;
  priority: Priority;
  description: string;
  tasks: Task[];
  budgetItems: Budget[];
  totalBudget: number;
  totalSpent: number;
}

export const INITIAL_EVENTS: StudentEvent[] = [];
