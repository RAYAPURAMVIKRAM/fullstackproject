/**
 * Apex Dental Clinic - Admin Dashboard Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Resolve API Base URL
  const API_BASE_URL =
    window.location.hostname === 'localhost' && window.location.port === '5000'
      ? '/api'
      : 'http://localhost:5000/api';

  // 2. Auth Verification
  const token = localStorage.getItem('dental_admin_token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Admin Profile display
  const adminDisplayName = document.getElementById('admin-display-name');
  const adminAvatar = document.getElementById('admin-avatar');
  const storedProfile = localStorage.getItem('dental_admin_profile');
  if (storedProfile) {
    try {
      const profile = JSON.parse(storedProfile);
      if (profile.name) {
        adminDisplayName.textContent = profile.name;
        adminAvatar.textContent = profile.name.charAt(0).toUpperCase();
      }
    } catch (e) {
      console.warn('Could not parse stored admin profile');
    }
  }

  // 3. Elements Cache
  const tbody = document.getElementById('appointments-tbody');
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const dateFilter = document.getElementById('date-filter');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const toastContainer = document.getElementById('toast-container');

  // KPI Metric Elements
  const metricTotal = document.getElementById('metric-total');
  const metricPending = document.getElementById('metric-pending');
  const metricConfirmed = document.getElementById('metric-confirmed');
  const metricToday = document.getElementById('metric-today');

  // Local state
  let allAppointments = [];
  let searchDebounceTimeout = null;

  // 4. Toast Notification Utility
  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `
      <span style="font-size: 1.1rem;">${icon}</span>
      <div class="toast-message">${escapeHtml(message)}</div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // HTML escaping utility to prevent XSS
  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // 5. Format Date and Time
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${String(formattedHour).padStart(2, '0')}:${m} ${ampm}`;
  };

  // 6. Calculate & Render Metric KPIs
  const updateMetrics = (data) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const total = data.length;
    const pending = data.filter((a) => a.status === 'pending').length;
    const confirmed = data.filter((a) => a.status === 'confirmed').length;
    const todays = data.filter((a) => a.appointment_date === todayStr).length;

    metricTotal.textContent = total;
    metricPending.textContent = pending;
    metricConfirmed.textContent = confirmed;
    metricToday.textContent = todays;
  };

  // 7. Render Appointments Table
  const renderTable = (appointments) => {
    if (!appointments || appointments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="table-empty-state">
              <div class="table-empty-icon">📂</div>
              <h3>No Appointments Found</h3>
              <p>There are no appointments matching your current search or filter criteria.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = appointments
      .map((app) => {
        const statusBadgeClass = `status-${app.status || 'pending'}`;
        const patientName = escapeHtml(app.patient_name);
        const email = escapeHtml(app.email);
        const phone = escapeHtml(app.phone);
        const service = escapeHtml(app.service);
        const message = escapeHtml(app.message || 'No additional note provided');
        const formattedDate = formatDate(app.appointment_date);
        const formattedTime = formatTime(app.appointment_time);

        return `
          <tr data-id="${app.id}">
            <td>
              <div class="patient-cell">
                <span class="patient-name">${patientName}</span>
                <span class="patient-email">${email}</span>
              </div>
            </td>
            <td>
              <span class="patient-phone">${phone}</span>
            </td>
            <td>
              <div class="datetime-cell">
                <span class="appointment-date">${formattedDate}</span>
                <span class="appointment-time">${formattedTime} (${app.appointment_time})</span>
              </div>
            </td>
            <td>
              <strong>${service}</strong>
            </td>
            <td style="max-width: 220px;" title="${message}">
              <span style="font-size: 0.85rem; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${message}
              </span>
            </td>
            <td>
              <span class="status-badge ${statusBadgeClass}">
                ${escapeHtml(app.status)}
              </span>
            </td>
            <td style="text-align: right;">
              <div class="action-buttons" style="justify-content: flex-end;">
                ${
                  app.status !== 'confirmed'
                    ? `<button class="btn-icon confirm" data-id="${app.id}" data-action="confirm" title="Confirm Appointment">✓</button>`
                    : ''
                }
                ${
                  app.status !== 'completed'
                    ? `<button class="btn-icon complete" data-id="${app.id}" data-action="complete" title="Mark as Completed">🏁</button>`
                    : ''
                }
                ${
                  app.status !== 'cancelled'
                    ? `<button class="btn-icon cancel" data-id="${app.id}" data-action="cancel" title="Cancel Appointment">✕</button>`
                    : ''
                }
                <button class="btn-icon delete" data-id="${app.id}" data-action="delete" title="Permanently Delete Record">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    // Attach Action Handlers
    tbody.querySelectorAll('.btn-icon').forEach((btn) => {
      btn.addEventListener('click', handleActionClick);
    });
  };

  // 8. Fetch Appointments from Backend API
  const fetchAppointments = async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '🔄 Loading...';

    const status = statusFilter.value;
    const search = searchInput.value.trim();
    const date = dateFilter.value;

    const queryParams = new URLSearchParams();
    if (status && status !== 'all') queryParams.append('status', status);
    if (search) queryParams.append('search', search);
    if (date) queryParams.append('date', date);

    try {
      const response = await fetch(`${API_BASE_URL}/appointments?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Token invalid or expired
        localStorage.removeItem('dental_admin_token');
        localStorage.removeItem('dental_admin_profile');
        showToast('Your session has expired. Redirecting to login...', 'error');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1200);
        return;
      }

      const result = await response.json();

      if (response.ok && result.success) {
        allAppointments = result.appointments || [];
        renderTable(allAppointments);
        updateMetrics(allAppointments);
      } else {
        showToast(result.message || 'Failed to load appointments.', 'error');
      }
    } catch (networkError) {
      console.error('[Admin Fetch Error]:', networkError);
      showToast('Could not connect to backend server on port 5000.', 'error');
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="table-empty-state">
              <div class="table-empty-icon">⚠️</div>
              <h3>Backend Connection Failed</h3>
              <p>Make sure the Node.js Express server is started and running on http://localhost:5000.</p>
            </div>
          </td>
        </tr>
      `;
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄 Refresh Data';
    }
  };

  // 9. Handle Action Buttons (Confirm, Complete, Cancel, Delete)
  const handleActionClick = async (e) => {
    const button = e.currentTarget;
    const id = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');

    if (!id || !action) return;

    if (action === 'delete') {
      const confirmed = window.confirm('Are you sure you want to permanently delete this appointment? This action cannot be undone.');
      if (!confirmed) return;

      try {
        button.disabled = true;
        const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();
        if (response.ok && result.success) {
          showToast('Appointment record deleted successfully.', 'success');
          fetchAppointments();
        } else {
          showToast(result.message || 'Failed to delete appointment.', 'error');
          button.disabled = false;
        }
      } catch (err) {
        console.error('[Delete Error]:', err);
        showToast('Network error while deleting appointment.', 'error');
        button.disabled = false;
      }
      return;
    }

    // Status updates: confirm, complete, cancel
    let newStatus = '';
    if (action === 'confirm') newStatus = 'confirmed';
    if (action === 'complete') newStatus = 'completed';
    if (action === 'cancel') newStatus = 'cancelled';

    try {
      button.disabled = true;
      const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        showToast(`Appointment status updated to ${newStatus}.`, 'success');
        fetchAppointments();
      } else {
        showToast(result.message || 'Failed to update status.', 'error');
        button.disabled = false;
      }
    } catch (err) {
      console.error('[Update Status Error]:', err);
      showToast('Network error while updating appointment status.', 'error');
      button.disabled = false;
    }
  };

  // 10. Event Listeners for Filters & Search
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
      fetchAppointments();
    }, 350);
  });

  statusFilter.addEventListener('change', fetchAppointments);
  dateFilter.addEventListener('change', fetchAppointments);

  clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    statusFilter.value = 'all';
    dateFilter.value = '';
    fetchAppointments();
  });

  refreshBtn.addEventListener('click', fetchAppointments);

  // 11. Logout Handler
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      // Ignore network errors on logout
    }

    localStorage.removeItem('dental_admin_token');
    localStorage.removeItem('dental_admin_profile');
    showToast('Logged out successfully.', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 400);
  });

  // Initial Fetch on load
  fetchAppointments();
});
