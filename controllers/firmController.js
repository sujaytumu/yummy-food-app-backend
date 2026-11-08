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

// the logged-in vendor must own this firm
const vendorOwnsFirm = async (vendorId, firmId) => {
    const vendor = await Vendor.findById(vendorId);
    return !!vendor && vendor.firm.some((f) => f.toString() === String(firmId));
};

// PATCH /firm/:firmId/open  { isOpen: true|false }   (owner only)
const setOpen = async (req, res) => {
    try {
        const { firmId } = req.params;
        if (!/^[a-f0-9]{24}$/i.test(firmId)) return res.status(400).json({ message: "Invalid restaurant" });
        if (typeof req.body.isOpen !== 'boolean') return res.status(400).json({ message: "isOpen must be true or false" });
        if (!(await vendorOwnsFirm(req.vendorId, firmId))) return res.status(403).json({ message: "This is not your restaurant" });
        const firm = await Firm.findByIdAndUpdate(firmId, { isOpen: req.body.isOpen }, { new: true });
        if (!firm) return res.status(404).json({ message: "Firm not found" });
        res.status(200).json({ isOpen: firm.isOpen });
    } catch (error) {
        console.error("❌ setOpen error:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /firm/:firmId/open  -> { isOpen }   (public; older restaurants without the field count as open)
const getOpen = async (req, res) => {
    try {
        if (!/^[a-f0-9]{24}$/i.test(req.params.firmId)) return res.status(400).json({ message: "Invalid restaurant" });
        const firm = await Firm.findById(req.params.firmId).select('isOpen');
        if (!firm) return res.status(404).json({ message: "Firm not found" });
        res.status(200).json({ isOpen: firm.isOpen !== false });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// DELETE FIRM CONTROLLER (now requires the owner's login; it used to be open to anyone)
const deleteFirmById = async (req, res) => {
    try {
        const firmId = req.params.firmId;
        if (!(await vendorOwnsFirm(req.vendorId, firmId))) {
            return res.status(403).json({ message: "This is not your restaurant" });
        }
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
    setOpen,
    getOpen,
    deleteFirmById
};
