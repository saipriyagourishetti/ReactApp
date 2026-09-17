import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ToastService } from '../core/toast.service';
import { CountUpDirective } from '../shared/count-up.directive';
import { RevealDirective } from '../shared/reveal.directive';
import { SiteFooterComponent } from '../shared/site-footer.component';
import { SiteHeaderComponent } from '../shared/site-header.component';

interface Stat {
  to: number;
  suffix: string;
  label: string;
}

interface Feature {
  icon: string;
  title: string;
  body: string;
}

interface Step {
  num: number;
  title: string;
  body: string;
}

interface Plan {
  name: string;
  price: string;
  perks: string[];
  cta: string;
  featured: boolean;
}

/** Landing page, converted from public/index.html. */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    SiteHeaderComponent,
    SiteFooterComponent,
    RevealDirective,
    CountUpDirective,
  ],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  private readonly toast = inject(ToastService);

  readonly snippet = `$ npm start

=> Server listening on
   http://localhost:3000

GET  /              200
POST /api/signup    201
POST /api/login     200`;

  readonly copied = signal(false);

  readonly stats: Stat[] = [
    { to: 0, suffix: '', label: 'Runtime dependencies (API)' },
    { to: 100, suffix: '%', label: 'Typed front end' },
    { to: 3, suffix: ' s', label: 'Cold start to running' },
    { to: 24, suffix: '+', label: 'Unit tests included' },
  ];

  readonly features: Feature[] = [
    {
      icon: '∑',
      title: 'Calculator module',
      body: 'Pure functions for arithmetic, sums and averages — fully covered by the built-in node --test runner.',
    },
    {
      icon: '◎',
      title: 'In-memory user store',
      body: 'CRUD operations with validation, duplicate-email protection and role filtering. Swap it for a real database whenever you are ready.',
    },
    {
      icon: '⚡',
      title: 'Typed API client',
      body: 'The Angular front end talks to the Node API through a single injectable HttpClient service with typed models.',
    },
  ];

  readonly steps: Step[] = [
    { num: 1, title: 'Clone the repo', body: 'The API lives in src/ and the Angular app in client/.' },
    { num: 2, title: 'Run npm start', body: 'Start the API, then run the Angular dev server.' },
    { num: 3, title: 'Sign up and iterate', body: 'Create an account and watch it land in the user store.' },
  ];

  readonly plans: Plan[] = [
    {
      name: 'Hobby',
      price: '$0',
      perks: ['Unlimited local users', 'Calculator module', 'Community support'],
      cta: 'Start now',
      featured: false,
    },
    {
      name: 'Team',
      price: '$0',
      perks: ['Everything in Hobby', 'Role-based accounts', 'Signup API endpoint'],
      cta: 'Create account',
      featured: true,
    },
    {
      name: 'Enterprise',
      price: '$0',
      perks: ['Everything in Team', 'Self-hosted by design', 'MIT license'],
      cta: 'Get started',
      featured: false,
    },
  ];

  async copySnippet(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.snippet);
      this.copied.set(true);
      this.toast.success('Copied to clipboard', 1800);
      setTimeout(() => this.copied.set(false), 1600);
    } catch {
      this.toast.warning('Could not copy — please select the text manually.');
    }
  }
}
