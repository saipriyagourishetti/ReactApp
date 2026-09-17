'use strict';

(function () {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Toasts come from ui.js; degrade gracefully if it has not loaded.
  function notify(message, kind) {
    if (window.UI && typeof window.UI.toast === 'function') {
      window.UI.toast(message, kind);
    }
  }

  // Re-run input listeners so widgets like the strength meter reset with the form.
  function refreshWidgets(form) {
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.tagName === 'INPUT') el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  /**
   * Shared helpers for a form that uses [data-error-for] holders
   * and a .form-status element.
   */
  function createFormHelpers(form, status) {
    function setError(field, message) {
      const holder = form.querySelector('[data-error-for="' + field + '"]');
      if (holder) holder.textContent = message || '';
      const input = form.elements[field];
      if (input && input.classList) {
        input.classList.toggle('invalid', Boolean(message));
      }
    }

    function clearErrors(fields) {
      fields.forEach((f) => setError(f, ''));
      status.textContent = '';
      status.className = 'form-status';
    }

    function showStatus(message, kind) {
      status.textContent = message;
      status.className = 'form-status' + (kind ? ' ' + kind : '');
    }

    function applyErrors(errors) {
      Object.keys(errors).forEach((field) => setError(field, errors[field]));
      const first = Object.keys(errors)[0];
      if (first) {
        const target = form.elements[first];
        if (target && target.focus) target.focus();
      }
      return Boolean(first);
    }

    // Clear a field's error as soon as the user edits it.
    form.addEventListener('input', function (event) {
      const name = event.target.name;
      if (name) setError(name, '');
    });

    return { setError, clearErrors, showStatus, applyErrors };
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  }

  /* ---------------- Signup ---------------- */

  function initSignup() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    const submitBtn = document.getElementById('submit-btn');
    const status = document.getElementById('form-status');
    const fields = ['name', 'email', 'password', 'confirm', 'terms'];
    const ui = createFormHelpers(form, status);

    function validate(data) {
      const errors = {};

      if (!data.name || data.name.trim().length < 2) {
        errors.name = 'Please enter your full name (at least 2 characters).';
      }
      if (!EMAIL_RE.test(data.email || '')) {
        errors.email = 'Enter a valid email address, e.g. ada@example.com.';
      }
      if (!data.password || data.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long.';
      } else if (!/[a-zA-Z]/.test(data.password) || !/\d/.test(data.password)) {
        errors.password = 'Include at least one letter and one number.';
      }
      if (data.password !== data.confirm) {
        errors.confirm = 'Passwords do not match.';
      }
      if (!data.terms) {
        errors.terms = 'You must accept the terms to continue.';
      }

      return errors;
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      ui.clearErrors(fields);

      const data = {
        name: form.elements.name.value,
        email: form.elements.email.value,
        password: form.elements.password.value,
        confirm: form.elements.confirm.value,
        role: form.elements.role.value,
        terms: form.elements.terms.checked,
      };

      if (ui.applyErrors(validate(data))) {
        ui.showStatus('Please fix the highlighted fields.', 'failure');
        notify('Please fix the highlighted fields.', 'warning');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account…';

      try {
        const { response, payload } = await postJson('/api/signup', {
          name: data.name.trim(),
          email: data.email.trim(),
          password: data.password,
          role: data.role,
        });

        if (!response.ok) {
          if (payload.field) ui.setError(payload.field, payload.error);
          ui.showStatus(payload.error || 'Signup failed. Please try again.', 'failure');
          notify(payload.error || 'Signup failed. Please try again.', 'error');
          return;
        }

        form.reset();
        refreshWidgets(form);
        ui.showStatus(
          'Welcome, ' +
            payload.user.name +
            '! Your account (#' +
            payload.user.id +
            ') is ready. You can now log in.',
          'success'
        );
        notify('Account created — welcome, ' + payload.user.name + '!', 'success');
      } catch (err) {
        ui.showStatus('Network error — is the server running? (npm start)', 'failure');
        notify('Network error — is the server running?', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create account';
      }
    });
  }

  /* ---------------- Login ---------------- */

  function initLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;

    const submitBtn = document.getElementById('login-btn');
    const status = document.getElementById('login-status');
    const fields = ['email', 'password'];
    const ui = createFormHelpers(form, status);

    function validate(data) {
      const errors = {};
      if (!EMAIL_RE.test(data.email || '')) {
        errors.email = 'Enter a valid email address.';
      }
      if (!data.password) {
        errors.password = 'Please enter your password.';
      }
      return errors;
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      ui.clearErrors(fields);

      const data = {
        email: form.elements.email.value,
        password: form.elements.password.value,
      };

      if (ui.applyErrors(validate(data))) {
        ui.showStatus('Please fix the highlighted fields.', 'failure');
        notify('Please fix the highlighted fields.', 'warning');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in…';

      try {
        const { response, payload } = await postJson('/api/login', {
          email: data.email.trim(),
          password: data.password,
        });

        if (!response.ok) {
          if (payload.field) ui.setError(payload.field, payload.error);
          ui.showStatus(payload.error || 'Login failed. Please try again.', 'failure');
          notify(payload.error || 'Login failed. Please try again.', 'error');
          return;
        }

        form.reset();
        refreshWidgets(form);
        ui.showStatus(
          'Logged in as ' + payload.user.name + ' (' + payload.user.role + ').',
          'success'
        );
        notify('Welcome back, ' + payload.user.name + '!', 'success');
      } catch (err) {
        ui.showStatus('Network error — is the server running? (npm start)', 'failure');
        notify('Network error — is the server running?', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log in';
      }
    });

    // "Fill the form" shortcut next to the demo credentials.
    const fillDemo = document.getElementById('fill-demo');
    if (fillDemo) {
      fillDemo.addEventListener('click', function () {
        form.elements.email.value = 'ada@example.com';
        form.elements.password.value = 'analytical1';
        ui.clearErrors(fields);
        notify('Demo credentials filled in.', 'info');
        submitBtn.focus();
      });
    }
  }

  initSignup();
  initLogin();

  /* ---------------- Shared UI ---------------- */

  // Update copyright year on any page using class="year" or id="year"
  document.querySelectorAll('.year, #year').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Hamburger mobile nav toggle
  // Use querySelectorAll so pages with multiple hamburgers (e.g. future
  // nested layouts) work correctly. Use closest('header') so each button
  // toggles only its own enclosing header, not a global querySelector match.
  document.querySelectorAll('.hamburger').forEach(function (btn) {
    const navHeader = btn.closest('header');
    if (navHeader) {
      btn.addEventListener('click', function () {
        const open = navHeader.classList.toggle('nav-open');
        btn.setAttribute('aria-expanded', String(open));
      });
    }
  });
})();
