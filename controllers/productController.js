const Product = require("../models/Product");
const Firm = require('../models/Firm')
const Vendor = require('../models/Vendor')
// UPDATED: multer/disk storage removed; image is a Cloudinary URL sent in the JSON body

const addProduct = async(req, res) => {
    try {
        // UPDATED: image comes from body (Cloudinary secure_url), not req.file
        const { productName, price, category, bestSeller, description, image } = req.body;

        // NEW: clear 400 for missing required fields instead of a generic 500
        if (!productName || !String(productName).trim() || price === undefined || !String(price).trim()) {
            return res.status(400).json({ error: "Product name and price are required" });
        }

        const firmId = req.params.firmId;
        const firm = await Firm.findById(firmId);

        if (!firm) {
            return res.status(404).json({ error: "No firm found" });
        }

        const product = new Product({
            productName,
            price,
            category,
            bestSeller,
            description,
            image,
            firm: firm._id
        })

        const savedProduct = await product.save();
        firm.products.push(savedProduct);


        await firm.save()

        res.status(200).json(savedProduct)

    } catch (error) {
        console.error(error);
        // NEW: schema validation problems are the user's input, not a server crash
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Internal server error" })
    }
}

const getProductByFirm = async(req, res) => {
    try {
        const firmId = req.params.firmId;
        const firm = await Firm.findById(firmId);

        if (!firm) {
            return res.status(404).json({ error: "No firm found" });
        }

        const restaurantName = firm.firmName;
        const products = await Product.find({ firm: firmId });

        res.status(200).json({ restaurantName, products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" })
    }
}

// Loads a product and confirms the logged-in vendor owns the firm it belongs to.
// Returns { product } or { status, error } so callers can respond directly.
const getOwnedProduct = async (productId, vendorId) => {
    if (!/^[a-f0-9]{24}$/i.test(String(productId || ''))) return { status: 404, error: "No product found" };
    const product = await Product.findById(productId);
    if (!product) return { status: 404, error: "No product found" };
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return { status: 404, error: "Vendor not found" };
    const owns = product.firm.some((f) => vendor.firm.some((vf) => vf.toString() === f.toString()));
    if (!owns) return { status: 403, error: "This product does not belong to your restaurant" };
    return { product };
};

// PATCH /product/:productId  (vendor auth) - edit details and/or toggle inStock
const updateProduct = async (req, res) => {
    try {
        const owned = await getOwnedProduct(req.params.productId, req.vendorId);
        if (owned.error) return res.status(owned.status).json({ error: owned.error });
        const product = owned.product;
        const { productName, price, category, bestSeller, description, image, inStock } = req.body || {};

        if (productName !== undefined) {
            if (!String(productName).trim()) return res.status(400).json({ error: "Product name cannot be empty" });
            product.productName = String(productName).trim();
        }
        if (price !== undefined) {
            if (!String(price).trim()) return res.status(400).json({ error: "Price cannot be empty" });
            product.price = String(price).trim();
        }
        if (category !== undefined) product.category = category;
        if (bestSeller !== undefined) product.bestSeller = !!bestSeller;
        if (description !== undefined) product.description = description;
        if (image !== undefined && image !== "") product.image = image; // empty = keep existing image
        if (inStock !== undefined) product.inStock = !!inStock;

        const saved = await product.save();
        res.status(200).json(saved);
    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Internal server error" });
    }
};

// DELETE /product/:productId  (vendor auth, owner only)
const deleteProductById = async(req, res) => {
    try {
        const owned = await getOwnedProduct(req.params.productId, req.vendorId);
        if (owned.error) return res.status(owned.status).json({ error: owned.error });

        await Product.findByIdAndDelete(owned.product._id);
        // keep the firm's products list in sync
        await Firm.updateMany({ products: owned.product._id }, { $pull: { products: owned.product._id } });
        res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" })
    }
}

module.exports = { addProduct, getProductByFirm, deleteProductById, updateProduct };