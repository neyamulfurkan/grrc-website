const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken, isSuperAdmin } = require('../middleware/auth');

// Initialize Firebase Admin SDK (add to server.js if not already)
if (!admin.apps.length) {
  const serviceAccount = require('../config/firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Delete community user completely
router.delete('/users/:userId', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete from Firebase Auth
    await admin.auth().deleteUser(userId);
    
    // Delete from Firestore
    await admin.firestore().collection('users').doc(userId).delete();
    
    // Delete all user's chats
    const chatsSnapshot = await admin.firestore()
      .collectionGroup('messages')
      .where('senderId', '==', userId)
      .get();
    
    const batch = admin.firestore().batch();
    chatsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    console.log(`✅ User ${userId} completely deleted by admin ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'User deleted completely'
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// Ban user
router.post('/users/:userId/ban', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    // Update Firestore
    await admin.firestore().collection('users').doc(userId).update({
      banned: true,
      banReason: reason || 'No reason provided',
      bannedAt: new Date().toISOString(),
      bannedBy: req.user.id
    });
    
    // Disable auth
    await admin.auth().updateUser(userId, {
      disabled: true
    });
    
    console.log(`✅ User ${userId} banned by admin ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'User banned successfully'
    });
    
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ban user'
    });
  }
});

// Get all community users
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      users.push({ uid: doc.id, ...doc.data() });
    });
    
    res.json({
      success: true,
      data: users
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

module.exports = router;