const express = require('express');
const supabase = require('../config/supabase');
const authenticateAdmin = require('../middleware/auth');

const router = express.Router();

// Supported appointment statuses
const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

/**
 * Helper: Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Helper: Validate phone number format (at least 7 digits, max 15 digits)
 */
const isValidPhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

/**
 * Helper: Check if date string YYYY-MM-DD is valid and not in the past
 */
const isFutureOrToday = (dateString) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return { validFormat: false, isPast: false };
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);

  if (
    targetDate.getFullYear() !== year ||
    targetDate.getMonth() !== month - 1 ||
    targetDate.getDate() !== day
  ) {
    return { validFormat: false, isPast: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    validFormat: true,
    isPast: targetDate < today,
  };
};

/**
 * POST /api/appointments
 * Public endpoint: Allows patients to book an appointment with strict validations
 * and slot conflict prevention.
 */
router.post('/', async (req, res) => {
  try {
    // Support both camelCase and snake_case request bodies
    const patientName = (req.body.patientName || req.body.patient_name || '').trim();
    const phone = (req.body.phone || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const appointmentDate = (req.body.appointmentDate || req.body.appointment_date || '').trim();
    const appointmentTime = (req.body.appointmentTime || req.body.appointment_time || '').trim();
    const service = (req.body.service || '').trim();
    const message = (req.body.message || '').trim();

    // 1. Check for required fields
    if (!patientName) {
      return res.status(400).json({
        success: false,
        message: 'Patient name is required.',
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required.',
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number (7 to 15 digits).',
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address (e.g. name@example.com).',
      });
    }

    if (!appointmentDate) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date is required.',
      });
    }

    // 2. Validate Appointment Date
    const dateCheck = isFutureOrToday(appointmentDate);
    if (!dateCheck.validFormat) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment date format. Please use YYYY-MM-DD.',
      });
    }

    if (dateCheck.isPast) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date cannot be in the past. Please select today or a future date.',
      });
    }

    if (!appointmentTime) {
      return res.status(400).json({
        success: false,
        message: 'Appointment time is required.',
      });
    }

    // Time format validation (e.g., 09:00, 14:30)
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(appointmentTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment time format. Please select a valid slot (HH:mm).',
      });
    }

    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Dental service selection is required.',
      });
    }

    // 3. APPOINTMENT CONFLICT CHECK (Backend Level)
    // Check if an active appointment already exists for this exact date and time
    const { data: existingSlots, error: conflictError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', appointmentTime)
      .neq('status', 'cancelled');

    if (conflictError) {
      console.error('[DB Conflict Check Error]:', conflictError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify slot availability. Please try again.',
      });
    }

    if (existingSlots && existingSlots.length > 0) {
      return res.status(409).json({
        success: false,
        message: `This appointment slot on ${appointmentDate} at ${appointmentTime} is already booked. Please choose a different time or date.`,
      });
    }

    // 4. INSERT APPOINTMENT INTO SUPABASE POSTGRESQL
    const newAppointment = {
      patient_name: patientName,
      phone,
      email,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      service,
      message,
      status: 'pending',
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('appointments')
      .insert([newAppointment])
      .select()
      .single();

    if (insertError) {
      console.error('[DB Insert Error]:', insertError);

      // Handle PostgreSQL unique constraint violation (Code 23505)
      if (
        insertError.code === '23505' ||
        (insertError.message && insertError.message.includes('idx_unique_active_slot'))
      ) {
        return res.status(409).json({
          success: false,
          message: `This appointment slot on ${appointmentDate} at ${appointmentTime} was just booked by another patient. Please choose another slot.`,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to save appointment to the database. Please try again.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointment: insertedData,
    });
  } catch (error) {
    console.error('[Server Error in create appointment]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while processing your appointment.',
    });
  }
});

/**
 * GET /api/appointments
 * Protected endpoint: Retrieves all appointments with optional filtering and search.
 */
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status, search, date } = req.query;

    let query = supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    // Filter by status if provided and not 'all'
    if (status && status !== 'all') {
      if (VALID_STATUSES.includes(status.toLowerCase())) {
        query = query.eq('status', status.toLowerCase());
      }
    }

    // Filter by specific date if provided
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      query = query.eq('appointment_date', date);
    }

    // Text search on patient name, phone, or email
    if (search && search.trim() !== '') {
      const sanitized = search.trim();
      query = query.or(
        `patient_name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,email.ilike.%${sanitized}%,service.ilike.%${sanitized}%`
      );
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error('[DB Query Error in get appointments]:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve appointments from database.',
      });
    }

    return res.status(200).json({
      success: true,
      count: appointments ? appointments.length : 0,
      appointments: appointments || [],
    });
  } catch (error) {
    console.error('[Server Error in get appointments]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while retrieving appointments.',
    });
  }
});

/**
 * GET /api/appointments/:id
 * Protected endpoint: Retrieves a single appointment by its UUID.
 */
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[DB Error in get appointment by id]:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Database query failed.',
      });
    }

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    return res.status(200).json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error('[Server Error in get appointment]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment details.',
    });
  }
});

/**
 * PATCH /api/appointments/:id
 * Protected endpoint: Updates appointment status (e.g., 'confirmed', 'completed', 'cancelled').
 */
router.patch('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status field is required.',
      });
    }

    const normalizedStatus = status.toLowerCase().trim();
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${status}'. Supported statuses are: ${VALID_STATUSES.join(', ')}.`,
      });
    }

    // Verify appointment exists
    const { data: existing, error: checkError } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, status')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('[DB Error in check appointment]:', checkError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to query appointment.',
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    // If changing from cancelled to an active status, ensure slot conflict is checked
    if (existing.status === 'cancelled' && normalizedStatus !== 'cancelled') {
      const { data: conflicting } = await supabase
        .from('appointments')
        .select('id')
        .eq('appointment_date', existing.appointment_date)
        .eq('appointment_time', existing.appointment_time)
        .neq('id', id)
        .neq('status', 'cancelled');

      if (conflicting && conflicting.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Cannot reactivate this appointment: slot on ${existing.appointment_date} at ${existing.appointment_time} is now occupied by another booking.`,
        });
      }
    }

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[DB Error updating appointment]:', updateError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to update appointment status.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Appointment status updated to '${normalizedStatus}'.`,
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error('[Server Error in patch appointment]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while updating the appointment.',
    });
  }
});

/**
 * DELETE /api/appointments/:id
 * Protected endpoint: Permanently deletes an appointment record.
 */
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify appointment exists
    const { data: existing, error: checkError } = await supabase
      .from('appointments')
      .select('id, patient_name')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('[DB Check Error in delete]:', checkError.message);
      return res.status(500).json({
        success: false,
        message: 'Database check failed.',
      });
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found or already deleted.',
      });
    }

    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DB Delete Error]:', deleteError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete appointment from database.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Appointment for ${existing.patient_name} deleted successfully.`,
    });
  } catch (error) {
    console.error('[Server Error in delete appointment]:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while deleting the appointment.',
    });
  }
});

module.exports = router;
