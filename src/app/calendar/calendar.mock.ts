export type CalendarItemType = 'event' | 'task' | 'reminder';

export interface CalendarItem {
  id: string;
  title: string;
  type: CalendarItemType;
  start: Date;
  end?: Date;
  location?: string;
  notes?: string;
}

const atTime = (base: Date, hour: number, minute = 0): Date =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute);

export const createMockCalendarItems = (referenceDate: Date): CalendarItem[] => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  return [
    {
      id: 'event-1',
      title: 'Sprint planning',
      type: 'event',
      start: new Date(year, month, 2, 10, 0),
      end: new Date(year, month, 2, 11, 30),
      location: 'Room A'
    },
    {
      id: 'event-2',
      title: 'Design review',
      type: 'event',
      start: new Date(year, month, 4, 14, 0),
      end: new Date(year, month, 4, 15, 0),
      location: 'Studio'
    },
    {
      id: 'task-1',
      title: 'Finalize Q2 roadmap',
      type: 'task',
      start: new Date(year, month, 6, 17, 0)
    },
    {
      id: 'reminder-1',
      title: 'Client follow-up',
      type: 'reminder',
      start: new Date(year, month, 7, 9, 30)
    },
    {
      id: 'task-2',
      title: 'Budget approval',
      type: 'task',
      start: new Date(year, month, 11, 16, 0)
    },
    {
      id: 'event-3',
      title: 'Team sync',
      type: 'event',
      start: new Date(year, month, 14, 9, 0),
      end: new Date(year, month, 14, 9, 30)
    },
    {
      id: 'event-4',
      title: 'Marketing kickoff',
      type: 'event',
      start: new Date(year, month, 18, 11, 0),
      end: new Date(year, month, 18, 12, 0)
    },
    {
      id: 'reminder-2',
      title: 'Send release notes',
      type: 'reminder',
      start: new Date(year, month, 20, 8, 30)
    },
    {
      id: 'event-5',
      title: 'Architecture review',
      type: 'event',
      start: new Date(year, month, 23, 15, 0),
      end: new Date(year, month, 23, 16, 30)
    },
    {
      id: 'task-3',
      title: 'Compliance check-in',
      type: 'task',
      start: new Date(year, month, 27, 13, 0)
    },
    {
      id: 'reminder-3',
      title: 'Update onboarding docs',
      type: 'reminder',
      start: atTime(new Date(year, month, 28), 10, 0)
    }
  ];
};
