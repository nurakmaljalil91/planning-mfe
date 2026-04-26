import { Routes } from '@angular/router';
import { HomePage } from './home-page/home-page';
import '../styles.css';

export const PLANNING_ROUTES: Routes = [
  {
    path: '',
    component: HomePage,
  },
  {
    path: 'manage-calendar',
    data: {
      forbiddenMessage: 'You do not have access to Manage Calendar.',
      requiredRoles: ['Admin'],
    },
    loadComponent: () =>
      import('./manage-calendar/manage-calendar-page').then((m) => m.ManageCalendarPage),
  },
];
