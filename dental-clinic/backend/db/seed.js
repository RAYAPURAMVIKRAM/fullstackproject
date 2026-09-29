const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = require('../config/supabase');

async function seedDatabase() {
  console.log('🌱 Starting database seeding script...');

  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@dentalclinic.com';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_DEFAULT_NAME || 'Dr. Sarah Mitchell (Head Admin)';

  try {
    // 1. Verify/Insert Default Admin User
    console.log(`🔍 Checking if admin '${adminEmail}' exists...`);
    const { data: existingAdmin, error: queryError } = await supabase
      .from('admins')
      .select('id, email')
      .eq('email', adminEmail)
      .maybeSingle();

    if (queryError) {
      console.error('❌ Error checking admins table:', queryError.message);
      console.log('👉 Please ensure you have executed backend/db/schema.sql in your Supabase SQL Editor.');
      process.exit(1);
    }

    if (existingAdmin) {
      console.log(`✅ Admin account '${adminEmail}' already exists in database.`);
    } else {
      console.log(`🔐 Creating default admin account for '${adminEmail}'...`);
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

      const { data: newAdmin, error: insertError } = await supabase
        .from('admins')
        .insert([
          {
            email: adminEmail,
            password_hash: passwordHash,
            name: adminName,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Failed to insert admin:', insertError.message);
        process.exit(1);
      }

      console.log(`🎉 Admin user created successfully! ID: ${newAdmin.id}`);
      console.log(`📧 Email:    ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
    }

    console.log('\n✨ Database seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Unexpected error during seeding:', err);
    process.exit(1);
  }
}

seedDatabase();
