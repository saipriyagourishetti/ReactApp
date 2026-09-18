import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
 * Enhancements:
 * - Total Users tile and the searchable user table are both populated from
 *   GET /api/users.
 * - Header shows the currently logged-in user's name from AuthService.
 * - Sidebar footer has a Log out button wired to AuthService.logout().
 * - Skeleton loading state while data is in-flight.
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
  readonly users = signal<User[]>([]);
  readonly searchQuery = signal('');
  readonly loading = signal(true);
  readonly year = new Date().getFullYear();

  /** Derive initials for the avatar from the current user's name. */
  readonly userInitials = computed(() => {
    const name = this.auth.currentUser()?.displayName ?? this.auth.currentUser()?.name ?? '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'U?';
  });

  readonly filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.users();
    return this.users().filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query)
    );
  });

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
      next: ({ count, users }) => {
        this.userCount.set(String(count));
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.userCount.set('n/a');
        this.loading.set(false);
      },
    });
  }

  logout(): void {
    this.auth.logout();
  }

  /** Role badge CSS class */
  roleBadgeClass(role: string): string {
    if (role === 'admin') return 'badge badge-accent';
    if (role === 'editor') return 'badge badge-success';
    return 'badge';
  }
}
