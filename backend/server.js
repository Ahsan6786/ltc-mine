const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

require('dotenv').config();

const app = express();
const allowedOrigins = [
  "https://ltc-deploy-final.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 5001;
const SECRET = 'ltc-super-secret-key-for-now';

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'ltc_db',
  password: process.env.DB_PASSWORD || 'root',
  port: parseInt(process.env.DB_PORT || '5432'),
};

if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

// ─── Squad Names (10 Predefined) ─────────────────────────────────────────────
const SQUAD_NAMES = ['Surya', 'Chandra', 'Mangal', 'Budh', 'Guru', 'Shukra', 'Shani', 'Rahu', 'Ketu', 'Agni'];

// ─── Mailer Setup ─────────────────────────────────────────────────────────────
let transporter;
const setupMailer = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      console.log(`Nodemailer real SMTP transporter ready (using host ${process.env.SMTP_HOST}).`);
    } catch (smtpErr) {
      console.error("Failed to initialize real SMTP transport:", smtpErr);
    }
  }

  if (!transporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      console.log("Nodemailer: Ethereal test transporter ready (real credentials not provided in .env).");
    } catch (err) {
      transporter = {
        sendMail: async (mailOptions) => {
          console.log("=== MOCK EMAIL SENT ===");
          console.log(`To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log("=======================");
          return { messageId: 'mock-id-' + Date.now() };
        }
      };
      console.log("Nodemailer setup failed. Using fallback mock mailer.");
    }
  }
};
setupMailer();

const sendLtcBatchEmail = async (name, email) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || '"LTC Administration" <no-reply@ltc.edu>',
    to: email,
    subject: 'Congratulations! You have been selected for LTC batch',
    text: `Dear ${name},\n\nCongratulations! You have been selected to attend the upcoming LTC batch.\n\nPlease complete your Insurance Form and Undertaking Form on your student dashboard.\n\nBest regards,\nLTC Administration`,
    html: `<div style="font-family: sans-serif; padding: 20px; color: #334155;">
      <h2 style="color: #0f172a;">Congratulations!</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>You have been selected to attend the upcoming LTC batch.</p>
      <p>Please complete your <strong>Insurance Form</strong> and <strong>Undertaking Form</strong> on your student dashboard.</p>
      <br/><p>Best regards,<br/><strong>LTC Administration</strong></p>
    </div>`
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`Email Preview URL: ${previewUrl}`);
  } catch (err) {
    console.error(`Failed to send email to ${email}:`, err);
  }
};

// ─── Database Initialization ──────────────────────────────────────────────────
const initDB = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        department VARCHAR(100),
        semester VARCHAR(50),
        division VARCHAR(100),
        school VARCHAR(100),
        panel VARCHAR(50),
        is_primary BOOLEAN DEFAULT false,
        prn VARCHAR(100) UNIQUE,
        faculty_id VARCHAR(100) UNIQUE,
        phone VARCHAR(20),
        dob VARCHAR(50),
        gender VARCHAR(20),
        program VARCHAR(100),
        year VARCHAR(20),
        designation VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        nri BOOLEAN DEFAULT false,
        red_flag BOOLEAN DEFAULT false,
        squad VARCHAR(50),
        room VARCHAR(50),
        barcode VARCHAR(255),
        in_current_batch BOOLEAN DEFAULT false
      );
    `);

    // Legacy columns (for backward compat)
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS in_current_batch BOOLEAN DEFAULT false;");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS undertaking_submitted BOOLEAN DEFAULT false;");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS undertaking_signed_name VARCHAR(255);");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS undertaking_signed_date VARCHAR(50);");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_squad_leader BOOLEAN DEFAULT false;");

    // ── Batches table ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'upcoming',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Enterprise upgrade: new batch columns (additive, safe)
    await pool.query("ALTER TABLE batches ADD COLUMN IF NOT EXISTS batch_code VARCHAR(50);");
    await pool.query("ALTER TABLE batches ADD COLUMN IF NOT EXISTS year VARCHAR(10);");
    await pool.query("ALTER TABLE batches ADD COLUMN IF NOT EXISTS capacity INT;");
    await pool.query("ALTER TABLE batches ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;");

    // ── Batch-Student relationship ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS batch_students (
        batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
        student_id INT REFERENCES users(id) ON DELETE CASCADE,
        squad VARCHAR(50),
        room VARCHAR(50),
        barcode VARCHAR(255),
        is_squad_leader BOOLEAN DEFAULT false,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (batch_id, student_id)
      );
    `);

    // ── Batch-Faculty relationship ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS batch_faculty (
        batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
        faculty_id INT REFERENCES users(id) ON DELETE CASCADE,
        squad VARCHAR(50),
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (batch_id, faculty_id)
      );
    `);

    // Schedules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        date VARCHAR(50),
        time VARCHAR(50),
        faculty_id INT,
        panel VARCHAR(50)
      );
    `);

    // Squad leaders
    await pool.query(`
      CREATE TABLE IF NOT EXISTS squad_leaders (
        squad_name VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        prn VARCHAR(255),
        phone VARCHAR(255)
      );
    `);

    // Legacy attendance (keep for backward compat)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        schedule_id INT,
        student_id INT,
        status VARCHAR(50)
      );
    `);

    // ── NEW: Attendance sessions (batch-level, ready architecture) ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id SERIAL PRIMARY KEY,
        batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        session_date DATE,
        session_type VARCHAR(50) DEFAULT 'general',
        created_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── NEW: Attendance records v2 (batch-level) ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_records_v2 (
        id SERIAL PRIMARY KEY,
        session_id INT REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        student_id INT REFERENCES users(id) ON DELETE CASCADE,
        batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'absent',
        marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, student_id)
      );
    `);

    // Evaluations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id SERIAL PRIMARY KEY,
        student_id INT,
        faculty_id INT,
        schedule_id INT,
        marks INT,
        remarks TEXT,
        report_url TEXT,
        photo_url TEXT,
        marking_scheme VARCHAR(50)
      );
    `);

    // Documents
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        url TEXT,
        uploaded_by INT,
        target_role VARCHAR(50),
        batch_id INT
      );
    `);
    await pool.query("ALTER TABLE documents ADD COLUMN IF NOT EXISTS batch_id INT;");

    // Insurance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS insurance (
        id SERIAL PRIMARY KEY,
        prn VARCHAR(100) UNIQUE,
        policy_number VARCHAR(255),
        provider VARCHAR(255)
      );
    `);

    // Feedback
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INT,
        role VARCHAR(50),
        feedback_text TEXT,
        category VARCHAR(100),
        additional_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // System settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value VARCHAR(255)
      );
    `);

    await pool.query(`
      INSERT INTO system_settings (key, value)
      VALUES ('squads_locked', 'false')
      ON CONFLICT (key) DO NOTHING;
    `);

    // ── NEW: Audit Logs ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT,
        user_name VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── NEW: Certificates (ready architecture) ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES users(id) ON DELETE CASCADE,
        batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'completion',
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data JSONB,
        UNIQUE(student_id, batch_id, type)
      );
    `);

    // ── NEW: Completion Reports (ready architecture) ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS completion_reports (
        id SERIAL PRIMARY KEY,
        batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        generated_by INT REFERENCES users(id),
        data JSONB
      );
    `);

    // ── NEW: Upload Jobs table for background processing ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS upload_jobs (
        id SERIAL PRIMARY KEY,
        batch_id INT REFERENCES batches(id) ON DELETE SET NULL,
        filename VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        total_records INT DEFAULT 0,
        processed_records INT DEFAULT 0,
        success_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        errors JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Performance Indexes ──
    await pool.query("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_users_prn ON users(prn);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_users_in_batch ON users(in_current_batch);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_batch_students_batch ON batch_students(batch_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_batch_students_student ON batch_students(student_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_batch_students_squad ON batch_students(squad);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_batch_faculty_batch ON batch_faculty(batch_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_attendance_sessions_batch ON attendance_sessions(batch_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_attendance_records_v2_session ON attendance_records_v2(session_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_attendance_records_v2_batch ON attendance_records_v2(batch_id);");

    // Additional indexes for bulk upload scaling
    await pool.query("CREATE INDEX IF NOT EXISTS idx_users_faculty_id ON users(faculty_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_batch_faculty_faculty ON batch_faculty(faculty_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_upload_jobs_status ON upload_jobs(status);");

    // Super Admin
    const adminQuery = await pool.query("SELECT * FROM users WHERE role = 'admin'");
    if (adminQuery.rowCount === 0) {
      const hashedPassword = await bcrypt.hash('123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['Super Admin', 'admin@ltc.edu', hashedPassword, 'admin']
      );
      console.log('Super Admin initialized: admin@ltc.edu (123)');
    } else {
      console.log('PostgreSQL database ready. Super Admin already exists.');
    }
  } catch (err) {
    console.error('Database Initialization Error:', err);
  }
};
initDB();

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Compute LTC ID from PRN (last 4 digits)
const getLtcId = (prn) => {
  if (!prn) return null;
  const digits = String(prn).replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : prn;
};

// Append ltc_id to each row that has a prn field
const withLtcId = (rows) => rows.map(r => ({ ...r, ltc_id: getLtcId(r.prn) }));

// Write an audit log entry (non-blocking, fire-and-forget)
const writeAudit = (userId, userName, action, entityType, entityId, details) => {
  pool.query(
    `INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId || null, userName || 'System', action, entityType || null, entityId || null, details ? JSON.stringify(details) : null]
  ).catch(err => console.error('[AuditLog Error]', err.message));
};

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const authMiddleware = (roles = []) => (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ message: 'Unauthorized role' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userQuery = await pool.query(
      `SELECT u.*, 
              (CASE 
                WHEN u.role = 'student' THEN (
                  SELECT bs.squad FROM batch_students bs
                  JOIN batches b ON bs.batch_id = b.id
                  WHERE bs.student_id = u.id AND (b.is_deleted = false OR b.is_deleted IS NULL)
                  ORDER BY bs.batch_id DESC LIMIT 1
                )
                WHEN u.role = 'faculty' THEN (
                  SELECT bf.squad FROM batch_faculty bf
                  JOIN batches b ON bf.batch_id = b.id
                  WHERE bf.faculty_id = u.id AND (b.is_deleted = false OR b.is_deleted IS NULL)
                  ORDER BY bf.batch_id DESC LIMIT 1
                )
                ELSE NULL
              END) as batch_squad
       FROM users u
       WHERE u.email = $1`,
      [email]
    );
    if (userQuery.rowCount === 0) return res.status(400).json({ message: 'User not found' });
    const user = userQuery.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, role: user.role, department: user.department, panel: user.panel },
      SECRET,
      { expiresIn: '8h' }
    );
    res.json({
      token,
      user: {
        id: user.id, email: user.email, role: user.role, name: user.name,
        department: user.department, panel: user.panel, division: user.division,
        school: user.school, squad: user.batch_squad || user.squad || null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── Admin: Add Faculty ───────────────────────────────────────────────────────
app.post('/api/admin/faculty', authMiddleware(['admin']), async (req, res) => {
  const { name, email, department, division, school, panel, is_primary, gender } = req.body;
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const newFaculty = await pool.query(
      "INSERT INTO users (name, email, password, role, department, division, school, panel, is_primary, gender) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, email, role, department, division, school, panel, is_primary, gender",
      [name, email, hashedPassword, 'faculty', department, division || null, school || null, panel || null, is_primary === true || is_primary === 'true', gender || null]
    );
    res.status(201).json({ message: 'Faculty created. Default password: password123.', faculty: newFaculty.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'User already exists' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── Admin/Faculty: Add Student ───────────────────────────────────────────────
app.post('/api/users/student', authMiddleware(['admin', 'faculty']), async (req, res) => {
  const { name, email, semester, department, division, school, panel, prn, gender } = req.body;
  try {
    const hashedPassword = await bcrypt.hash('student123', 10);
    const finalPrn = prn && prn.trim() ? prn.trim() : 'PRN-STU-' + Date.now() + Math.floor(Math.random() * 1000);
    const newStudent = await pool.query(
      "INSERT INTO users (name, email, password, role, semester, department, division, school, panel, prn, gender) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, name, email, role, semester, department, division, school, panel, prn, gender",
      [name, email, hashedPassword, 'student', semester, department, division || null, school || null, panel || null, finalPrn, gender || null]
    );
    res.status(201).json({ message: 'Student created. Default password: student123.', student: newStudent.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'User already exists' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── Admin: Paginated Master Student Database ─────────────────────────────────
app.get('/api/admin/students', authMiddleware(['admin']), async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const school = req.query.school || '';
  const department = req.query.department || '';

  try {
    let whereClause = "WHERE u.role = 'student'";
    const params = [];
    let paramIdx = 1;

    if (search) {
      whereClause += ` AND (u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.prn ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (school) {
      whereClause += ` AND u.school = $${paramIdx}`;
      params.push(school);
      paramIdx++;
    }
    if (department) {
      whereClause += ` AND u.department = $${paramIdx}`;
      params.push(department);
      paramIdx++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM users u ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    const dataRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.semester, u.division, u.school, u.panel, u.prn, u.phone, u.gender, u.nri, u.status,
              (i.prn IS NOT NULL) as insured
       FROM users u
       LEFT JOIN insurance i ON u.prn = i.prn
       ${whereClause}
       ORDER BY u.name ASC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    res.json({
      students: withLtcId(dataRes.rows),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── Admin: Paginated Master Faculty Database ─────────────────────────────────
app.get('/api/admin/faculty-list', authMiddleware(['admin']), async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {
    let whereClause = "WHERE role = 'faculty'";
    const params = [];
    let paramIdx = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR department ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    const dataRes = await pool.query(
      `SELECT id, name, email, department, division, school, panel, is_primary, gender, faculty_id, phone, status
       FROM users ${whereClause} ORDER BY name ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    res.json({
      faculty: dataRes.rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── Admin: Filter Options for Students ──────────────────────────────────────
app.get('/api/admin/filter-options', authMiddleware(['admin']), async (req, res) => {
  try {
    const schoolsRes = await pool.query("SELECT DISTINCT school FROM users WHERE role='student' AND school IS NOT NULL ORDER BY school");
    const deptRes = await pool.query("SELECT DISTINCT department FROM users WHERE role='student' AND department IS NOT NULL ORDER BY department");
    res.json({
      schools: schoolsRes.rows.map(r => r.school),
      departments: deptRes.rows.map(r => r.department)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH MANAGEMENT API
// ═══════════════════════════════════════════════════════════════════════════════

// List all batches with stats (excludes soft-deleted)
app.get('/api/admin/batches', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*,
        COUNT(DISTINCT bs.student_id) as student_count,
        COUNT(DISTINCT bf.faculty_id) as faculty_count
      FROM batches b
      LEFT JOIN batch_students bs ON b.id = bs.batch_id
      LEFT JOIN batch_faculty bf ON b.id = bf.batch_id
      WHERE b.is_deleted IS NOT TRUE
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    res.json({ batches: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create batch (supports batch_code, year, capacity)
app.post('/api/admin/batches', authMiddleware(['admin']), async (req, res) => {
  const { name, location, start_date, end_date, status, description, batch_code, year, capacity } = req.body;
  if (!name) return res.status(400).json({ message: 'Batch name is required' });
  try {
    // Auto-generate batch_code if not provided: LTC{year}-B{sequence}
    let finalCode = batch_code;
    if (!finalCode) {
      const batchYear = year || new Date().getFullYear();
      const countRes = await pool.query("SELECT COUNT(*) FROM batches WHERE is_deleted IS NOT TRUE AND (year = $1 OR EXTRACT(YEAR FROM created_at) = $2)", [String(batchYear), parseInt(batchYear)]);
      const seq = parseInt(countRes.rows[0].count) + 1;
      finalCode = `LTC${batchYear}-B${seq}`;
    }
    const result = await pool.query(
      `INSERT INTO batches (name, location, start_date, end_date, status, description, batch_code, year, capacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, location || null, start_date || null, end_date || null, status || 'upcoming', description || null, finalCode, year || null, capacity || null]
    );
    writeAudit(req.user.id, req.user.name || 'Admin', 'BATCH_CREATED', 'batch', result.rows[0].id, { name, batch_code: finalCode });
    res.status(201).json({ message: 'Batch created', batch: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update batch (supports batch_code, year, capacity)
app.put('/api/admin/batches/:id', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const { name, location, start_date, end_date, status, description, batch_code, year, capacity } = req.body;
  try {
    const result = await pool.query(
      `UPDATE batches SET name=$1, location=$2, start_date=$3, end_date=$4, status=$5, description=$6,
        batch_code=COALESCE($7, batch_code), year=COALESCE($8, year), capacity=COALESCE($9, capacity)
       WHERE id=$10 AND is_deleted IS NOT TRUE RETURNING *`,
      [name, location || null, start_date || null, end_date || null, status || 'upcoming', description || null,
       batch_code || null, year || null, capacity || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Batch not found' });
    writeAudit(req.user.id, req.user.name || 'Admin', 'BATCH_UPDATED', 'batch', parseInt(id), { name });
    res.json({ message: 'Batch updated', batch: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Soft-delete batch (sets is_deleted=true; relationships and master records preserved)
app.delete('/api/admin/batches/:id', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const { hard } = req.query; // ?hard=true for permanent delete (admin only, with extra confirmation)
  try {
    if (hard === 'true') {
      // Hard delete — permanent, used only in exceptional cases
      await pool.query("DELETE FROM batches WHERE id = $1", [id]);
      writeAudit(req.user.id, req.user.name || 'Admin', 'BATCH_HARD_DELETED', 'batch', parseInt(id), {});
      return res.json({ message: 'Batch permanently deleted.' });
    }
    // Default: soft delete
    const result = await pool.query(
      "UPDATE batches SET is_deleted = true, status = 'archived' WHERE id = $1 RETURNING id, name",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Batch not found' });
    writeAudit(req.user.id, req.user.name || 'Admin', 'BATCH_ARCHIVED', 'batch', parseInt(id), { name: result.rows[0].name });
    res.json({ message: 'Batch archived. Student and faculty records remain in master database.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Restore a soft-deleted batch
app.post('/api/admin/batches/:id/restore', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE batches SET is_deleted = false, status = 'upcoming' WHERE id = $1 RETURNING id, name",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Batch not found' });
    writeAudit(req.user.id, req.user.name || 'Admin', 'BATCH_RESTORED', 'batch', parseInt(id), { name: result.rows[0].name });
    res.json({ message: 'Batch restored.', batch: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get batch details (includes squad breakdown)
app.get('/api/admin/batches/:id', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const batchRes = await pool.query(`
      SELECT b.*,
        COUNT(DISTINCT bs.student_id) as student_count,
        COUNT(DISTINCT bf.faculty_id) as faculty_count
      FROM batches b
      LEFT JOIN batch_students bs ON b.id = bs.batch_id
      LEFT JOIN batch_faculty bf ON b.id = bf.batch_id
      WHERE b.id = $1
      GROUP BY b.id
    `, [id]);
    if (batchRes.rowCount === 0) return res.status(404).json({ message: 'Batch not found' });
    // Squad breakdown
    const squadRes = await pool.query(
      `SELECT squad, COUNT(*) as count FROM batch_students WHERE batch_id = $1 AND squad IS NOT NULL GROUP BY squad ORDER BY squad`,
      [id]
    );
    res.json({ batch: batchRes.rows[0], squads: squadRes.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Batch Students ────────────────────────────────────────────────────────────

// Get paginated students in a batch
app.get('/api/admin/batches/:id/students', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {
    let whereExtra = '';
    const params = [parseInt(id)];
    let paramIdx = 2;

    if (search) {
      whereExtra = ` AND (u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.prn ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM batch_students bs JOIN users u ON bs.student_id = u.id WHERE bs.batch_id = $1${whereExtra}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    const dataRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.prn, u.department, u.semester, u.school, u.division, u.gender, u.phone, u.nri, u.red_flag,
              bs.squad, bs.room, bs.barcode, bs.is_squad_leader,
              (ins.prn IS NOT NULL) as insured, u.undertaking_submitted
       FROM batch_students bs
       JOIN users u ON bs.student_id = u.id
       LEFT JOIN insurance ins ON u.prn = ins.prn
       WHERE bs.batch_id = $1${whereExtra}
       ORDER BY u.name ASC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    res.json({
      students: withLtcId(dataRes.rows),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add students to batch (by PRN/email matching from master DB)
app.post('/api/admin/batches/:id/students', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const { identifiers, matchType } = req.body; // identifiers: array of prn or email
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    return res.status(400).json({ message: 'identifiers must be a non-empty array' });
  }
  try {
    // Verify batch exists
    const batchCheck = await pool.query("SELECT id FROM batches WHERE id = $1", [id]);
    if (batchCheck.rowCount === 0) return res.status(404).json({ message: 'Batch not found' });

    const column = matchType === 'prn' ? 'prn' : 'email';
    const matchRes = await pool.query(
      `SELECT id, name, email FROM users WHERE role = 'student' AND ${column} = ANY($1)`,
      [identifiers]
    );

    let added = 0;
    let skipped = 0;
    const errors = [];

    for (const student of matchRes.rows) {
      try {
        const checkBatch = await pool.query(
          `SELECT b.name FROM batch_students bs
           JOIN batches b ON bs.batch_id = b.id
           WHERE bs.student_id = $1 AND bs.batch_id <> $2 AND (b.is_deleted = false OR b.is_deleted IS NULL)
           LIMIT 1`,
          [student.id, id]
        );
        if (checkBatch.rowCount > 0) {
          skipped++;
          errors.push({ email: student.email, error: `Student is already allocated to active batch: ${checkBatch.rows[0].name}` });
          continue;
        }

        const barcode = `LTC-${id}-${student.id}-${Math.floor(Math.random() * 10000)}`;
        await pool.query(
          `INSERT INTO batch_students (batch_id, student_id, barcode)
           VALUES ($1, $2, $3)
           ON CONFLICT (batch_id, student_id) DO NOTHING`,
          [id, student.id, barcode]
        );
        added++;
      } catch (e) {
        skipped++;
        errors.push({ email: student.email, error: e.message });
      }
    }

    // Also send emails to newly added students
    for (const student of matchRes.rows) {
      sendLtcBatchEmail(student.name, student.email);
    }

    res.json({
      message: `Added ${added} students to batch. ${skipped} skipped (already in batch).`,
      matched: matchRes.rowCount,
      added,
      skipped,
      unmatched: identifiers.length - matchRes.rowCount,
      errors
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove student from batch (NOT from master DB)
app.delete('/api/admin/batches/:id/students/:studentId', authMiddleware(['admin']), async (req, res) => {
  const { id, studentId } = req.params;
  try {
    await pool.query("DELETE FROM batch_students WHERE batch_id = $1 AND student_id = $2", [id, studentId]);
    res.json({ message: 'Student removed from batch. Master record preserved.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add single student to batch
app.post('/api/admin/batches/:id/students/add-one', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const { student_id } = req.body;
  try {
    const studentRes = await pool.query("SELECT id, name, email FROM users WHERE id = $1 AND role = 'student'", [student_id]);
    if (studentRes.rowCount === 0) return res.status(404).json({ message: 'Student not found' });
    const student = studentRes.rows[0];
    const checkBatch = await pool.query(
      `SELECT b.name FROM batch_students bs
       JOIN batches b ON bs.batch_id = b.id
       WHERE bs.student_id = $1 AND bs.batch_id <> $2 AND (b.is_deleted = false OR b.is_deleted IS NULL)
       LIMIT 1`,
      [student_id, id]
    );
    if (checkBatch.rowCount > 0) {
      return res.status(400).json({ message: `Student is already allocated to active batch: ${checkBatch.rows[0].name}` });
    }

    const barcode = `LTC-${id}-${student_id}-${Math.floor(Math.random() * 10000)}`;
    await pool.query(
      `INSERT INTO batch_students (batch_id, student_id, barcode) VALUES ($1, $2, $3) ON CONFLICT (batch_id, student_id) DO NOTHING`,
      [id, student_id, barcode]
    );
    res.json({ message: 'Student added to batch.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Batch Faculty ─────────────────────────────────────────────────────────────

// Get faculty in a batch
app.get('/api/admin/batches/:id/faculty', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const search = req.query.search || '';
  try {
    let whereExtra = '';
    const params = [parseInt(id)];
    if (search) {
      whereExtra = ` AND (u.name ILIKE $2 OR u.email ILIKE $2 OR u.department ILIKE $2)`;
      params.push(`%${search}%`);
    }
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.department, u.division, u.school, u.panel, u.is_primary, u.gender, u.phone,
              bf.squad
       FROM batch_faculty bf
       JOIN users u ON bf.faculty_id = u.id
       WHERE bf.batch_id = $1${whereExtra}
       ORDER BY u.name ASC`,
      params
    );
    res.json({ faculty: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add faculty to batch
app.post('/api/admin/batches/:id/faculty', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const { faculty_ids } = req.body; // array of user ids
  if (!Array.isArray(faculty_ids) || faculty_ids.length === 0) {
    return res.status(400).json({ message: 'faculty_ids must be a non-empty array' });
  }
  try {
    let added = 0;
    for (const fid of faculty_ids) {
      await pool.query(
        `INSERT INTO batch_faculty (batch_id, faculty_id) VALUES ($1, $2) ON CONFLICT (batch_id, faculty_id) DO NOTHING`,
        [id, fid]
      );
      added++;
    }
    res.json({ message: `${added} faculty assigned to batch.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove faculty from batch (NOT from master DB)
app.delete('/api/admin/batches/:id/faculty/:facultyId', authMiddleware(['admin']), async (req, res) => {
  const { id, facultyId } = req.params;
  try {
    await pool.query("DELETE FROM batch_faculty WHERE batch_id = $1 AND faculty_id = $2", [id, facultyId]);
    res.json({ message: 'Faculty removed from batch. Master record preserved.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Background Bulk Ingestion Worker ──────────────────────────────────────────
const processUploadJobInBackground = async (jobId, records, batchId = null, isBatchSpecific = false, adminUserId = null, adminUserName = 'Admin', duplicateAction = 'replace') => {
  let processed = 0;
  let success = 0;
  let failed = 0;
  let errorsList = [];

  try {
    // 1. Deduplicate records in memory before processing
    const uniqueRecords = [];
    const seenPrns = new Set();
    const seenEmails = new Set();
    const seenFacultyIds = new Set();
    
    for (const r of records) {
      if (!r || typeof r !== 'object') continue;
      
      const normalized = {};
      for (const key in r) {
        const cleanKey = key.replace(/^\uFEFF/, '').toLowerCase().trim();
        normalized[cleanKey] = r[key];
      }
      
      const prn = String(normalized.prn || normalized['student id'] || normalized.student_id || '').trim();
      const email = String(normalized.email || '').trim().toLowerCase();
      const facultyId = String(normalized.faculty_id || normalized['faculty id'] || '').trim();
      const role = String(normalized.role || '').toLowerCase().trim();
      
      const isFaculty = role === 'faculty' || (!prn && facultyId);
      const isStudent = role === 'student' || prn || (!facultyId && email); // default to student
      
      normalized._isFaculty = isFaculty;
      normalized._isStudent = isStudent;
      normalized._prn = prn || null;
      normalized._email = email || null;
      normalized._facultyId = facultyId || null;
      normalized._role = isFaculty ? 'faculty' : (role === 'ltc_member' ? 'ltc_member' : 'student');
      
      // Basic check
      if (!normalized._email && !normalized._prn && !normalized._facultyId) {
        failed++;
        errorsList.push({ row: 'Unknown', error: 'Missing email, PRN, and Faculty ID. Row skipped.' });
        continue;
      }

      // Deduplicate
      if (isFaculty) {
        if (normalized._facultyId && seenFacultyIds.has(normalized._facultyId)) continue;
        if (normalized._email && seenEmails.has(normalized._email)) continue;
        if (normalized._facultyId) seenFacultyIds.add(normalized._facultyId);
        if (normalized._email) seenEmails.add(normalized._email);
      } else {
        if (normalized._prn && seenPrns.has(normalized._prn)) continue;
        if (normalized._email && seenEmails.has(normalized._email)) continue;
        if (normalized._prn) seenPrns.add(normalized._prn);
        if (normalized._email) seenEmails.add(normalized._email);
      }
      
      uniqueRecords.push(normalized);
    }

    // Update total records count on the job
    const totalRecords = uniqueRecords.length + failed;
    await pool.query(
      "UPDATE upload_jobs SET total_records = $1, status = 'processing', updated_at = NOW() WHERE id = $2",
      [totalRecords, jobId]
    );

    // Pre-hash default passwords for maximum performance
    const defaultStudentHash = await bcrypt.hash('student123', 10);
    const defaultFacultyHash = await bcrypt.hash('password123', 10);
    const defaultMemberHash = await bcrypt.hash('ltc123', 10);

    const CHUNK_SIZE = 1000;
    for (let i = 0; i < uniqueRecords.length; i += CHUNK_SIZE) {
      const chunk = uniqueRecords.slice(i, i + CHUNK_SIZE);
      
      try {
        const chunkEmails = chunk.map(r => r._email).filter(Boolean);
        const chunkPrns = chunk.map(r => r._prn).filter(Boolean);
        const chunkFacultyIds = chunk.map(r => r._facultyId).filter(Boolean);

        // Fetch existing users matching any identifier in this chunk
        let existingUsers = [];
        if (chunkEmails.length > 0 || chunkPrns.length > 0 || chunkFacultyIds.length > 0) {
          const res = await pool.query(
            `SELECT id, email, prn, faculty_id FROM users
             WHERE email = ANY($1) OR prn = ANY($2) OR faculty_id = ANY($3)`,
            [chunkEmails, chunkPrns, chunkFacultyIds]
          );
          existingUsers = res.rows;
        }

        const existingByEmail = new Map();
        const existingByPrn = new Map();
        const existingByFacultyId = new Map();

        for (const u of existingUsers) {
          if (u.email) existingByEmail.set(u.email.toLowerCase(), u);
          if (u.prn) existingByPrn.set(u.prn, u);
          if (u.faculty_id) existingByFacultyId.set(u.faculty_id, u);
        }

        const toInsert = [];
        const toUpdate = [];
        const skippedDuplicates = [];

        for (const r of chunk) {
          let matchedUser = null;
          if (r._email && existingByEmail.has(r._email)) matchedUser = existingByEmail.get(r._email);
          else if (r._prn && existingByPrn.has(r._prn)) matchedUser = existingByPrn.get(r._prn);
          else if (r._facultyId && existingByFacultyId.has(r._facultyId)) matchedUser = existingByFacultyId.get(r._facultyId);

          const name = r.name || r.full_name || r.student_name;
          if (!name) {
            failed++;
            errorsList.push({ row: r._email || r._prn || r._facultyId || 'Row', error: 'Missing name column.' });
            continue;
          }

          if (matchedUser) {
            if (duplicateAction === 'skip') {
              failed++;
              errorsList.push({ 
                row: r._email || r._prn || r._facultyId || name || 'Row', 
                error: `Skipped duplicate profile: ${name} (PRN: ${r._prn || 'N/A'}, Email: ${r._email || 'N/A'})` 
              });
              skippedDuplicates.push({ id: matchedUser.id, record: r });
            } else {
              toUpdate.push({ id: matchedUser.id, record: r });
            }
          } else {
            toInsert.push(r);
          }
        }

        // Bulk insert new users
        let insertedRows = [];
        if (toInsert.length > 0) {
          const insertParams = [];
          const insertValueRows = [];
          let paramIdx = 1;

          for (const r of toInsert) {
            const passHash = r._role === 'faculty' ? defaultFacultyHash : (r._role === 'ltc_member' ? defaultMemberHash : defaultStudentHash);
            const values = [
              r.name || r.full_name || r.student_name,
              r._email || `temp_${Date.now()}_${Math.floor(Math.random() * 100000)}@ltc.edu`,
              passHash,
              r._role,
              r.department || null,
              r.semester || r.year || null,
              r.division || null,
              r.school || null,
              (r.panel || '').trim().toUpperCase() || null,
              r.is_primary === 'true' || r.is_primary === true || r.role === 'primary',
              r._prn,
              r._facultyId,
              r.phone || null,
              r.dob || null,
              r.gender || null,
              r.program || null,
              r.year || r.semester || null,
              r.designation || null,
              r.status || 'active',
              r.nri === true || r.nri === 1 || String(r.nri).toLowerCase().trim() === 'yes' || String(r.nri).toLowerCase().trim() === 'true',
            ];

            const placeholders = [];
            for (let j = 0; j < values.length; j++) {
              placeholders.push(`$${paramIdx++}`);
            }
            insertValueRows.push(`(${placeholders.join(', ')})`);
            insertParams.push(...values);
          }

          const insertRes = await pool.query(
            `INSERT INTO users (name, email, password, role, department, semester, division, school, panel, is_primary, prn, faculty_id, phone, dob, gender, program, year, designation, status, nri)
             VALUES ${insertValueRows.join(', ')}
             RETURNING id, email, prn, faculty_id, role, name`,
            insertParams
          );
          insertedRows = insertRes.rows;
          success += insertedRows.length;


        }

        // Bulk update existing users
        if (toUpdate.length > 0) {
          const updateParams = [];
          const updateValueRows = [];
          let paramIdx = 1;

          for (const item of toUpdate) {
            const r = item.record;
            const values = [
              item.id,
              r.name || r.full_name || r.student_name,
              r.department || null,
              r.semester || r.year || null,
              r.division || null,
              r.school || null,
              (r.panel || '').trim().toUpperCase() || null,
              r.phone || null,
              r.dob || null,
              r.gender || null,
              r.program || null,
              r.year || r.semester || null,
              r.designation || null,
              r.status || 'active',
              r.nri === true || r.nri === 1 || String(r.nri).toLowerCase().trim() === 'yes' || String(r.nri).toLowerCase().trim() === 'true',
            ];

            const placeholders = [
              `$${paramIdx++}::int`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::varchar`,
              `$${paramIdx++}::boolean`,
            ];

            updateValueRows.push(`(${placeholders.join(', ')})`);
            updateParams.push(...values);
          }

          await pool.query(
            `UPDATE users AS u SET
              name = v.name,
              department = COALESCE(v.department, u.department),
              semester = COALESCE(v.semester, u.semester),
              division = COALESCE(v.division, u.division),
              school = COALESCE(v.school, u.school),
              panel = COALESCE(v.panel, u.panel),
              phone = COALESCE(v.phone, u.phone),
              dob = COALESCE(v.dob, u.dob),
              gender = COALESCE(v.gender, u.gender),
              program = COALESCE(v.program, u.program),
              year = COALESCE(v.year, u.year),
              designation = COALESCE(v.designation, u.designation),
              status = COALESCE(v.status, u.status),
              nri = COALESCE(v.nri, u.nri)
            FROM (VALUES ${updateValueRows.join(', ')}) AS v(id, name, department, semester, division, school, panel, phone, dob, gender, program, year, designation, status, nri)
            WHERE u.id = v.id`,
            updateParams
          );
          success += toUpdate.length;
        }

        // 4. Batch Allocation
        if (isBatchSpecific && batchId) {
          const allProcessedUsers = [
            ...insertedRows.map(u => ({ id: u.id, role: u.role, email: u.email, prn: u.prn, faculty_id: u.faculty_id, name: u.name })),
            ...toUpdate.map(item => {
              const r = item.record;
              return { id: item.id, role: r._role, email: r._email, prn: r._prn, faculty_id: r._facultyId, name: r.name || r.full_name || r.student_name };
            }),
            ...skippedDuplicates.map(item => {
              const r = item.record;
              return { id: item.id, role: r._role, email: r._email, prn: r._prn, faculty_id: r._facultyId, name: r.name || r.full_name || r.student_name };
            })
          ];

          const studentsAlloc = allProcessedUsers.filter(u => u.role === 'student');
          const facultyAlloc = allProcessedUsers.filter(u => u.role === 'faculty');

          if (studentsAlloc.length > 0) {
            const studentIds = studentsAlloc.map(s => s.id);
            
            const checkAllocRes = await pool.query(
              `SELECT bs.student_id, b.name AS batch_name
               FROM batch_students bs
               JOIN batches b ON bs.batch_id = b.id
               WHERE bs.student_id = ANY($1) AND bs.batch_id <> $2 AND b.is_deleted IS NOT TRUE`,
              [studentIds, batchId]
            );

            const activeBatchMap = new Map();
            for (const row of checkAllocRes.rows) {
              activeBatchMap.set(row.student_id, row.batch_name);
            }

            const validStudents = [];
            for (const s of studentsAlloc) {
              if (activeBatchMap.has(s.id)) {
                failed++;
                success--;
                errorsList.push({ row: s.email || s.prn || 'Student', error: `Student already allocated to active batch: ${activeBatchMap.get(s.id)}` });
              } else {
                validStudents.push(s);
              }
            }

            if (validStudents.length > 0) {
              const studentParams = [];
              const studentValueRows = [];
              let studentParamIdx = 1;

              for (const s of validStudents) {
                const barcode = `LTC-${batchId}-${s.id}-${Math.floor(Math.random() * 10000)}`;
                const origRecord = chunk.find(r => r._email === s.email || r._prn === s.prn);
                const room = origRecord ? origRecord.room : null;

                studentValueRows.push(`($${studentParamIdx++}, $${studentParamIdx++}, $${studentParamIdx++}, $${studentParamIdx++}, $${studentParamIdx++})`);
                studentParams.push(batchId, s.id, barcode, null, room || null);
              }

              await pool.query(
                `INSERT INTO batch_students (batch_id, student_id, barcode, squad, room)
                 VALUES ${studentValueRows.join(', ')}
                 ON CONFLICT (batch_id, student_id)
                 DO UPDATE SET room = COALESCE(EXCLUDED.room, batch_students.room)`,
                studentParams
              );

              for (const s of validStudents) {
                sendLtcBatchEmail(s.name, s.email);
              }
            }
          }

          if (facultyAlloc.length > 0) {
            const facultyParams = [];
            const facultyValueRows = [];
            let facultyParamIdx = 1;

            for (const f of facultyAlloc) {
              facultyValueRows.push(`($${facultyParamIdx++}, $${facultyParamIdx++})`);
              facultyParams.push(batchId, f.id);
            }

            await pool.query(
              `INSERT INTO batch_faculty (batch_id, faculty_id)
               VALUES ${facultyValueRows.join(', ')}
               ON CONFLICT (batch_id, faculty_id) DO NOTHING`,
              facultyParams
            );
          }
        }
      } catch (chunkErr) {
        console.error(`Error processing chunk at index ${i}:`, chunkErr);
        failed += chunk.length;
        errorsList.push({ row: 'Chunk Ingestion', error: `Database chunk insertion failed: ${chunkErr.message}` });
      }

      processed += chunk.length;

      await pool.query(
        `UPDATE upload_jobs
         SET processed_records = $1, success_count = $2, failed_count = $3, errors = $4, updated_at = NOW()
         WHERE id = $5`,
        [processed, success, failed, JSON.stringify(errorsList), jobId]
      );

      await new Promise(resolve => setImmediate(resolve));
    }

    await pool.query(
      `UPDATE upload_jobs
       SET status = 'completed', updated_at = NOW()
       WHERE id = $1`,
      [jobId]
    );

    writeAudit(adminUserId, adminUserName, 'BULK_UPLOAD_COMPLETED', 'upload_job', jobId, {
      total_records: processed,
      success_count: success,
      failed_count: failed
    });

  } catch (fatalErr) {
    console.error('Fatal bulk upload error:', fatalErr);
    errorsList.push({ row: 'Fatal Job', error: fatalErr.message });
    await pool.query(
      `UPDATE upload_jobs
       SET status = 'failed', errors = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(errorsList), jobId]
    );
  }
};

// Batch Bulk Upload (auto-detect students/faculty) - BACKGROUND PROCESSOR
app.post('/api/admin/batches/:id/bulk-upload', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const { records, duplicateAction } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: 'records must be a non-empty array' });
  }

  try {
    // Verify batch
    const batchCheck = await pool.query("SELECT id, name FROM batches WHERE id = $1", [id]);
    if (batchCheck.rowCount === 0) return res.status(404).json({ message: 'Batch not found' });

    // Initialize the job
    const jobRes = await pool.query(
      `INSERT INTO upload_jobs (batch_id, filename, status, total_records)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [id, `Batch ${batchCheck.rows[0].name} Ingestion`, 'pending', records.length]
    );
    const jobId = jobRes.rows[0].id;

    // Start background processing async
    setImmediate(() => {
      processUploadJobInBackground(jobId, records, parseInt(id), true, req.user.id, req.user.name || 'Admin', duplicateAction || 'replace');
    });

    res.json({ jobId, message: 'Bulk upload started in the background.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Batch Squad Allocation ────────────────────────────────────────────────────

// Get squad allocation state for a batch
app.get('/api/admin/batches/:id/squads', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const lockKey = `batch_${id}_squads_locked`;
    const lockCheck = await pool.query("SELECT value FROM system_settings WHERE key = $1", [lockKey]);
    const isLocked = lockCheck.rowCount > 0 && lockCheck.rows[0].value === 'true';

    const studentsRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.gender, u.prn, bs.squad, bs.room, bs.barcode, bs.is_squad_leader
       FROM batch_students bs
       JOIN users u ON bs.student_id = u.id
       WHERE bs.batch_id = $1
       ORDER BY bs.squad ASC, u.name ASC`,
      [id]
    );

    const facultyRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.department, bf.squad
       FROM batch_faculty bf
       JOIN users u ON bf.faculty_id = u.id
       WHERE bf.batch_id = $1
       ORDER BY bf.squad ASC, u.name ASC`,
      [id]
    );

    res.json({
      locked: isLocked,
      students: studentsRes.rows,
      faculty: facultyRes.rows,
      squadNames: SQUAD_NAMES
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Auto-allocate squads for a batch
app.post('/api/admin/batches/:id/auto-allocate-squads', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const lockKey = `batch_${id}_squads_locked`;
    const lockCheck = await pool.query("SELECT value FROM system_settings WHERE key = $1", [lockKey]);
    if (lockCheck.rowCount > 0 && lockCheck.rows[0].value === 'true') {
      return res.status(400).json({ message: 'Squad allocation is locked for this batch.' });
    }

    const studentsRes = await pool.query(
      "SELECT u.id, u.gender FROM batch_students bs JOIN users u ON bs.student_id = u.id WHERE bs.batch_id = $1",
      [id]
    );
    const students = studentsRes.rows;
    const total = students.length;

    if (total === 0) return res.status(400).json({ message: 'No students in this batch.' });

    // Fisher-Yates shuffle
    const shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const girls = shuffle(students.filter(s => {
      const g = s.gender ? s.gender.trim().toLowerCase() : '';
      return g === 'female' || g === 'f';
    }));
    const boys = shuffle(students.filter(s => {
      const g = s.gender ? s.gender.trim().toLowerCase() : '';
      return g === 'male' || g === 'm';
    }));
    const others = shuffle(students.filter(s => {
      const g = s.gender ? s.gender.trim().toLowerCase() : '';
      return g !== 'female' && g !== 'f' && g !== 'male' && g !== 'm';
    }));
    const allStudents = [...girls, ...boys, ...others];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < allStudents.length; i++) {
        const squadName = SQUAD_NAMES[i % SQUAD_NAMES.length];
        const barcode = `LTC-${id}-${allStudents[i].id}-${Math.floor(Math.random() * 10000)}`;
        await client.query(
          "UPDATE batch_students SET squad = $1, barcode = $2 WHERE batch_id = $3 AND student_id = $4",
          [squadName, barcode, id, allStudents[i].id]
        );
      }

      // Distribute faculty across squads (2 per squad)
      const facultyRes = await client.query(
        "SELECT u.id FROM batch_faculty bf JOIN users u ON bf.faculty_id = u.id WHERE bf.batch_id = $1",
        [id]
      );
      const faculty = shuffle(facultyRes.rows);
      for (let i = 0; i < faculty.length; i++) {
        const squadName = i < 20 ? SQUAD_NAMES[Math.floor(i / 2)] : null;
        await client.query(
          "UPDATE batch_faculty SET squad = $1 WHERE batch_id = $2 AND faculty_id = $3",
          [squadName, id, faculty[i].id]
        );
      }

      await client.query('COMMIT');
      res.json({ message: `Squads allocated for ${allStudents.length} students across ${SQUAD_NAMES.length} squads.` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Manual squad update for a student in a batch
app.put('/api/admin/batches/:id/student-squad', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const { student_id, squad } = req.body;
  try {
    await pool.query(
      "UPDATE batch_students SET squad = $1 WHERE batch_id = $2 AND student_id = $3",
      [squad, id, student_id]
    );
    res.json({ message: 'Squad updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Lock/unlock squad allocation for a batch
app.post('/api/admin/batches/:id/lock-squads', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  const { locked } = req.body;
  try {
    const lockKey = `batch_${id}_squads_locked`;
    await pool.query(
      `INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [lockKey, locked ? 'true' : 'false']
    );
    res.json({ message: `Squad allocation ${locked ? 'locked' : 'unlocked'}.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXISTING / LEGACY ROUTES (preserved for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

// Faculty Dashboard
app.get('/api/faculty/dashboard', authMiddleware(['faculty']), async (req, res) => {
  try {
    const activeBatchRes = await pool.query(
      `SELECT bf.batch_id, bf.squad, b.name as batch_name
       FROM batch_faculty bf
       JOIN batches b ON bf.batch_id = b.id
       WHERE bf.faculty_id = $1 AND (b.is_deleted = false OR b.is_deleted IS NULL)
       ORDER BY bf.batch_id DESC LIMIT 1`,
      [req.user.id]
    );
    const activeBatchId = activeBatchRes.rowCount > 0 ? activeBatchRes.rows[0].batch_id : null;
    const squadName = activeBatchRes.rowCount > 0 ? activeBatchRes.rows[0].squad : null;

    const facultyUser = await pool.query(
      "SELECT id, name, email, role, department, division, school, panel FROM users WHERE id = $1",
      [req.user.id]
    );
    const facultyInfo = facultyUser.rows[0];
    if (facultyInfo) {
      facultyInfo.squad = squadName || null;
    }

    let squadLeader = null;
    let squadStudents = [];
    let myStudentsRows = [];

    if (activeBatchId && squadName) {
      // Fetch squad students from the active batch
      const squadStudentsRes = await pool.query(
        `SELECT u.id, u.name, u.email, u.semester, u.department, u.panel, u.nri, u.red_flag, u.gender, u.prn, u.phone,
                u.undertaking_submitted,
                bs.squad, bs.room, bs.barcode
         FROM users u
         JOIN batch_students bs ON u.id = bs.student_id
         WHERE u.role = 'student' AND bs.batch_id = $1 AND bs.squad = $2`,
        [activeBatchId, squadName]
      );
      squadStudents = squadStudentsRes.rows;
      myStudentsRows = squadStudents; // restrict active students panel list to squad students

      // Fetch squad leader
      const leaderRes = await pool.query(
        `SELECT u.name, u.email, u.prn, u.phone
         FROM batch_students bs
         JOIN users u ON bs.student_id = u.id
         WHERE bs.batch_id = $1 AND bs.squad = $2 AND bs.is_squad_leader = true
         LIMIT 1`,
        [activeBatchId, squadName]
      );
      if (leaderRes.rowCount > 0) {
        squadLeader = leaderRes.rows[0];
      } else {
        const legacyLeaderRes = await pool.query("SELECT * FROM squad_leaders WHERE squad_name = $1", [squadName]);
        if (legacyLeaderRes.rowCount > 0) squadLeader = legacyLeaderRes.rows[0];
      }
    } else {
      // Fallback/legacy behavior if not allocated to a squad in any active batch
      const panels = (req.user.panel || '').split(',').map(p => p.trim()).filter(Boolean);
      let myStudents;
      if (panels.length > 0) {
        myStudents = await pool.query(
          "SELECT id, name, email, semester, department, panel, nri, red_flag, prn, undertaking_submitted FROM users WHERE role = 'student' AND panel = ANY($1)",
          [panels]
        );
      } else {
        myStudents = await pool.query(
          "SELECT id, name, email, semester, department, panel, nri, red_flag, prn, undertaking_submitted FROM users WHERE role = 'student' AND department = $1",
          [req.user.department]
        );
      }
      myStudentsRows = myStudents.rows;
    }

    let batchFaculty = [];
    if (activeBatchId && squadName) {
      const batchFacultyRes = await pool.query(
        `SELECT u.id, u.name, u.email, u.department, u.school, u.panel, bf.squad
         FROM users u
         JOIN batch_faculty bf ON u.id = bf.faculty_id
         WHERE bf.batch_id = $1 AND bf.squad = $2`,
        [activeBatchId, squadName]
      );
      batchFaculty = batchFacultyRes.rows;
    }

    res.json({
      message: 'Welcome Faculty',
      data: withLtcId(myStudentsRows),
      facultyInfo,
      squadLeader,
      squadStudents: withLtcId(squadStudents),
      batchFaculty
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/faculty/toggle-red-flag', authMiddleware(['faculty']), async (req, res) => {
  const { student_id } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET red_flag = NOT COALESCE(red_flag, false) WHERE id = $1 RETURNING red_flag",
      [student_id]
    );
    res.json({ success: true, red_flag: result.rows[0].red_flag });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle red flag', error: err.message });
  }
});

// Student Dashboard
app.get('/api/student/dashboard', authMiddleware(['student']), async (req, res) => {
  try {
    const myData = await pool.query(
      `SELECT u.id, u.name, u.email, u.semester, u.department, u.prn, u.red_flag,
              u.in_current_batch, u.undertaking_submitted, u.undertaking_signed_name, u.undertaking_signed_date,
              (i.prn IS NOT NULL) as insured, i.policy_number, i.provider,
              bs.batch_id, bs.squad, bs.room
       FROM users u
       LEFT JOIN insurance i ON u.prn = i.prn
       LEFT JOIN batch_students bs ON u.id = bs.student_id AND bs.batch_id = (
         SELECT bs2.batch_id FROM batch_students bs2
         JOIN batches b2 ON bs2.batch_id = b2.id
         WHERE bs2.student_id = u.id AND (b2.is_deleted = false OR b2.is_deleted IS NULL)
         ORDER BY bs2.batch_id DESC LIMIT 1
       )
       WHERE u.id = $1`,
      [req.user.id]
    );
    const studentObj = myData.rows[0];
    let squadFaculty = [];
    if (studentObj && studentObj.batch_id && studentObj.squad) {
      const facultyRes = await pool.query(
        `SELECT u.name, u.email, u.department
         FROM batch_faculty bf
         JOIN users u ON bf.faculty_id = u.id
         WHERE bf.batch_id = $1 AND bf.squad = $2`,
        [studentObj.batch_id, studentObj.squad]
      );
      squadFaculty = facultyRes.rows;
    }
    res.json({ message: 'Welcome Student', data: studentObj, squadFaculty });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin Dashboard
app.get('/api/admin/dashboard', authMiddleware(['admin']), async (req, res) => {
  try {
    const allFaculties = await pool.query("SELECT id, name, email, department FROM users WHERE role = 'faculty'");
    const allStudents = await pool.query("SELECT id, name, email, semester, department FROM users WHERE role = 'student'");
    res.json({ message: 'Welcome Admin', faculties: allFaculties.rows, students: allStudents.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin Users (all) — used for existing tabs
app.get('/api/admin/users', authMiddleware(['admin']), async (req, res) => {
  try {
    const allUsers = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.department, u.semester,
             u.division, u.school, u.panel, u.is_primary, u.prn,
             u.squad, u.room, u.barcode, u.in_current_batch,
             u.undertaking_submitted, u.undertaking_signed_name, u.undertaking_signed_date,
             u.is_squad_leader, u.phone,
             (i.prn IS NOT NULL) as insured, i.policy_number, i.provider
      FROM users u
      LEFT JOIN insurance i ON u.prn = i.prn
      ORDER BY u.id ASC
    `);
    const squadLeadersRes = await pool.query("SELECT * FROM squad_leaders");
    res.json({ users: allUsers.rows, squadLeaders: squadLeadersRes.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/admin/update-panel', authMiddleware(['admin']), async (req, res) => {
  const { user_id, panel } = req.body;
  try {
    await pool.query("UPDATE users SET panel = $1 WHERE id = $2", [panel, user_id]);
    res.json({ message: 'Panel updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/admin/update-division', authMiddleware(['admin']), async (req, res) => {
  const { user_id, division } = req.body;
  try {
    await pool.query("UPDATE users SET division = $1 WHERE id = $2", [division || null, user_id]);
    res.json({ message: 'Division updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/admin/insurance', authMiddleware(['admin']), async (req, res) => {
  const { user_id, insurance } = req.body;
  try {
    const userRes = await pool.query("SELECT prn FROM users WHERE id = $1", [user_id]);
    if (userRes.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const prn = userRes.rows[0].prn;
    if (!prn) return res.status(400).json({ message: 'User has no PRN' });
    if (insurance) {
      await pool.query(
        "INSERT INTO insurance (prn, policy_number, provider) VALUES ($1, $2, $3) ON CONFLICT (prn) DO NOTHING",
        [prn, 'POLICY-' + user_id, 'LTC Provider']
      );
    } else {
      await pool.query("DELETE FROM insurance WHERE prn = $1", [prn]);
    }
    res.json({ message: 'Insurance updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Pre-flight validation endpoint to detect duplicates
app.post('/api/admin/bulk-upload/validate', authMiddleware(['admin']), async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    return res.status(400).json({ message: 'users must be an array' });
  }

  try {
    const emails = [];
    const prns = [];
    const facultyIds = [];

    // Extract unique identifier arrays
    for (const r of users) {
      if (!r || typeof r !== 'object') continue;

      const normalized = {};
      for (const key in r) {
        const cleanKey = key.replace(/^\uFEFF/, '').toLowerCase().trim();
        normalized[cleanKey] = r[key];
      }

      const prn = String(normalized.prn || normalized['student id'] || normalized.student_id || '').trim();
      const email = String(normalized.email || '').trim().toLowerCase();
      const facultyId = String(normalized.faculty_id || normalized['faculty id'] || '').trim();

      if (email) emails.push(email);
      if (prn) prns.push(prn);
      if (facultyId) facultyIds.push(facultyId);
    }

    let existingUsers = [];
    if (emails.length > 0 || prns.length > 0 || facultyIds.length > 0) {
      const dbRes = await pool.query(
        `SELECT id, email, prn, faculty_id, role, name FROM users
         WHERE (email IS NOT NULL AND email = ANY($1)) 
            OR (prn IS NOT NULL AND prn = ANY($2)) 
            OR (faculty_id IS NOT NULL AND faculty_id = ANY($3))`,
        [emails, prns, facultyIds]
      );
      existingUsers = dbRes.rows;
    }

    const duplicates = [];
    for (const r of users) {
      if (!r || typeof r !== 'object') continue;

      const normalized = {};
      for (const key in r) {
        const cleanKey = key.replace(/^\uFEFF/, '').toLowerCase().trim();
        normalized[cleanKey] = r[key];
      }

      const prn = String(normalized.prn || normalized['student id'] || normalized.student_id || '').trim();
      const email = String(normalized.email || '').trim().toLowerCase();
      const facultyId = String(normalized.faculty_id || normalized['faculty id'] || '').trim();

      let matched = existingUsers.find(u => 
        (email && u.email && u.email.toLowerCase() === email) ||
        (prn && u.prn && u.prn === prn) ||
        (facultyId && u.faculty_id && u.faculty_id === facultyId)
      );

      if (matched) {
        duplicates.push({
          uploadRecord: {
            name: normalized.name || normalized.full_name || normalized.student_name || 'Unknown',
            email: email || null,
            prn: prn || null,
            faculty_id: facultyId || null,
            role: normalized.role || 'student'
          },
          existingRecord: {
            name: matched.name,
            email: matched.email,
            prn: matched.prn,
            faculty_id: matched.faculty_id,
            role: matched.role
          }
        });
      }
    }

    res.json({ duplicates });
  } catch (err) {
    res.status(500).json({ message: 'Server error during validation', error: err.message });
  }
});

// Bulk Upload (global, not batch-specific)
app.post('/api/admin/bulk-upload', authMiddleware(['admin']), async (req, res) => {
  const { users, duplicateAction } = req.body;
  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ message: 'users must be a non-empty array' });
  }
  try {
    const jobRes = await pool.query(
      `INSERT INTO upload_jobs (batch_id, filename, status, total_records)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [null, 'Global Master Ingestion', 'pending', users.length]
    );
    const jobId = jobRes.rows[0].id;

    // Start background processing
    setImmediate(() => {
      processUploadJobInBackground(jobId, users, null, false, req.user.id, req.user.name || 'Admin', duplicateAction || 'replace');
    });

    res.json({ jobId, message: 'Bulk upload started in the background.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Polling endpoint for upload job progress
app.get('/api/admin/upload-jobs/:jobId', authMiddleware(['admin']), async (req, res) => {
  const { jobId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, batch_id, filename, status, total_records, processed_records, success_count, failed_count, errors, created_at, updated_at
       FROM upload_jobs WHERE id = $1`,
      [jobId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Job not found' });
    res.json({ job: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Auto-allocate rooms/squads (legacy)
app.post('/api/admin/auto-allocate', authMiddleware(['admin']), async (req, res) => {
  try {
    const studentsRes = await pool.query("SELECT id, gender FROM users WHERE role = 'student'");
    let students = studentsRes.rows.sort(() => Math.random() - 0.5);
    let currentRoomMale = 1, roomMaleCount = 0;
    let currentRoomFemale = 1, roomFemaleCount = 0;
    let currentRoomUnans = 1, roomUnansCount = 0;
    let currentSquad = 1, squadCount = 0;
    const updatePromises = [];
    for (const s of students) {
      if (squadCount >= 60) { currentSquad++; squadCount = 0; }
      const squadName = SQUAD_NAMES[(currentSquad - 1) % 10];
      squadCount++;
      let roomName = '';
      if (s.gender && s.gender.toLowerCase() === 'male') {
        if (roomMaleCount >= 40) { currentRoomMale++; roomMaleCount = 0; }
        roomName = `M-${currentRoomMale}`; roomMaleCount++;
      } else if (s.gender && s.gender.toLowerCase() === 'female') {
        if (roomFemaleCount >= 40) { currentRoomFemale++; roomFemaleCount = 0; }
        roomName = `F-${currentRoomFemale}`; roomFemaleCount++;
      } else {
        if (roomUnansCount >= 40) { currentRoomUnans++; roomUnansCount = 0; }
        roomName = `U-${currentRoomUnans}`; roomUnansCount++;
      }
      const barcode = `LTC-${s.id}-${Math.floor(Math.random() * 10000)}`;
      updatePromises.push(
        pool.query("UPDATE users SET squad = $1, room = $2, barcode = $3 WHERE id = $4", [squadName, roomName, barcode, s.id])
      );
    }
    await Promise.all(updatePromises);
    res.json({ message: `Allocated ${students.length} students.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Bulk insurance
const handleBulkInsurance = async (req, res) => {
  const data = req.body.users || req.body.insuranceData;
  if (!Array.isArray(data)) return res.status(400).json({ message: 'Data must be an array' });
  try {
    const results = [], errors = [];
    for (const item of data) {
      try {
        const prn = String(item.prn || item.PRN || '').trim();
        if (!prn) throw new Error('Missing PRN');
        await pool.query(
          "INSERT INTO insurance (prn, policy_number, provider) VALUES ($1, $2, $3) ON CONFLICT (prn) DO UPDATE SET policy_number = EXCLUDED.policy_number, provider = EXCLUDED.provider",
          [prn, item.policy_number || item.policy || 'POLICY-BULK', item.provider || 'LTC Provider']
        );
        results.push(prn);
      } catch (err) {
        errors.push({ prn: item.prn, error: err.message });
      }
    }
    res.status(201).json({ message: `Processed ${results.length} insurance records.`, results, errors });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
app.post('/api/admin/bulk-insurance', authMiddleware(['admin']), handleBulkInsurance);
app.post('/api/admin/insurance-bulk-upload', authMiddleware(['admin']), handleBulkInsurance);

// User by barcode
app.get('/api/admin/user-by-barcode', authMiddleware(['admin', 'faculty', 'ltc_member']), async (req, res) => {
  const { barcode } = req.query;
  try {
    const user = await pool.query(
      "SELECT id, name, email, role, department, division, school, panel, squad, room, barcode FROM users WHERE barcode = $1",
      [barcode]
    );
    if (user.rowCount === 0) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: user.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Public verify
app.get('/api/verify', async (req, res) => {
  const { barcode } = req.query;
  try {
    const user = await pool.query(
      "SELECT id, name, email, department, squad, room, barcode FROM users WHERE barcode = $1",
      [barcode]
    );
    if (user.rowCount === 0) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: user.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Documents
app.post('/api/documents', authMiddleware(['admin', 'faculty']), async (req, res) => {
  const { name, url, target_role } = req.body;
  try {
    const doc = await pool.query(
      "INSERT INTO documents (name, url, uploaded_by, target_role) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, url, req.user.id, target_role]
    );
    res.json({ message: 'Document uploaded', document: doc.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/api/documents/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    await pool.query("DELETE FROM documents WHERE id = $1", [req.params.id]);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/documents', authMiddleware(), async (req, res) => {
  try {
    let docs;
    if (req.user.role === 'admin') {
      docs = await pool.query("SELECT * FROM documents ORDER BY id DESC");
    } else {
      docs = await pool.query(
        "SELECT * FROM documents WHERE target_role = $1 OR target_role = 'all' ORDER BY id DESC",
        [req.user.role]
      );
    }
    res.json({ documents: docs.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Scheduling
app.post('/api/faculty/schedule', authMiddleware(['faculty']), async (req, res) => {
  const { title, date, time, panel } = req.body;
  try {
    await pool.query(
      "INSERT INTO schedules (title, date, time, faculty_id, panel) VALUES ($1, $2, $3, $4, $5)",
      [title, date, time, req.user.id, panel]
    );
    res.json({ message: 'Schedule created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/api/faculty/schedule/:id', authMiddleware(['faculty']), async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query("SELECT * FROM schedules WHERE id = $1 AND faculty_id = $2", [id, req.user.id]);
    if (check.rowCount === 0) return res.status(403).json({ message: 'Unauthorized' });
    await pool.query("DELETE FROM attendance WHERE schedule_id = $1", [id]);
    await pool.query("DELETE FROM evaluations WHERE schedule_id = $1", [id]);
    await pool.query("DELETE FROM schedules WHERE id = $1", [id]);
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/schedules', authMiddleware(), async (req, res) => {
  try {
    let query;
    if (req.user.role === 'admin') {
      query = await pool.query("SELECT * FROM schedules ORDER BY date DESC, time DESC");
    } else if (req.user.role === 'faculty') {
      query = await pool.query("SELECT * FROM schedules WHERE faculty_id = $1 ORDER BY date DESC, time DESC", [req.user.id]);
    } else {
      query = await pool.query("SELECT * FROM schedules WHERE panel = 'ALL' OR panel = $1", [req.user.panel || 'Unassigned']);
    }
    res.json({ schedules: query.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Evaluations
app.post('/api/faculty/evaluate', authMiddleware(['admin', 'faculty']), async (req, res) => {
  const { student_id, schedule_id, marks, remarks, report_url, photo_url, marking_scheme } = req.body;
  try {
    await pool.query(
      "INSERT INTO evaluations (student_id, faculty_id, schedule_id, marks, remarks, report_url, photo_url, marking_scheme) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [student_id, req.user.id, schedule_id, marks, remarks, report_url || null, photo_url || null, marking_scheme || null]
    );
    res.json({ message: 'Evaluation submitted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/faculty/evaluations', authMiddleware(['admin', 'faculty']), async (req, res) => {
  try {
    let evals;
    if (req.user.role === 'admin') {
      evals = await pool.query("SELECT * FROM evaluations");
    } else {
      evals = await pool.query("SELECT * FROM evaluations WHERE faculty_id = $1", [req.user.id]);
    }
    res.json({ evaluations: evals.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Attendance
app.get('/api/faculty/attendance_records', authMiddleware(['admin', 'faculty']), async (req, res) => {
  try {
    let att;
    if (req.user.role === 'admin') {
      att = await pool.query("SELECT * FROM attendance");
    } else {
      att = await pool.query(
        `SELECT a.* FROM attendance a JOIN schedules s ON a.schedule_id = s.id WHERE s.faculty_id = $1`,
        [req.user.id]
      );
    }
    res.json({ records: att.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/faculty/attendance', authMiddleware(['admin', 'faculty']), async (req, res) => {
  const { schedule_id, student_id, status } = req.body;
  try {
    await pool.query(
      "INSERT INTO attendance (schedule_id, student_id, status) VALUES ($1, $2, $3)",
      [schedule_id, student_id, status]
    );
    res.json({ message: 'Attendance marked' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/faculty/assign-panel', authMiddleware(['faculty']), async (req, res) => {
  const { student_id, panel } = req.body;
  try {
    await pool.query("UPDATE users SET panel = $1 WHERE id = $2 AND role = 'student'", [panel, student_id]);
    res.json({ message: 'Panel updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Student APIs
app.get('/api/student/schedules', authMiddleware(['student']), async (req, res) => {
  try {
    const schedules = await pool.query(
      "SELECT * FROM schedules WHERE panel = 'ALL' OR panel = $1",
      [req.user.panel || 'Unassigned']
    );
    res.json({ schedules: schedules.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/student/attendance', authMiddleware(['student']), async (req, res) => {
  try {
    const att = await pool.query(
      `SELECT a.status, s.title, s.date FROM attendance a JOIN schedules s ON a.schedule_id = s.id WHERE a.student_id = $1`,
      [req.user.id]
    );
    res.json({ attendance: att.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/student/evaluations', authMiddleware(['student']), async (req, res) => {
  try {
    const evals = await pool.query(
      `SELECT e.*, s.title as activity_title FROM evaluations e LEFT JOIN schedules s ON e.schedule_id = s.id WHERE e.student_id = $1`,
      [req.user.id]
    );
    res.json({ evaluations: evals.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Profile
app.get('/api/me', authMiddleware(), async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.semester, u.division, u.school, u.panel, u.is_primary,
              (CASE 
                WHEN u.role = 'student' THEN (
                  SELECT bs.squad FROM batch_students bs
                  JOIN batches b ON bs.batch_id = b.id
                  WHERE bs.student_id = u.id AND (b.is_deleted = false OR b.is_deleted IS NULL)
                  ORDER BY bs.batch_id DESC LIMIT 1
                )
                WHEN u.role = 'faculty' THEN (
                  SELECT bf.squad FROM batch_faculty bf
                  JOIN batches b ON bf.batch_id = b.id
                  WHERE bf.faculty_id = u.id AND (b.is_deleted = false OR b.is_deleted IS NULL)
                  ORDER BY bf.batch_id DESC LIMIT 1
                )
                ELSE NULL
              END) as batch_squad,
              u.squad
       FROM users u
       WHERE u.id = $1`,
      [req.user.id]
    );
    const userObj = user.rows[0];
    if (userObj) {
      userObj.squad = userObj.batch_squad || userObj.squad || null;
      delete userObj.batch_squad;
    }
    res.json({ user: userObj });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/me', authMiddleware(), async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  try {
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    const user = userResult.rows[0];
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password is required.' });
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Incorrect current password.' });
      const hashedNew = await bcrypt.hash(newPassword, 10);
      await pool.query("UPDATE users SET name = $1, password = $2 WHERE id = $3", [name || user.name, hashedNew, req.user.id]);
    } else {
      await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name || user.name, req.user.id]);
    }
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Feedback
app.post('/api/feedback', authMiddleware(['student', 'faculty', 'ltc_member']), async (req, res) => {
  const { feedback_text, category, additional_notes } = req.body;
  try {
    await pool.query(
      "INSERT INTO feedback (user_id, role, feedback_text, category, additional_notes) VALUES ($1, $2, $3, $4, $5)",
      [req.user.id, req.user.role, feedback_text, category || 'General', additional_notes || null]
    );
    res.json({ message: 'Feedback submitted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/admin/feedback', authMiddleware(['admin']), async (req, res) => {
  const { user_id } = req.query;
  try {
    let query = `SELECT f.*, u.name, u.email FROM feedback f JOIN users u ON f.user_id = u.id`;
    const params = [];
    if (user_id) { query += ` WHERE f.user_id = $1`; params.push(user_id); }
    query += ` ORDER BY f.created_at DESC`;
    const feedback = await pool.query(query, params);
    res.json({ feedback: feedback.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Audit logs endpoint (paginated and filterable)
app.get('/api/admin/audit-logs', authMiddleware(['admin']), async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const action = req.query.action || '';
  const search = req.query.search || '';

  try {
    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIdx = 1;

    if (action) {
      whereClause += ` AND action = $${paramIdx}`;
      params.push(action);
      paramIdx++;
    }
    if (search) {
      whereClause += ` AND (user_name ILIKE $${paramIdx} OR details ILIKE $${paramIdx} OR entity_type ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    const dataRes = await pool.query(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    res.json({
      logs: dataRes.rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// LTC Member Dashboard
app.get('/api/ltc/dashboard', authMiddleware(['ltc_member']), async (req, res) => {
  try {
    const totalStudentsRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'student'");
    const totalSquadsRes = await pool.query("SELECT COUNT(DISTINCT squad) FROM users WHERE role = 'student' AND squad IS NOT NULL");
    const totalRoomsRes = await pool.query("SELECT COUNT(DISTINCT room) FROM users WHERE role = 'student' AND room IS NOT NULL");
    const nriCountRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'student' AND nri = true");
    const redFlagCountRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'student' AND red_flag = true");
    const studentsRes = await pool.query(
      "SELECT id, name, email, semester, department, division, school, panel, squad, room, barcode, nri, red_flag, is_squad_leader, phone, prn, gender FROM users WHERE role = 'student' ORDER BY id ASC"
    );
    const docRes = await pool.query("SELECT * FROM documents WHERE target_role = 'all' OR target_role = 'faculty'");
    const squadLeadersRes = await pool.query("SELECT * FROM squad_leaders");
    res.json({
      stats: {
        totalStudents: parseInt(totalStudentsRes.rows[0].count),
        totalSquads: parseInt(totalSquadsRes.rows[0].count),
        totalRooms: parseInt(totalRoomsRes.rows[0].count),
        nriCount: parseInt(nriCountRes.rows[0].count),
        redFlagCount: parseInt(redFlagCountRes.rows[0].count),
      },
      students: studentsRes.rows,
      documents: docRes.rows,
      squadLeaders: squadLeadersRes.rows,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/ltc/squad-leader', authMiddleware(['ltc_member']), async (req, res) => {
  const { squadName, name, email, prn, phone } = req.body;
  try {
    if (!squadName) return res.status(400).json({ message: 'Squad name is required.' });
    await pool.query(
      `INSERT INTO squad_leaders (squad_name, name, email, prn, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (squad_name) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, prn=EXCLUDED.prn, phone=EXCLUDED.phone`,
      [squadName, name || '', email || '', prn || '', phone || '']
    );
    res.json({ message: 'Squad leader updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: Delete user
app.delete('/api/admin/users/:id', authMiddleware(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const userRes = await pool.query("SELECT role FROM users WHERE id = $1", [id]);
    if (userRes.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    if (userRes.rows[0].role === 'admin') return res.status(403).json({ message: 'Cannot delete admin' });
    await pool.query("DELETE FROM batch_students WHERE student_id = $1", [id]);
    await pool.query("DELETE FROM batch_faculty WHERE faculty_id = $1", [id]);
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: 'User deleted from master database.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin: Reset DB
app.post('/api/admin/reset-database', authMiddleware(['admin']), async (req, res) => {
  try {
    await pool.query("DELETE FROM batch_students");
    await pool.query("DELETE FROM batch_faculty");
    await pool.query("DELETE FROM batches");
    await pool.query("DELETE FROM users WHERE role != 'admin'");
    await pool.query("DELETE FROM schedules");
    await pool.query("DELETE FROM attendance");
    await pool.query("DELETE FROM evaluations");
    await pool.query("DELETE FROM feedback");
    await pool.query("DELETE FROM documents");
    await pool.query("DELETE FROM insurance");
    await pool.query("DELETE FROM squad_leaders");
    res.json({ message: 'Database reset. Admin account preserved.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset database', error: err.message });
  }
});

// Legacy current batch endpoints
app.get('/api/admin/current-batch', authMiddleware(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.semester,
              u.division, u.school, u.panel, u.is_primary, u.prn,
              u.squad, u.room, u.barcode, u.in_current_batch,
              u.undertaking_submitted, u.undertaking_signed_name, u.undertaking_signed_date,
              (i.prn IS NOT NULL) as insured
       FROM users u
       LEFT JOIN insurance i ON u.prn = i.prn
       WHERE u.role = 'student' AND u.in_current_batch = true
       ORDER BY u.id ASC`
    );
    res.json({ students: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/admin/set-current-batch', authMiddleware(['admin']), async (req, res) => {
  const { identifiers, matchType } = req.body;
  if (!Array.isArray(identifiers)) return res.status(400).json({ message: 'identifiers must be an array' });
  try {
    await pool.query("UPDATE users SET in_current_batch = false WHERE role = 'student'");
    const column = matchType === 'prn' ? 'prn' : 'email';
    const matches = await pool.query(
      `SELECT id, name, email FROM users WHERE role = 'student' AND ${column} = ANY($1)`,
      [identifiers]
    );
    if (matches.rowCount > 0) {
      const matchedIds = matches.rows.map(r => r.id);
      await pool.query("UPDATE users SET in_current_batch = true WHERE id = ANY($1)", [matchedIds]);
      for (const student of matches.rows) sendLtcBatchEmail(student.name, student.email);
    }
    res.json({ message: `Set ${matches.rowCount} students in current batch.`, matchedCount: matches.rowCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/admin/toggle-student-batch', authMiddleware(['admin']), async (req, res) => {
  const { user_id, in_batch } = req.body;
  try {
    const userQuery = await pool.query("SELECT id, name, email, role, in_current_batch FROM users WHERE id = $1", [user_id]);
    if (userQuery.rowCount === 0) return res.status(404).json({ message: 'User not found.' });
    const user = userQuery.rows[0];
    if (in_batch && user.role === 'student' && !user.in_current_batch) {
      await pool.query("UPDATE users SET in_current_batch = true WHERE id = $1", [user_id]);
      sendLtcBatchEmail(user.name, user.email);
    } else {
      await pool.query("UPDATE users SET in_current_batch = $1 WHERE id = $2", [in_batch, user_id]);
    }
    res.json({ message: 'Batch status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/admin/clear-current-batch', authMiddleware(['admin']), async (req, res) => {
  try {
    await pool.query("UPDATE users SET in_current_batch = false WHERE role = 'student'");
    res.json({ message: 'Current batch cleared.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Insurance student submission
app.post('/api/student/submit-insurance', authMiddleware(['student']), async (req, res) => {
  const { policy_number, provider } = req.body;
  try {
    const userRes = await pool.query("SELECT prn FROM users WHERE id = $1", [req.user.id]);
    if (userRes.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    let prn = userRes.rows[0].prn;
    if (!prn) {
      prn = 'PRN-STU-' + req.user.id;
      await pool.query("UPDATE users SET prn = $1 WHERE id = $2", [prn, req.user.id]);
    }
    await pool.query(
      "INSERT INTO insurance (prn, policy_number, provider) VALUES ($1, $2, $3) ON CONFLICT (prn) DO UPDATE SET policy_number = EXCLUDED.policy_number, provider = EXCLUDED.provider",
      [prn, policy_number || 'POLICY-' + req.user.id, provider || 'Student Submitted']
    );
    res.json({ message: 'Insurance submitted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Undertaking student submission
app.post('/api/student/submit-undertaking', authMiddleware(['student']), async (req, res) => {
  const { signedName, signedDate } = req.body;
  try {
    await pool.query(
      "UPDATE users SET undertaking_submitted = true, undertaking_signed_name = $1, undertaking_signed_date = $2 WHERE id = $3 AND role = 'student'",
      [signedName, signedDate, req.user.id]
    );
    res.json({ message: 'Undertaking submitted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Squad allocation (legacy)
app.get('/api/admin/squad-allocation-state', authMiddleware(['admin']), async (req, res) => {
  try {
    const lockCheck = await pool.query("SELECT value FROM system_settings WHERE key = 'squads_locked'");
    const isLocked = lockCheck.rowCount > 0 && lockCheck.rows[0].value === 'true';
    const studentsRes = await pool.query(
      "SELECT id, name, email, gender, prn, squad, role, in_current_batch, is_squad_leader, phone FROM users WHERE role = 'student' AND in_current_batch = true ORDER BY name ASC"
    );
    const facultyRes = await pool.query(
      "SELECT id, name, email, department, squad, role, in_current_batch FROM users WHERE role = 'faculty' AND in_current_batch = true ORDER BY name ASC"
    );
    const squadLeadersRes = await pool.query("SELECT * FROM squad_leaders");
    res.json({ locked: isLocked, students: studentsRes.rows, faculties: facultyRes.rows, squadLeaders: squadLeadersRes.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/admin/lock-squads', authMiddleware(['admin']), async (req, res) => {
  try {
    await pool.query("INSERT INTO system_settings (key, value) VALUES ('squads_locked', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'");
    res.json({ message: 'Squad allocation locked.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/admin/unlock-squads', authMiddleware(['admin']), async (req, res) => {
  try {
    await pool.query("INSERT INTO system_settings (key, value) VALUES ('squads_locked', 'false') ON CONFLICT (key) DO UPDATE SET value = 'false'");
    res.json({ message: 'Squad allocation unlocked.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/admin/shuffle-squads', authMiddleware(['admin']), async (req, res) => {
  try {
    const lockCheck = await pool.query("SELECT value FROM system_settings WHERE key = 'squads_locked'");
    if (lockCheck.rowCount > 0 && lockCheck.rows[0].value === 'true') {
      return res.status(400).json({ message: 'Squad allocation is locked.' });
    }
    const studentsRes = await pool.query("SELECT id, name, email, gender FROM users WHERE role = 'student' AND in_current_batch = true");
    const students = studentsRes.rows;
    const facultyRes = await pool.query("SELECT id FROM users WHERE role = 'faculty' AND in_current_batch = true");
    const faculties = facultyRes.rows;

    const shuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    };

    const girls = students.filter(s => {
      const g = s.gender ? s.gender.trim().toLowerCase() : '';
      return g === 'female' || g === 'f';
    });
    const boys = students.filter(s => {
      const g = s.gender ? s.gender.trim().toLowerCase() : '';
      return g === 'male' || g === 'm';
    });
    const others = students.filter(s => {
      const g = s.gender ? s.gender.trim().toLowerCase() : '';
      return g !== 'female' && g !== 'f' && g !== 'male' && g !== 'm';
    });
    shuffle(girls); shuffle(boys); shuffle(others);
    const allStudents = [...girls, ...boys, ...others];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("UPDATE users SET squad = NULL WHERE in_current_batch = false OR in_current_batch IS NULL");

      for (let idx = 0; idx < allStudents.length; idx++) {
        await client.query("UPDATE users SET squad = $1 WHERE id = $2", [SQUAD_NAMES[idx % SQUAD_NAMES.length], allStudents[idx].id]);
      }

      await client.query("UPDATE users SET squad = NULL WHERE role = 'faculty'");
      shuffle(faculties);
      for (let idx = 0; idx < faculties.length; idx++) {
        if (idx < 20) {
          await client.query("UPDATE users SET squad = $1 WHERE id = $2", [SQUAD_NAMES[Math.floor(idx / 2)], faculties[idx].id]);
        }
      }
      await client.query('COMMIT');
      res.json({ message: 'Squad allocation completed.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error during shuffling', error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
