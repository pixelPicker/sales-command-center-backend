const express = require('express');
const router = express.Router();

const { getContacts, createContact, deleteContact, getContact } = require('../controllers/contact.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getContacts);
router.post('/', protect, createContact);

router.route('/:id')
    .get(protect, getContact)
    .delete(protect, deleteContact);

module.exports = router;
