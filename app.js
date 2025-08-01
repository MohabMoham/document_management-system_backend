const express = require('express');
const cookieParser = require('cookie-parser');
const csrf = require('csurf'); 
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const app = express();


app.use(cors({
  origin: 'http://localhost:5173', // your frontend
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  credentials: true 
}));

app.use(express.json());
app.use(cookieParser()); 


const csrfProtection = csrf({ cookie: true });


const userRoutes = require('./routes/userRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const documentRoutes = require('./routes/document.routes');


const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
const connectDB = async () => {
  try {
    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  }
};
connectDB();


app.use('/api', userRoutes);
app.use('/api', workspaceRoutes);
app.use('/api', documentRoutes);

// ✅ CSRF token route
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.cookie('XSRF-TOKEN', req.csrfToken()); // Set token in a readable cookie for frontend
  res.json({ csrfToken: req.csrfToken() });
});


app.use(csrfProtection);


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
