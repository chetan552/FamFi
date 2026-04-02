class Env {
  static const supabaseUrl = 'https://axcdvkshsujorlgpnzcy.supabase.co';
  static const supabaseAnonKey = 'sb_publishable_UifpOyBAPGUj4Dq01KYFOQ_P26Q880B';

  // Google OAuth client IDs — replace with real values from Google Cloud Console
  // Web client ID: used for web OAuth redirect and as the serverClientId on native
  static const googleWebClientId = 'http://1013124299679-sdglqsev6noga6q80ilp01i8vphjfc73.apps.googleusercontent.com';
  // iOS client ID: used for native Google Sign-In on iOS
  static const googleIosClientId = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';

  // OpenAI API key — TODO: move to a secure backend proxy before production
  static const openAiKey =
      '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';
}
