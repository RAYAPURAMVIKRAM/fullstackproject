# 🦷 Apex Dental Clinic - Appointment Management System

A production-ready, clean full-stack Dental Clinic Appointment Management System built with **HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js, JWT Authentication, and Supabase PostgreSQL**.

---

## 📁 Project Architecture & Folder Structure

The project is cleanly decoupled into two main folders (`frontend/` and `backend/`):

```text
dental-clinic/
│
├── frontend/
│   ├── index.html            # Patient portal & interactive appointment booking form
│   ├── login.html            # Admin login interface with password visibility toggle
│   ├── admin.html            # Admin management dashboard with metrics & data table
│   ├── css/
│   │   └── style.css         # Modern healthcare design system & responsive styling
│   └── js/
│       ├── appointment.js    # Client validation, conflict handling & booking logic
│       ├── login.js          # Admin authentication, token management & redirect
│       └── admin.js          # Admin dashboard data fetch, search, filters & CRUD
│
├── backend/
│   ├── server.js             # Express application entry point & static server
│   ├── package.json          # Node dependencies & project scripts
│   ├── .env                  # Environment variables (Supabase URL, Keys, JWT secret)
│   ├── .env.example          # Environment template documentation
│   ├── .gitignore            # Git exclusion rules (node_modules, .env, logs)
│   ├── test-api.js           # Automated backend test suite
│   ├── config/
│   │   └── supabase.js       # Supabase PostgreSQL client initialization
│   ├── middleware/
│   │   └── auth.js           # JWT Bearer token authentication middleware
│   ├── routes/
│   │   ├── appointments.js   # Appointment endpoints (Create, List, Single, Patch, Delete)
│   │   └── auth.js           # Admin auth endpoints (Login, Me, Logout)
│   └── db/
│       ├── schema.sql        # PostgreSQL schema with constraints, indexes, triggers & RLS
│       └── seed.js           # Automated admin user seed script
│
└── README.md                 # Complete documentation & setup instructions
```

---

## ⚙️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Custom Healthcare Design System), Vanilla JavaScript (ES6+), Fetch API |
| **Backend** | Node.js (v18+), Express.js, REST API, CORS, dotenv |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), Password Hashing (`bcryptjs`), Input Sanitization |
| **Database** | Supabase PostgreSQL, Row Level Security (RLS), Partial Unique Constraints |

---

## 🛡️ Appointment Conflict Prevention & Business Rules

1. **Dual-Layer Conflict Check:**
   - **Database Level:** A PostgreSQL partial unique index prevents race conditions:
     ```sql
     CREATE UNIQUE INDEX idx_unique_active_slot 
     ON appointments (appointment_date, appointment_time) 
     WHERE status != 'cancelled';
     ```
   - **Backend Level:** The Express route pre-queries Supabase for existing bookings on the requested date and time slot. If occupied, it returns HTTP `409 Conflict` with a user-friendly message.
2. **Date & Time Validation:**
   - Past dates are strictly rejected both by HTML5 `min` attributes and server-side date validation.
   - Phones are validated for 7–15 digits.
   - Email format is checked via regex.
   - Status transitions are restricted to `pending`, `confirmed`, `completed`, and `cancelled`.

---

## 🚀 Setup & Installation Guide (Windows PowerShell)

### Step 1: Open PowerShell and Navigate to the Backend

```powershell
cd c:\Users\vicky\fullstackexplanationdirectory\dental-clinic\backend
```

### Step 2: Install Dependencies

```powershell
npm.cmd install
```
*(Note: If your PowerShell execution policy allows standard scripts, you can run `npm install`. On systems with execution policy restrictions, use `npm.cmd install`)*

---

## 🗄️ Supabase Database Setup

