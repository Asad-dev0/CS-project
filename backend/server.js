import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path';
import helmet from 'helmet';
import multer from 'multer';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import userRouter from './routes/userRoutes.js';
import carRouter from './routes/carRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';

const app = express();
const PORT = 5000;
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dataBase connection
connectDB()
// MIDDLEWARES
app.use(cors())
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
)
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(
    '/uploads', (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', "*");
        next();
    },
    express.static(path.join(process.cwd(), 'uploads'))
)

// ROUTES
app.use('/api/auth', userRouter )
app.use('/api/cars', carRouter )
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', paymentRouter);
app.get('/api/ping', (req, res) => res.json({
    ok: true,
    time: Date.now()
}))

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum upload size is 10MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error.'
        });
    }

    if (err) {
        return res.status(500).json({
            success: false,
            message: err.message || 'Server error.'
        });
    }

    next();
});

// LISTEN
app.get('/', (req, res) => {
    res.send('API WORKING')
});

app.listen(PORT, () => {
    console.log(`Server Started on http://localhost:${PORT}`)
})