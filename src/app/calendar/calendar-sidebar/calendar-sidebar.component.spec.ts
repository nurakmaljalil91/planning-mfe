import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarSidebarComponent } from './calendar-sidebar.component';
import { CalendarDto, CalendarSubscriptionDto } from '../../core/models/planner.models';

const makeCalendar = (overrides: Partial<CalendarDto> = {}): CalendarDto => ({
  id: 1,
  title: 'My Calendar',
  description: null,
  timeZone: null,
  isPrimary: true,
  isPublic: false,
  isVisible: true,
  isGoogleCalendar: false,
  userId: 'user-1',
  events: [],
  tasks: [],
  ...overrides
});

const makeSubscription = (overrides: Partial<CalendarSubscriptionDto> = {}): CalendarSubscriptionDto => ({
  id: 10,
  userId: 'user-1',
  calendarId: 5,
  isVisible: true,
  calendar: makeCalendar({ id: 5, title: 'Team Calendar', isPrimary: false }),
  ...overrides
});

describe('CalendarSidebarComponent', () => {
  let fixture: ComponentFixture<CalendarSidebarComponent>;
  let component: CalendarSidebarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarSidebarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarSidebarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('visibility toggle for own calendar', () => {
    it('should emit visibilityToggled with type=own when eye button is clicked', () => {
      component.ownCalendars = [makeCalendar({ id: 1 })];
      fixture.detectChanges();

      const emitted: { type: string; calendarId: number }[] = [];
      component.visibilityToggled.subscribe((e) => emitted.push(e));

      component.toggleOwnVisibility(1);

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual({ type: 'own', calendarId: 1 });
    });
  });

  describe('visibility toggle for subscription', () => {
    it('should emit visibilityToggled with type=subscription', () => {
      component.subscriptions = [makeSubscription({ calendarId: 5 })];
      fixture.detectChanges();

      const emitted: { type: string; calendarId: number }[] = [];
      component.visibilityToggled.subscribe((e) => emitted.push(e));

      component.toggleSubVisibility(5);

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual({ type: 'subscription', calendarId: 5 });
    });
  });

  describe('subscribe', () => {
    it('should emit subscribed with calendarId', () => {
      const emitted: number[] = [];
      component.subscribed.subscribe((id) => emitted.push(id));

      component.subscribe(7);

      expect(emitted).toEqual([7]);
    });
  });

  describe('unsubscribe', () => {
    it('should emit unsubscribed with calendarId', () => {
      const emitted: number[] = [];
      component.unsubscribed.subscribe((id) => emitted.push(id));

      component.unsubscribe(5);

      expect(emitted).toEqual([5]);
    });
  });

  describe('calendarCreated', () => {
    it('should emit calendarCreated with trimmed title on commitNewCalendar', () => {
      const emitted: string[] = [];
      component.calendarCreated.subscribe((t) => emitted.push(t));

      component.isAddingCalendar.set(true);
      component.newCalendarTitle.set('  Work  ');
      component.commitNewCalendar();

      expect(emitted).toEqual(['Work']);
      expect(component.isAddingCalendar()).toBe(false);
    });

    it('should not emit if title is empty', () => {
      const emitted: string[] = [];
      component.calendarCreated.subscribe((t) => emitted.push(t));

      component.isAddingCalendar.set(true);
      component.newCalendarTitle.set('   ');
      component.commitNewCalendar();

      expect(emitted.length).toBe(0);
    });
  });

  describe('unsubscribedPublicCalendars', () => {
    it('should exclude public calendars already subscribed', () => {
      component.publicCalendars = [
        makeCalendar({ id: 5, isPublic: true }),
        makeCalendar({ id: 6, isPublic: true })
      ];
      component.subscriptions = [makeSubscription({ calendarId: 5 })];
      fixture.detectChanges();

      expect(component.unsubscribedPublicCalendars.map((c) => c.id)).toEqual([6]);
    });
  });
});
