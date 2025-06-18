import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import configRoutes from './routes/config';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json()); // Enable JSON body parsing for POST

app.use('/api/config', configRoutes);

app.get('/', (req, res) => {
  res.send('NIST-800 Compliance Dashboard Backend');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
