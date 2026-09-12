const express = require("express");
const dotEnv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');

const vendorRoutes = require('./routes/vendorRoutes');
const firmRoutes = require('./routes/firmRoutes');
const productRoutes = require('./routes/productRoutes');

dotEnv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://yummy-food-app-frontend.vercel.app',
    'https://yummy-food-app-customer-frontend.vercel.app'
  ],
  credentials: true
}));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((error) => console.log(error));

app.use('/vendor', vendorRoutes);
app.use('/firm', firmRoutes);
app.use('/product', productRoutes);

app.listen(PORT, () => {
  console.log(`Server started and running at ${PORT}`);
});
