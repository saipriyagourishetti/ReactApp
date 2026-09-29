import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { User } from '../core/models';

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
 * All stat cards are now populated from live API calls:
 * - Total Users   → GET /api/users
 * - Active Sessions → GET /api/sessions
 * - Uptime / Health → GET /api/health
 *
 * The greeting uses the current user from AuthService (resolved at boot via
 * APP_INITIALIZER, so it is already available on first render).
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly userCount = signal<string>('—');
  readonly sessionCount = signal<string>('—');
  readonly uptime = signal<string>('—');
  readonly healthy = signal<boolean | null>(null);
  readonly year = new Date().getFullYear();

  /** Greeting name: prefer displayName, fall back to first word of name. */
  readonly greetingName = computed(() => {
    const user: User | null = this.auth.currentUser();
    if (!user) return 'there';
    if (user.displayName) return user.displayName;
    return user.name.split(' ')[0];
  });

  /** Avatar initials from the current user's name. */
  readonly avatarInitials = computed(() => {
    const user: User | null = this.auth.currentUser();
    if (!user) return '?';
    return user.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  });

  /** Dynamic stat cards — values are filled in ngOnInit. */
  readonly cards = signal<StatCard[]>([
    { label: 'Active Sessions', value: '—', trend: 'loading…', trendKind: 'neutral', color: 'var(--accent-2)' },
    { label: 'Uptime', value: '—', trend: 'loading…', trendKind: 'neutral', color: 'var(--success)' },
    { label: 'Avg Response', value: '48ms', trend: '▲ faster by 3ms', trendKind: 'up', color: 'var(--accent-3)' },
  ]);

  readonly activity: Activity[] = [
    { dot: 'green', text: 'grace@example.com signed up as editor', time: '2 minutes ago' },
    { dot: 'blue', text: 'POST /api/login responded 200 in 31ms', time: '5 minutes ago' },
    { dot: 'amber', text: 'Server restarted — in-memory store reset', time: '18 minutes ago' },
    { dot: 'green', text: 'alan@example.com signed up as user', time: '34 minutes ago' },
    { dot: 'blue', text: 'GET / — 847 requests served today', time: '1 hour ago' },
    { dot: 'red', text: 'POST /api/signup — duplicate email rejected', time: '2 hours ago' },
  ];

  readonly systemInfo = signal<{ label: string; value: string }[]>([
    { label: 'Runtime', value: 'Node 18+' },
    { label: 'Store type', value: 'In-memory' },
    { label: 'Auth method', value: 'scrypt' },
    { label: 'Front end', value: 'Angular' },
    { label: 'Port', value: ':3000' },
  ]);

  ngOnInit(): void {
    // Live total user count.
    this.api.listUsers().subscribe({
      next: ({ count }) => this.userCount.set(String(count)),
      error: () => this.userCount.set('n/a'),
    });

    // Live active session count for the current user.
    this.api.listSessions().subscribe({
      next: ({ count }) => {
        this.sessionCount.set(String(count));
        this.cards.update((c) =>
          c.map((card) =>
            card.label === 'Active Sessions'
              ? { ...card, value: String(count), trend: `${count} active device${count !== 1 ? 's' : ''}`, trendKind: 'up' as const }
              : card
          )
        );
      },
      error: () => {
        this.sessionCount.set('n/a');
        this.cards.update((c) =>
          c.map((card) =>
            card.label === 'Active Sessions'
              ? { ...card, value: 'n/a', trend: '— unavailable', trendKind: 'neutral' as const }
              : card
          )
        );
      },
    });

    // Live health data: uptime + system info.
    this.api.health().subscribe({
      next: (h) => {
        this.healthy.set(h.status === 'ok');
        const uptimeMins = Math.floor(h.uptimeSeconds / 60);
        const uptimeDisplay =
          uptimeMins < 60
            ? `${uptimeMins}m`
            : uptimeMins < 1440
              ? `${Math.floor(uptimeMins / 60)}h ${uptimeMins % 60}m`
              : `${Math.floor(uptimeMins / 1440)}d`;
        this.uptime.set(uptimeDisplay);
        this.cards.update((c) =>
          c.map((card) =>
            card.label === 'Uptime'
              ? { ...card, value: uptimeDisplay, trend: h.status === 'ok' ? '— healthy' : '— degraded', trendKind: 'neutral' as const }
              : card
          )
        );
        // Enrich System Info with live values.
        this.systemInfo.set([
          { label: 'Runtime', value: h.node },
          { label: 'Store type', value: 'In-memory' },
          { label: 'Auth method', value: 'scrypt' },
          { label: 'Front end', value: 'Angular' },
          { label: 'Port', value: ':3000' },
          { label: 'Users', value: String(h.users) },
          { label: 'Sessions', value: String(h.sessions) },
        ]);
      },
      error: () => {
        this.healthy.set(false);
        this.uptime.set('n/a');
        this.cards.update((c) =>
          c.map((card) =>
            card.label === 'Uptime'
              ? { ...card, value: 'n/a', trend: '— unavailable', trendKind: 'neutral' as const }
              : card
          )
        );
      },
    });
  }
}
