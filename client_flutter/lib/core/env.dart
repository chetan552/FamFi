class Env {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://axcdvkshsujorlgpnzcy.supabase.co',
  );
  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'sb_publishable_UifpOyBAPGUj4Dq01KYFOQ_P26Q880B',
  );

  static const googleWebClientId = String.fromEnvironment(
    'GOOGLE_WEB_CLIENT_ID',
    defaultValue: '1013124299679-sdglqsev6noga6q80ilp01i8vphjfc73.apps.googleusercontent.com',
  );
  static const googleIosClientId = String.fromEnvironment(
    'GOOGLE_IOS_CLIENT_ID',
    defaultValue: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  );
  static const googleClientSecret = String.fromEnvironment('GOOGLE_CLIENT_SECRET');

  // Use a backend proxy for production OpenAI calls. This define is only for local/dev builds.
  static const openAiKey = String.fromEnvironment('OPENAI_API_KEY');
}
