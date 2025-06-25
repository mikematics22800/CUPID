// Setup script for Supabase storage configuration
// Run this with: node setup-storage.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  console.error('\n💡 Make sure to add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  console.log('🚀 Setting up Supabase storage...\n');

  try {
    // 1. Create the users bucket
    console.log('📦 Creating users storage bucket...');
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('users', {
      public: false,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Users bucket already exists');
      } else {
        console.error('❌ Error creating bucket:', bucketError);
        throw bucketError;
      }
    } else {
      console.log('✅ Users bucket created successfully');
    }

    // 2. Enable RLS on storage.objects
    console.log('\n🔒 Enabling Row Level Security...');
    const { error: rlsError } = await supabase.rpc('enable_rls_on_storage_objects');
    
    if (rlsError) {
      console.log('ℹ️  RLS may already be enabled or needs manual setup');
    } else {
      console.log('✅ RLS enabled successfully');
    }

    // 3. Create RLS policies
    console.log('\n📋 Creating RLS policies...');
    
    const policies = [
      {
        name: 'Users can upload files to their own folder',
        sql: `
          CREATE POLICY "Users can upload files to their own folder" ON storage.objects
          FOR INSERT WITH CHECK (
            bucket_id = 'users' AND 
            auth.uid()::text = (string_to_array(name, '/'))[2]
          );
        `
      },
      {
        name: 'Users can view their own files',
        sql: `
          CREATE POLICY "Users can view their own files" ON storage.objects
          FOR SELECT USING (
            bucket_id = 'users' AND 
            auth.uid()::text = (string_to_array(name, '/'))[2]
          );
        `
      },
      {
        name: 'Users can update their own files',
        sql: `
          CREATE POLICY "Users can update their own files" ON storage.objects
          FOR UPDATE USING (
            bucket_id = 'users' AND 
            auth.uid()::text = (string_to_array(name, '/'))[2]
          );
        `
      },
      {
        name: 'Users can delete their own files',
        sql: `
          CREATE POLICY "Users can delete their own files" ON storage.objects
          FOR DELETE USING (
            bucket_id = 'users' AND 
            auth.uid()::text = (string_to_array(name, '/'))[2]
          );
        `
      }
    ];

    for (const policy of policies) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
        if (error) {
          if (error.message.includes('already exists')) {
            console.log(`✅ Policy "${policy.name}" already exists`);
          } else {
            console.error(`❌ Error creating policy "${policy.name}":`, error.message);
          }
        } else {
          console.log(`✅ Policy "${policy.name}" created successfully`);
        }
      } catch (err) {
        console.log(`ℹ️  Policy "${policy.name}" may need manual setup in Supabase dashboard`);
      }
    }

    console.log('\n🎉 Storage setup completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Storage > Policies');
    console.log('3. Verify the policies are in place');
    console.log('4. Test photo upload in your app');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('\n💡 Manual setup required:');
    console.log('1. Go to Supabase dashboard > Storage');
    console.log('2. Create a bucket named "users" (private)');
    console.log('3. Go to SQL Editor and run the RLS policies manually');
  }
}

setupStorage(); 