/**
 * Apex Dental Clinic - Admin Portal Login Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Resolve API Base URL
  const API_BASE_URL =
    window.location.hostname === 'localhost' && window.location.port === '5000'
      ? '/api'
      : 'http://localhost:5000/api';

  // 2. Redirect if already authenticated
  const existingToken = localStorage.getItem('dental_admin_token');
  if (existingToken) {
    // Quick check if token exists; admin.html will verify validity with backend
    window.location.href = 'admin.html';
    return;
  }

  // 3. Cache Elements
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const loginBtn = document.getElementById('login-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const alertBanner = document.getElementById('login-alert');
  const alertTitle = document.getElementById('alert-title');
  const alertMessage = document.getElementById('alert-message');
  const alertIcon = document.getElementById('alert-icon');

  // 4. Toggle Password Visibility
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
    });
  }

  // 5. Validation Utilities
  const clearError = (input, errorEl) => {
    input.classList.remove('is-invalid');
    if (errorEl) errorEl.classList.remove('visible');
  };

  const setError = (input, errorEl, message) => {
    input.classList.add('is-invalid');
    if (errorEl) {
      if (message) errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  };

  emailInput.addEventListener('input', () => clearError(emailInput, emailError));
  passwordInput.addEventListener('input', () => clearError(passwordInput, passwordError));

  const showAlert = (type, title, message) => {
    alertBanner.className = `alert-banner visible ${type}`;
    alertIcon.textContent = type === 'success' ? '✓' : '⚠️';
    alertTitle.textContent = title;
    alertMessage.textContent = message;
  };

  const hideAlert = () => {
    alertBanner.className = 'alert-banner';
    alertBanner.style.display = 'none';
  };

  // 6. Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

    if (!email) {
      setError(emailInput, emailError, 'Email or username is required.');
      hasError = true;
    }

    if (!password) {
      setError(passwordInput, passwordError, 'Password is required.');
      hasError = true;
    }

    if (hasError) return;

    // Loading State
    loginBtn.disabled = true;
    btnText.textContent = 'Verifying Credentials...';
    btnSpinner.style.display = 'inline-block';

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store JWT token & admin profile in localStorage
        localStorage.setItem('dental_admin_token', result.token);
        if (result.admin) {
          localStorage.setItem('dental_admin_profile', JSON.stringify(result.admin));
        }

        showAlert('success', 'Authentication Successful', 'Redirecting to admin dashboard...');

        // Smooth redirect
        setTimeout(() => {
          window.location.href = 'admin.html';
        }, 500);
      } else {
        showAlert(
          'error',
          'Login Failed',
          result.message || 'Invalid email or password. Please verify your credentials.'
        );
      }
    } catch (networkError) {
      console.error('[Login Network Error]:', networkError);
      showAlert(
        'error',
        'Connection Failed',
        'Unable to reach backend server. Please verify the Express backend is running on port 5000.'
      );
    } finally {
      loginBtn.disabled = false;
      btnText.textContent = 'Sign In to Dashboard';
      btnSpinner.style.display = 'none';
    }
  });
});
