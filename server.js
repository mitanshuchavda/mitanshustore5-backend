const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/classifieds', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Listing Schema
const listingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    seller: { type: String, required: true },
    verified: { type: Boolean, default: false },
    images: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

const Listing = mongoose.model('Listing', listingSchema);

// Multer Configuration for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Images only (JPEG/PNG)!'));
        }
    }
});

// Routes
app.post('/api/listings', upload.array('images', 5), async (req, res) => {
    try {
        const { title, category, price, description, seller, verified } = req.body;
        const images = req.files.map(file => `/uploads/${file.filename}`);

        const listing = new Listing({
            title,
            category,
            price: parseFloat(price),
            description,
            seller,
            verified: verified === 'true',
            images
        });

        await listing.save();
        res.status(201).json({
            id: listing._id,
            title,
            category,
            price: parseFloat(price),
            description,
            seller,
            verified,
            image: images[0] || 'https://via.placeholder.com/400',
            images
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Fetch all listings
app.get('/api/listings', async (req, res) => {
    try {
        const listings = await Listing.find();
        res.status(200).json(listings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));