const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Password:', password);
  console.log('Generated hash:', hash);
  console.log('\nRun this SQL command in Neon:');
  console.log(`UPDATE admins SET password_hash = '${hash}' WHERE username = 'furkan';`);
}

generateHash();