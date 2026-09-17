import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Shared footer. The copyright year is bound directly instead of being
 * patched into a `#year` span by app.js.
 */
@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="site-footer">
      <div class="container footer-inner">
        <p>&copy; {{ year }} ValueLabs Aide Autonomy &middot; MIT licensed</p>
        <ul class="footer-links">
          <li><a routerLink="/">Home</a></li>
          <li><a routerLink="/about">About</a></li>
          <li><a routerLink="/dashboard">Dashboard</a></li>
          <li><a routerLink="/profile">Profile</a></li>
          <li><a routerLink="/signup">Sign up</a></li>
          <li><a routerLink="/login">Log in</a></li>
        </ul>
      </div>
    </footer>
  `,
})
export class SiteFooterComponent {
  readonly year = new Date().getFullYear();
}
