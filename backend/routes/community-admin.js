const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken, isSuperAdmin } = require('../middleware/auth');

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  try {
    // Try environment variables first (for Render deployment)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      });
      console.log('✅ Firebase Admin initialized with environment variables');
    } else if (require('fs').existsSync('../config/firebase-service-account.json')) {
      // Fallback to service account file (for local development)
      const serviceAccount = require('../config/firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized with service account file');
    } else {
      console.warn('⚠️  Firebase Admin not initialized - missing credentials');
      console.warn('   Community admin features will be unavailable');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    console.error('   Community admin features will be unavailable');
  }
}

// Middleware to check if Firebase is initialized
function checkFirebaseInit(req, res, next) {
  if (!admin.apps.length) {
    return res.status(503).json({
      success: false,
      error: 'Firebase not configured',
      message: 'Community admin features require Firebase configuration'
    });
  }
  next();
}

// Get all community users
router.get('/users', authenticateToken, isSuperAdmin, checkFirebaseInit, async (req, res) => {
  try {
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      users.push({ 
        uid: doc.id, 
        ...userData,
        // Add status for display
        status: userData.banned ? 'Banned' : 'Active',
        lastSeenFormatted: userData.lastSeen ? new Date(userData.lastSeen).toLocaleString() : 'Never'
      });
    });
    
    // Sort by most recent first
    users.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
    
    console.log(`✅ Fetched ${users.length} community users`);
    
    res.json({
      success: true,
      data: users,
      total: users.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching community users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

// Delete community user COMPLETELY (Auth + Firestore + Chats)
router.delete('/users/:userId', authenticateToken, isSuperAdmin, checkFirebaseInit, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🗑️ Deleting user ${userId} completely...`);
    
    // Step 1: Delete from Firebase Authentication
    try {
      await admin.auth().deleteUser(userId);
      console.log(`✅ Deleted user from Firebase Auth: ${userId}`);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.log(`⚠️ User not found in Auth (may already be deleted): ${userId}`);
      } else {
        throw authError;
      }
    }
    
    // Step 2: Delete from Firestore
    try {
      await admin.firestore().collection('users').doc(userId).delete();
      console.log(`✅ Deleted user document from Firestore: ${userId}`);
    } catch (firestoreError) {
      console.error(`❌ Error deleting Firestore document:`, firestoreError);
    }
    
    // Step 3: Delete all user's messages in private chats
    try {
      const chatsSnapshot = await admin.firestore()
        .collectionGroup('messages')
        .where('senderId', '==', userId)
        .get();
      
      const batch = admin.firestore().batch();
      chatsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (chatsSnapshot.docs.length > 0) {
        await batch.commit();
        console.log(`✅ Deleted ${chatsSnapshot.docs.length} messages from user ${userId}`);
      }
    } catch (messagesError) {
      console.error(`❌ Error deleting messages:`, messagesError);
    }
    
    // Step 4: Delete all user's messages in global chat
    try {
      const globalMessagesSnapshot = await admin.firestore()
        .collection('global_chat')
        .where('senderId', '==', userId)
        .get();
      
      const globalBatch = admin.firestore().batch();
      globalMessagesSnapshot.docs.forEach(doc => {
        globalBatch.delete(doc.ref);
      });
      
      if (globalMessagesSnapshot.docs.length > 0) {
        await globalBatch.commit();
        console.log(`✅ Deleted ${globalMessagesSnapshot.docs.length} global messages from user ${userId}`);
      }
    } catch (globalError) {
      console.error(`❌ Error deleting global messages:`, globalError);
    }
    
    console.log(`✅ User ${userId} completely deleted by admin ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'User deleted completely (Auth + Firestore + Messages)'
    });
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

// Ban user (disable account without deleting)
router.post('/users/:userId/ban', authenticateToken, isSuperAdmin, checkFirebaseInit, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    console.log(`🚫 Banning user ${userId}...`);
    
    // Update Firestore
    await admin.firestore().collection('users').doc(userId).update({
      banned: true,
      banReason: reason || 'No reason provided',
      bannedAt: new Date().toISOString(),
      bannedBy: req.user.id
    });
    
    // Disable Firebase Auth
    await admin.auth().updateUser(userId, {
      disabled: true
    });
    
    console.log(`✅ User ${userId} banned by admin ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'User banned successfully'
    });
    
  } catch (error) {
    console.error('❌ Error banning user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ban user',
      message: error.message
    });
  }
});

// Unban user
router.post('/users/:userId/unban', authenticateToken, isSuperAdmin, checkFirebaseInit, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`✅ Unbanning user ${userId}...`);
    
    // Update Firestore
    await admin.firestore().collection('users').doc(userId).update({
      banned: false,
      banReason: null,
      bannedAt: null,
      bannedBy: null
    });
    
    // Enable Firebase Auth
    await admin.auth().updateUser(userId, {
      disabled: false
    });
    
    console.log(`✅ User ${userId} unbanned by admin ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'User unbanned successfully'
    });
    
  } catch (error) {
    console.error('❌ Error unbanning user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unban user',
      message: error.message
    });
  }
});

module.exports = router;