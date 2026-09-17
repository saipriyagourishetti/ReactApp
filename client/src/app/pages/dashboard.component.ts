import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ApiService } from '../core/api.service';

interface StatCard {
  label: string;
  value: string;
  trend: string;
  trendKind: 'up' | 'neutral';
  color: string;
}

interface Activity {
  dot: 'green' | 'blue' | 'amber' | 'red';
  text: string;
  time: string;
}

/**
 * Dashboard, converted from public/dashboard.html.
 *
 * The static "Total Users" tile is now populated from GET /api/users, which
 * the original page never called.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly userCount = signal<string>('—');
  readonly year = new Date().getFullYear();

  readonly cards: StatCard[] = [
    { label: 'Active Sessions', value: '342', trend: '▲ 5% today', trendKind: 'up', color: 'var(--accent-2)' },
    { label: 'Uptime', value: '99.8%', trend: '— stable', trendKind: 'neutral', color: 'var(--success)' },
    { label: 'Avg Response', value: '48ms', trend: '▲ faster by 3ms', trendKind: 'up', color: 'var(--accent-3)' },
  ];

  readonly activity: Activity[] = [
    { dot: 'green', text: 'grace@example.com signed up as editor', time: '2 minutes ago' },
    { dot: 'blue', text: 'POST /api/login responded 200 in 31ms', time: '5 minutes ago' },
    { dot: 'amber', text: 'Server restarted — in-memory store reset', time: '18 minutes ago' },
    { dot: 'green', text: 'alan@example.com signed up as user', time: '34 minutes ago' },
    { dot: 'blue', text: 'GET / — 847 requests served today', time: '1 hour ago' },
    { dot: 'red', text: 'POST /api/signup — duplicate email rejected', time: '2 hours ago' },
  ];

  readonly systemInfo: { label: string; value: string; accent?: boolean }[] = [
    { label: 'Runtime', value: 'Node 18+' },
    { label: 'Store type', value: 'In-memory' },
    { label: 'Auth method', value: 'scrypt' },
    { label: 'Front end', value: 'Angular' },
    { label: 'Port', value: ':3000' },
  ];

  ngOnInit(): void {
    this.api.listUsers().subscribe({
      next: ({ count }) => this.userCount.set(String(count)),
      // The dashboard is still useful without the live number.
      error: () => this.userCount.set('n/a'),
    });
  }
}
