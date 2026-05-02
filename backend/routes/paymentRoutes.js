import express from 'express'
import { confirmPayment, createCheckoutSession } from '../controllers/paymentController.js';
// import authMiddleware from '../middlewares/auth.js';

const paymentRouter = express.Router();

paymentRouter.post('/create-checkout-session', createCheckoutSession);
paymentRouter.get('/confirm',  confirmPayment);

export default paymentRouter;