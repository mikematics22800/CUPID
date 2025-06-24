// Debug script for registration issues
// Run this in your browser console or Node.js environment

const debugRegistration = async () => {
  console.log('🔍 Starting Registration Debug Script...');
  
  // Replace these with your actual Supabase credentials
  const SUPABASE_URL = 'YOUR_SUPABASE_URL';
  const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
  
  // Import Supabase (you'll need to adjust this based on your environment)
  // const { createClient } = require('@supabase/supabase-js');
  // const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // Test data
    const testUserData = {
      email: 'test@example.com',
      password: 'testpassword123',
      userData: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        birthday: new Date('1990-01-01'),
        sex: 'Male',
        sexuality: 'Heterosexual',
      }
    };
    
    console.log('📋 Test user data:', testUserData);
    
    // Step 1: Test authentication
    console.log('🔄 Step 1: Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: testUserData.email,
      password: testUserData.password,
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError);
      return;
    }
    
    console.log('✅ Authentication successful:', user);
    
    // Step 2: Test database connection
    console.log('🔄 Step 2: Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Step 3: Test RLS policies
    console.log('🔄 Step 3: Testing RLS policies...');
    const { data: rlsTest, error: rlsError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (rlsError) {
      console.error('❌ RLS test failed:', rlsError);
      if (rlsError.code === '42501') {
        console.log('🚫 RLS Policy Violation detected');
        console.log('💡 You need to set up RLS policies');
      }
      return;
    }
    
    console.log('✅ RLS policies working correctly');
    
    // Step 4: Test user insertion
    console.log('🔄 Step 4: Testing user insertion...');
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([testUserData.userData])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ User insertion failed:', insertError);
      
      if (insertError.code === '42501') {
        console.log('🚫 RLS Policy Violation - User not authenticated or missing policies');
        console.log('💡 Solution: Apply the RLS policies from the guide');
      } else if (insertError.code === '23505') {
        console.log('🔑 Unique Constraint Violation - User might already exist');
      } else if (insertError.code === '42703') {
        console.log('📝 Column does not exist - Check table schema');
      }
      return;
    }
    
    console.log('✅ User insertion successful:', insertData);
    
    // Step 5: Verify insertion
    console.log('🔄 Step 5: Verifying insertion...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUserData.userData.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return;
    }
    
    console.log('✅ Verification successful:', verifyData);
    console.log('🎉 All tests passed! Registration should work correctly.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
};

// Run the debug function
debugRegistration(); 