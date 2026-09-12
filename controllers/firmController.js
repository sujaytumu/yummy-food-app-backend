const Firm = require('../models/Firm');
const Vendor = require('../models/Vendor');
const upload = require('../middlewares/upload');

// ADD FIRM CONTROLLER
const addFirm = async (req, res) => {
    try {
        const { firmName, area, category, region, offer } = req.body;
        const image = req.file ? req.file.path : undefined;

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
            vendorFirmName: savedFirm.firmName,
            image: savedFirm.image
        });

    } catch (error) {
        console.error("Add Firm Error:", error);
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
        console.error("Delete Firm Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = {
    addFirm: [upload.single('image'), addFirm],
    deleteFirmById
};
