const Contact = require('../models/Contact');

// @desc    Get all contacts
// @route   GET /api/contact
// @access  Public
// @desc    Get all contacts
// @route   GET /api/contact
// @access  Private
const getContacts = async (req, res, next) => {
    try {
        const contacts = await Contact.find({ owner: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: contacts.length,
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

module.exports = {
    getContacts,
    createContact,
    deleteContact
};
