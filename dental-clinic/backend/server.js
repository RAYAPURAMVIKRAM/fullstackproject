const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. CORS Configuration
// Allow requests from frontend (Live Server, Vite, file protocols, or same origin)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 2. Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Simple Request Logger (Development friendly)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Dental Clinic Appointment API',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

// 5. Serve Frontend static files (Optional convenience for single-server hosting)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// For non-API routes, fallback to frontend index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 6. 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route ${req.method} ${req.originalUrl} not found.`,
  });
});

// 7. Centralized Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err.stack || err.message);

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
  });
});

// 8. Start HTTP Server
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🦷 Dental Clinic API Server running on port ${PORT}`);
  console.log(`🌐 Local API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Frontend UI URL:   http://localhost:${PORT}`);
  console.log('====================================================');
});
