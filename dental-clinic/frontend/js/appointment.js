/**
 * Apex Dental Clinic - Patient Appointment Booking Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Resolve API Base URL
  // Detects if running on the Express server or an independent static server/Live Server
  const API_BASE_URL =
    window.location.hostname === 'localhost' && window.location.port === '5000'
      ? '/api'
      : 'http://localhost:5000/api';

  // 2. Elements Cache
  const form = document.getElementById('appointment-form');
  const alertBanner = document.getElementById('form-alert');
  const alertIcon = document.getElementById('alert-icon');
  const alertTitle = document.getElementById('alert-title');
  const alertMessage = document.getElementById('alert-message');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  // Input elements
  const patientNameInput = document.getElementById('patientName');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const serviceInput = document.getElementById('service');
  const dateInput = document.getElementById('appointmentDate');
  const timeInput = document.getElementById('appointmentTime');
  const messageInput = document.getElementById('message');

  // Error message elements
  const nameError = document.getElementById('name-error');
  const phoneError = document.getElementById('phone-error');
  const emailError = document.getElementById('email-error');
  const serviceError = document.getElementById('service-error');
  const dateError = document.getElementById('date-error');
  const timeError = document.getElementById('time-error');

  // 3. Set Minimum Date to Today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const minDateString = `${yyyy}-${mm}-${dd}`;
  dateInput.min = minDateString;

  // 4. Mobile Navigation Toggle
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    // Close menu when clicking navigation links
    navMenu.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }

  // 5. Validation Utilities
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  };

  const clearFieldError = (input, errorEl) => {
    input.classList.remove('is-invalid');
    if (errorEl) errorEl.classList.remove('visible');
  };

  const setFieldError = (input, errorEl, message) => {
    input.classList.add('is-invalid');
    if (errorEl) {
      if (message) errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  };

  // Attach live clear-error listeners
  patientNameInput.addEventListener('input', () => clearFieldError(patientNameInput, nameError));
  phoneInput.addEventListener('input', () => clearFieldError(phoneInput, phoneError));
  emailInput.addEventListener('input', () => clearFieldError(emailInput, emailError));
  serviceInput.addEventListener('change', () => clearFieldError(serviceInput, serviceError));
  dateInput.addEventListener('change', () => clearFieldError(dateInput, dateError));
  timeInput.addEventListener('change', () => clearFieldError(timeInput, timeError));

  // 6. Alert Display Helper
  const showAlert = (type, title, message) => {
    alertBanner.className = `alert-banner visible ${type}`;
    alertIcon.textContent = type === 'success' ? '✓' : '⚠️';
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const hideAlert = () => {
    alertBanner.className = 'alert-banner';
    alertBanner.style.display = 'none';
  };

  // 7. Form Submission Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    // Sanitize values
    const patientName = patientNameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const service = serviceInput.value;
    const appointmentDate = dateInput.value;
    const appointmentTime = timeInput.value;
    const message = messageInput.value.trim();

    // Client-side Validation Checks
    let hasError = false;

    if (!patientName) {
      setFieldError(patientNameInput, nameError, 'Please enter your full name.');
      hasError = true;
    }

    if (!phone) {
      setFieldError(phoneInput, phoneError, 'Please enter your phone number.');
      hasError = true;
    } else if (!isValidPhone(phone)) {
      setFieldError(phoneInput, phoneError, 'Please enter a valid phone number (7-15 digits).');
      hasError = true;
    }

    if (!email) {
      setFieldError(emailInput, emailError, 'Please enter your email address.');
      hasError = true;
    } else if (!isValidEmail(email)) {
      setFieldError(emailInput, emailError, 'Please enter a valid email address.');
      hasError = true;
    }

    if (!service) {
      setFieldError(serviceInput, serviceError, 'Please select a dental service.');
      hasError = true;
    }

    if (!appointmentDate) {
      setFieldError(dateInput, dateError, 'Please choose an appointment date.');
      hasError = true;
    } else if (appointmentDate < minDateString) {
      setFieldError(dateInput, dateError, 'Appointment date cannot be in the past.');
      hasError = true;
    }

    if (!appointmentTime) {
      setFieldError(timeInput, timeError, 'Please select an appointment time slot.');
      hasError = true;
    }

    if (hasError) return;

    // Set Loading State
    submitBtn.disabled = true;
    btnText.textContent = 'Processing Booking...';
    btnSpinner.style.display = 'inline-block';

    const payload = {
      patientName,
      phone,
      email,
      appointmentDate,
      appointmentTime,
      service,
      message,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Successful Booking
        showAlert(
          'success',
          'Appointment Booked Successfully',
          'Your appointment request has been submitted. The clinic will contact you for confirmation.'
        );
        form.reset();
        // Reset min date after form reset
        dateInput.min = minDateString;
      } else if (response.status === 409) {
        // Slot conflict
        showAlert(
          'error',
          'Slot Unavailable',
          result.message || 'This appointment slot is already booked. Please choose another time or date.'
        );
        setFieldError(dateInput, dateError, 'Slot already booked. Choose another date or time.');
        setFieldError(timeInput, timeError, 'Slot already booked.');
      } else {
        // Validation or other backend error
        showAlert(
          'error',
          'Booking Failed',
          result.message || 'Unable to complete appointment booking. Please check the details.'
        );
      }
    } catch (networkError) {
      console.error('[Network Error]:', networkError);
      showAlert(
        'error',
        'Connection Error',
        'Could not connect to the backend server. Please verify the server is running on http://localhost:5000.'
      );
    } finally {
      // Restore Button State
      submitBtn.disabled = false;
      btnText.textContent = 'BOOK APPOINTMENT';
      btnSpinner.style.display = 'none';
    }
  });
});
