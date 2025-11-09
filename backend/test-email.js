require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
  console.log('\n🧪 Testing Email Service...\n');
  
  // Test 1: Send application confirmation
  console.log('Test 1: Sending application confirmation email...');
  const result1 = await emailService.sendMembershipApplicationEmail(
    'neyamulfurkan22@gmail.com',
    'Test User',
    12345
  );
  console.log('Result 1:', result1);
  
  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Send admin notification
  console.log('\nTest 2: Sending admin notification...');
  const result2 = await emailService.sendAdminMembershipNotification(
    'neyamulfurkan22@gmail.com',
    {
      full_name: 'Test User',
      email: 'test@example.com',
      phone: '01712345678',
      student_id: 'TEST123',
      department: 'CSE',
      year: '3rd Year',
      bio: 'This is a test bio',
      skills: 'JavaScript, Python',
      github_profile: 'https://github.com/test',
      linkedin_profile: 'https://linkedin.com/in/test',
      applicationId: 12345,
      applied_date: new Date()
    }
  );
  console.log('Result 2:', result2);
  
  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Send approval email
  console.log('\nTest 3: Sending approval email...');
  const result3 = await emailService.sendMembershipApprovalEmail(
    'neyamulfurkan22@gmail.com',
    'Test User'
  );
  console.log('Result 3:', result3);
  
  console.log('\n✅ All tests completed!\n');
  process.exit(0);
}

testEmail().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});