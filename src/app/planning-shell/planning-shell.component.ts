import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-planning-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  // Shadow DOM isolates every planning-mfe route from whichever host embeds it, so this
  // remote's Tailwind cascade layers can't leak into (or be clobbered by) the host's own.
  // See UpcomingEventsWidgetComponent for the same pattern applied to a single component.
  styleUrls: ['../../styles.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class PlanningShellComponent {}
