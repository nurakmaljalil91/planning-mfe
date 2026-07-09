import { Routes } from '@angular/router';
import { HomePage } from './home-page/home-page';
import { PlanningShellComponent } from './planning-shell/planning-shell.component';

export const PLANNING_ROUTES: Routes = [
  {
    path: '',
    component: PlanningShellComponent,
    children: [
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
    ],
  },
];
