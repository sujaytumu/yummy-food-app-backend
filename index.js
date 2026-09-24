const express = require("express");
const dotEnv = require('dotenv');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const vendorRoutes = require('./routes/vendorRoutes');
const firmRoutes = require('./routes/firmRoutes');
const productRoutes = require('./routes/productRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); // NEW: Razorpay


const app = express()
const PORT = process.env.PORT || 4000;

dotEnv.config();

// ✅ 1. Enable JSON body parsing
app.use(express.json());

// UPDATED: removed the debug middleware that logged every request body (it exposed passwords, tokens and customer addresses in Render logs)

//3.Middlewares
app.use(cors({
  origin: [
    'http://localhost:5173', // vendor localhost
    'http://localhost:5174',// customer localhost
    'https://yummy-food-app-frontend.vercel.app',         // vendor deployed
    'https://yummy-food-app-customer-frontend.vercel.app' // customer deployed
  ],
  credentials: true
}));


//mongo DB connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully!"))
    .catch((error) => console.log(error))

// API Routes
app.use('/vendor', vendorRoutes);
app.use('/firm', firmRoutes)
app.use('/product', productRoutes);
app.use('/payment', paymentRoutes); // NEW: Razorpay
app.use('/uploads', express.static('uploads'));


// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server started and running at ${PORT}`);
});