1. **Create a Supabase Project:**
   - Visit [https://supabase.com](https://supabase.com) and log in.
   - Click **New Project**, choose an organization, set a project name (e.g. `apex-dental-clinic`), and choose a strong database password.
2. **Retrieve API Credentials:**
   - Go to **Project Settings** (gear icon) -> **API**.
   - Copy the **Project URL** (e.g. `https://xyzprojectref.supabase.co`).
   - Copy the **anon public** key (or **service_role** secret key).
3. **Execute the Database Schema:**
   - In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
   - Click **New Query**.
   - Open and copy the entire contents of [`backend/db/schema.sql`](file:///c:/Users/vicky/fullstackexplanationdirectory/dental-clinic/backend/db/schema.sql).
   - Paste into the SQL editor and click **Run**.
   - This creates:
     - The `appointments` table with `id` (UUID), constraints, and timestamp trigger.
     - The partial unique index `idx_unique_active_slot`.
     - The `admins` table.
     - Row Level Security (RLS) policies.
     - The default seeded admin account (`admin@dentalclinic.com` / `admin123`).
4. **Configure Environment Variables:**
   - Edit [`backend/.env`](file:///c:/Users/vicky/fullstackexplanationdirectory/dental-clinic/backend/.env) with your credentials:
     ```env
     PORT=5000
     SUPABASE_URL=https://your-project-ref.supabase.co
     SUPABASE_ANON_KEY=your_actual_supabase_anon_key
     JWT_SECRET=dental_clinic_super_secret_jwt_key_2026_replace_in_prod
     JWT_EXPIRES_IN=24h
     ADMIN_DEFAULT_EMAIL=admin@dentalclinic.com
     ADMIN_DEFAULT_PASSWORD=admin123
     ```

---

## 🏃 Running the Application

### 1. Start the Backend API Server

```powershell
cd c:\Users\vicky\fullstackexplanationdirectory\dental-clinic\backend
node server.js
```

You will see:
```text
====================================================
🦷 Dental Clinic API Server running on port 5000
🌐 Local API Base URL: http://localhost:5000/api
🏥 Frontend UI URL:   http://localhost:5000
====================================================
```

### 2. Access the Frontend

Because the Express server statically serves the `frontend` folder, you can open:

- **Patient Portal & Booking:** [http://localhost:5000](http://localhost:5000)
- **Admin Login:** [http://localhost:5000/login.html](http://localhost:5000/login.html)
- **Admin Dashboard:** [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

*(Alternatively, you can open `frontend/index.html` via VS Code Live Server or by double clicking; CORS is fully configured to allow independent origins)*

---

## 🧪 Testing Procedure Checklist

1. **Patient Booking:**
   - Navigate to [http://localhost:5000](http://localhost:5000#book-appointment).
   - Fill in:
     - Name: `Rahul Kumar`
     - Phone: `9876543210`
     - Email: `rahul@gmail.com`
     - Service: `Dental Checkup & Cleaning`
     - Date: Tomorrow's date
     - Time: `10:30 AM`
     - Message: `First visit for teeth checkup`
   - Click **BOOK APPOINTMENT**.
   - Verify green success notification: `"✓ Appointment Booked Successfully"`.
2. **Conflict Prevention Test:**
   - Immediately attempt to submit another appointment for the exact same date and time (`10:30 AM`).
   - Verify red warning: `"⚠️ Slot Unavailable: This appointment slot is already booked"`.
3. **Admin Login:**
   - Go to [http://localhost:5000/login.html](http://localhost:5000/login.html).
   - Enter credentials:
     - Email: `admin@dentalclinic.com`
     - Password: `admin123`
   - Click **Sign In to Dashboard**.
4. **Admin Dashboard Operations:**
   - Verify Rahul Kumar's appointment appears in the table.
   - Verify summary KPI counters updated (`Total Appointments`, `Pending Requests`).
   - Click the checkmark button (**✓**) to confirm the appointment.
   - Notice the status badge dynamically changes to blue **confirmed**.
   - Test the search bar by typing `Rahul` or `Checkup`.
   - Test filtering by status dropdown (`Pending`, `Confirmed`).
   - Click the cancel button (**✕**) to test cancellation.
   - Click **Logout ⎋** to verify secure token clearance and redirect.
5. **Automated API Tests:**
   - Run the included test runner anytime:
     ```powershell
     cd c:\Users\vicky\fullstackexplanationdirectory\dental-clinic\backend
     node test-api.js
     ```

---

## 🛠️ REST API Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/appointments` | Public | Submit new patient appointment with conflict check |
| `GET` | `/api/appointments` | Admin | Retrieve all appointments with search & filter |
| `GET` | `/api/appointments/:id` | Admin | Get single appointment details |
| `PATCH` | `/api/appointments/:id` | Admin | Update appointment status (`pending`, `confirmed`, `completed`, `cancelled`) |
| `DELETE` | `/api/appointments/:id` | Admin | Permanently delete an appointment record |
| `POST` | `/api/auth/login` | Public | Admin authentication; returns JWT token |
| `GET` | `/api/auth/me` | Admin | Verify current token and fetch admin profile |
| `POST` | `/api/auth/logout` | Public | Administrative session logout |
| `GET` | `/api/health` | Public | Server uptime and health verification |
