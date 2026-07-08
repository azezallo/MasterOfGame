import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp:

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});