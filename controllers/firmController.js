const Firm = require('../models/Firm');
const Vendor = require('../models/Vendor');
// UPDATED: multer/disk storage removed. Frontend now uploads the image to Cloudinary
// and sends the secure_url in the JSON body (Render's disk is ephemeral, so local files vanish).

// ADD FIRM CONTROLLER
const addFirm = async (req, res) => {
    try {
        // UPDATED: image is the Cloudinary URL sent by the frontend (was req.file.filename -> always undefined for JSON body)
        const { firmName, area, category, region, offer, image } = req.body;

        // NEW: clear 400 for missing required fields
        if (!firmName || !String(firmName).trim() || !area || !String(area).trim()) {
            return res.status(400).json({ message: "Firm name and area are required" });
        }

        const vendor = await Vendor.findById(req.vendorId);
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        if (vendor.firm.length > 0) {
            return res.status(400).json({ message: "Vendor can have only one firm" });
        }

        const firm = new Firm({
            firmName,
            area,
            category,
            region,
            offer,
            image,
            vendor: vendor._id
        });

        const savedFirm = await firm.save();

        vendor.firm.push(savedFirm._id);
        await vendor.save();

        return res.status(200).json({
            message: "Firm added successfully",
            firmId: savedFirm._id,
            vendorFirmName: savedFirm.firmName
        });

    } catch (error) {
        console.error("❌ Add Firm Error:", error);
        // NEW: duplicate firmName (unique index) and schema errors are user input problems
        if (error.code === 11000) {
            return res.status(400).json({ message: "A firm with this name already exists" });
        }
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// DELETE FIRM CONTROLLER
const deleteFirmById = async (req, res) => {
    try {
        const firmId = req.params.firmId;
        const deletedFirm = await Firm.findByIdAndDelete(firmId);

        if (!deletedFirm) {
            return res.status(404).json({ message: "Firm not found" });
        }

        return res.status(200).json({ message: "Firm deleted successfully" });

    } catch (error) {
        console.error("❌ Delete Firm Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = {
    addFirm,
    deleteFirmById
};
