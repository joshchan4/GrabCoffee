import { supabase } from './supabase';
import { Linking } from 'react-native';

export const debugAuth = async () => {
  console.log('🔍 Starting authentication debug...');
  
  try {
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('📋 Current session:', session ? 'Active' : 'None');
    if (session) {
      console.log('👤 User ID:', session.user.id);
      console.log('📧 User email:', session.user.email);
      console.log('🔑 Provider:', session.user.app_metadata?.provider);
    }
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
    }

    // Check Supabase configuration
    console.log('🌐 Supabase URL:', supabase.supabaseUrl);
    console.log('🔑 Supabase anon key exists:', !!supabase.supabaseKey);

    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection error:', testError);
    } else {
      console.log('✅ Database connection successful');
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

export const testOAuthProvider = async (provider) => {
  console.log(`🔍 Testing ${provider} OAuth...`);
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `grabcoffee://${provider}-test-callback`,
      }
    });

    if (error) {
      console.error(`❌ ${provider} OAuth error:`, error);
      return { success: false, error };
    }

    if (data?.url) {
      console.log(`✅ ${provider} OAuth URL generated:`, data.url);
      return { success: true, url: data.url };
    } else {
      console.error(`❌ ${provider} OAuth: No URL returned`);
      return { success: false, error: 'No URL returned' };
    }

  } catch (error) {
    console.error(`❌ ${provider} OAuth exception:`, error);
    return { success: false, error };
  }
};

export const testUrlScheme = async () => {
  console.log('🔍 Testing URL scheme...');
  
  try {
    // Test if the app can handle its own URL scheme
    const canOpen = await Linking.canOpenURL('grabcoffee://test');
    console.log('📱 Can open grabcoffee:// URLs:', canOpen);
    
    // Test if we can get the initial URL
    const initialURL = await Linking.getInitialURL();
    console.log('🔗 Initial URL:', initialURL);
    
    return { success: true, canOpen, initialURL };
  } catch (error) {
    console.error('❌ URL scheme test error:', error);
    return { success: false, error };
  }
};

export const testCompleteOAuthFlow = async (provider) => {
  console.log(`🔍 Testing complete ${provider} OAuth flow...`);
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'grabcoffee://',
      }
    });

    if (error) {
      console.error(`❌ ${provider} OAuth error:`, error);
      return { success: false, error };
    }

    if (data?.url) {
      console.log(`✅ ${provider} OAuth URL generated:`, data.url);
      console.log(`📱 Expected redirect: grabcoffee://`);
      
      // Test if we can open the URL
      const canOpen = await Linking.canOpenURL('grabcoffee://');
      console.log(`📱 Can open grabcoffee:// URLs:`, canOpen);
      
      return { 
        success: true, 
        url: data.url, 
        canOpen,
        nextStep: 'Open this URL in browser to test OAuth flow'
      };
    } else {
      console.error(`❌ ${provider} OAuth: No URL returned`);
      return { success: false, error: 'No URL returned' };
    }

  } catch (error) {
    console.error(`❌ ${provider} OAuth exception:`, error);
    return { success: false, error };
  }
}; 