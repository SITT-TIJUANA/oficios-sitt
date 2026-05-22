const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDB } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'oficios-sitt-2026-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 10 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', require('./routes/api'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

initDB().then(() => {
  app.listen(PORT, () => console.log(`Oficios SITT corriendo en puerto ${PORT}`));
}).catch(err => { console.error('Error DB:', err); process.exit(1); });
