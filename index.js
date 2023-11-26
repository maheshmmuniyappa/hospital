const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(bodyParser.json());

const inMemoryCache = {
  doctors: [],
  patients: [],
};

// Middleware to check if the request has a valid token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });
    req.user = user;
    next();
  });
};

app.post('/doctors/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const newDoctor = { username, password: hashedPassword };
  inMemoryCache.doctors.push(newDoctor);

  res.json({ message: 'Doctor registered successfully' });
});

app.post('/doctors/login', async (req, res) => {
  const { username, password } = req.body;
  const doctor = inMemoryCache.doctors.find(doc => doc.username === username);

  if (!doctor || !await bcrypt.compare(password, doctor.password)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: doctor.username }, 'your-secret-key');
  res.json({ token });
});

app.post('/patients/register', authenticateToken, (req, res) => {
  const { phone } = req.body;
  const newPatient = { phone, reports: [] };
  inMemoryCache.patients.push(newPatient);

  res.json({ message: 'Patient registered successfully' });
});

app.post('/patients/:id/create_report', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { created_by, status } = req.body;

  const newReport = { created_by, status, date: new Date() };
  const patient = inMemoryCache.patients.find(p => p.phone === id);

  if (!patient) {
    return res.status(404).json({ message: 'Patient not found' });
  }

  patient.reports.push(newReport);
  res.json({ message: 'Report created successfully' });
});

app.get('/patients/:id/all_reports', authenticateToken, (req, res) => {
  const { id } = req.params;
  const patient = inMemoryCache.patients.find(p => p.phone === id);

  if (!patient) {
    return res.status(404).json({ message: 'Patient not found' });
  }

  res.json(patient.reports);
});

app.get('/reports/:status', authenticateToken, (req, res) => {
  const { status } = req.params;
  const allReports = inMemoryCache.patients.flatMap(p => p.reports);

  const filteredReports = allReports.filter(report => report.status === status);
  res.json(filteredReports);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
