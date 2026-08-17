import app from './app';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

export default app;
