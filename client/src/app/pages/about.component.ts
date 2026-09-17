import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RevealDirective } from '../shared/reveal.directive';
import { SiteFooterComponent } from '../shared/site-footer.component';
import { SiteHeaderComponent } from '../shared/site-header.component';

interface Value {
  icon: string;
  title: string;
  body: string;
}

interface TeamMember {
  initials: string;
  name: string;
  role: string;
  bio: string;
  gradient: string;
}

interface Milestone {
  year: string;
  title: string;
  body: string;
}

/** About page, converted from public/about.html. */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, SiteHeaderComponent, SiteFooterComponent, RevealDirective],
  templateUrl: './about.component.html',
})
export class AboutComponent {
  // Repeated markup from the original static page is now data-driven.
  readonly values: Value[] = [
    {
      icon: '◎',
      title: 'Zero waste',
      body: 'No runtime dependencies in the API. If something can be done with standard Node.js, that is how we do it.',
    },
    {
      icon: '⚡',
      title: 'Radical transparency',
      body: 'Every line of code is readable, deletable, and replaceable. There are no magic abstractions hiding from you.',
    },
    {
      icon: '∑',
      title: 'Tested by default',
      body: "We ship tests alongside every module using Node's built-in test runner — no framework required, no excuses.",
    },
  ];

  readonly team: TeamMember[] = [
    {
      initials: 'AL',
      name: 'Ada Lovelace',
      role: 'Founder & Engineer',
      bio: 'First programmer. Coined the algorithm. Still writes the fastest code in the room.',
      gradient: 'linear-gradient(135deg, var(--accent), #8c6cff)',
    },
    {
      initials: 'GH',
      name: 'Grace Hopper',
      role: 'Compiler Architect',
      bio: 'Invented the compiler. Keeps our zero-dep promise honest on every pull request.',
      gradient: 'linear-gradient(135deg, var(--accent-2), #2db5a6)',
    },
    {
      initials: 'AT',
      name: 'Alan Turing',
      role: 'Core Algorithms',
      bio: 'Settled the halting problem. Settles our test suite before every release.',
      gradient: 'linear-gradient(135deg, var(--accent-3), #d4891a)',
    },
    {
      initials: 'DV',
      name: 'Dorothy Vaughan',
      role: 'Infrastructure',
      bio: 'Pioneered FORTRAN programming. Makes sure our server boots in under 50ms.',
      gradient: 'linear-gradient(135deg, var(--danger), #c94060)',
    },
  ];

  readonly milestones: Milestone[] = [
    {
      year: '2023',
      title: 'Zero to one',
      body: 'Started as a weekend experiment: a static server, a user store, and a calculator — all in pure Node.js with not a single npm package.',
    },
    {
      year: '2024 Q1',
      title: 'Signup flow ships',
      body: 'Added the signup and login pages, a full scrypt-based auth flow, and the public landing page.',
    },
    {
      year: '2024 Q3',
      title: 'Test suite reaches full coverage',
      body: 'Every exported function in calculator.js and userStore.js is covered by the built-in node:test runner.',
    },
    {
      year: '2025',
      title: 'Angular front end',
      body: 'The static pages became a single Angular application with reactive forms and a typed API client, while the Node API stayed dependency-free.',
    },
  ];
}
