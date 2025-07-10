const express = require('express');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());
const userRoutes = require('./routes/userRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');


const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
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


app.use("/api",userRoutes);
app.use('/api', workspaceRoutes);

app.use(cors({
  origin: 'http://localhost:5000', 
   methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
}));
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});