const express = require('express');
const router = express.Router();

const { getContacts, createContact, deleteContact } = require('../controllers/contact.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getContacts);
router.post('/', protect, createContact);
router.delete('/:id', protect, deleteContact);

module.exports = router;
