const Contact = require('../models/Contact');

// @desc    Get all contacts
// @route   GET /api/contact
// @access  Public
// @desc    Get all contacts
// @route   GET /api/contact
// @access  Private
const getContacts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        const query = { owner: req.user.id };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const contacts = await Contact.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Contact.countDocuments(query);

        res.status(200).json({
            success: true,
            count: contacts.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            data: contacts
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Create new contact
// @route   POST /api/contact
// @access  Private
const createContact = async (req, res, next) => {
    try {
        // Add user to req.body
        req.body.owner = req.user.id;

        const contact = await Contact.create(req.body);
        res.status(201).json({
            success: true,
            data: contact
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete contact
// @route   DELETE /api/contact/:id
// @access  Private
const deleteContact = async (req, res, next) => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found'
            });
        }

        // Make sure user is contact owner
        if (contact.owner.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to delete this contact'
            });
        }

        await contact.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update contact
// @route   PUT /api/contact/:id
// @access  Private
const updateContact = async (req, res, next) => {
    try {
        let contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found'
            });
        }

        // Make sure user is contact owner
        if (contact.owner.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to update this contact'
            });
        }

        contact = await Contact.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: contact
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single contact
// @route   GET /api/contact/:id
// @access  Private
const getContact = async (req, res, next) => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found'
            });
        }

        // Make sure user is contact owner
        if (contact.owner.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this contact'
            });
        }

        res.status(200).json({
            success: true,
            data: contact
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getContacts,
    createContact,
    updateContact,
    deleteContact,
    getContact
};
