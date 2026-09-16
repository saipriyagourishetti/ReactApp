'use strict';

(function () {
  const form = document.getElementById('signup-form');
  if (!form) return;

  const submitBtn = document.getElementById('submit-btn');
  const status = document.getElementById('form-status');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(field, message) {
    const holder = form.querySelector('[data-error-for="' + field + '"]');
    if (holder) holder.textContent = message || '';
    const input = form.elements[field];
    if (input && input.classList) {
      input.classList.toggle('invalid', Boolean(message));
    }
  }

  function clearErrors() {
    ['name', 'email', 'password', 'confirm', 'terms'].forEach((f) => setError(f, ''));
    status.textContent = '';
    status.className = 'form-status';
  }

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

  function showStatus(message, kind) {
    status.textContent = message;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearErrors();

    const data = {
      name: form.elements.name.value,
      email: form.elements.email.value,
      password: form.elements.password.value,
      confirm: form.elements.confirm.value,
      role: form.elements.role.value,
      terms: form.elements.terms.checked,
    };

    const errors = validate(data);
    const firstError = Object.keys(errors)[0];

    if (firstError) {
      Object.keys(errors).forEach((field) => setError(field, errors[field]));
      const focusTarget = form.elements[firstError];
      if (focusTarget && focusTarget.focus) focusTarget.focus();
      showStatus('Please fix the highlighted fields.', 'failure');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          role: data.role,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (payload.field) setError(payload.field, payload.error);
        showStatus(payload.error || 'Signup failed. Please try again.', 'failure');
        return;
      }

      form.reset();
      showStatus(
        'Welcome, ' + payload.user.name + '! Your account (#' + payload.user.id + ') is ready.',
        'success'
      );
    } catch (err) {
      showStatus('Network error — is the server running? (npm start)', 'failure');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });

  form.addEventListener('input', function (event) {
    const name = event.target.name;
    if (name) setError(name, '');
  });
})();
