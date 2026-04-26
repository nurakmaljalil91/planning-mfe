import { Routes } from '@angular/router';
import { HomePage } from './home-page/home-page';

export const routes: Routes = [
  {
    path: '',
    component: HomePage,
  },
  {
    path: 'manage-calendar',
    loadComponent: () =>
      import('./manage-calendar/manage-calendar-page').then((m) => m.ManageCalendarPage),
  },
];
