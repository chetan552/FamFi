import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

class LandingScreen extends ConsumerWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildAppBar(context, theme),
            _buildHero(context, theme, isMobile),
            _buildFeatures(context, theme, isMobile),
            _buildResponsibilitySection(context, theme, isMobile),
            _buildPricing(context, theme, isMobile),
            _buildFooter(theme),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Row(
        children: [
          const Text('💰', style: TextStyle(fontSize: 32)),
          const SizedBox(width: 8),
          Text(
            'FamFi',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w900,
              color: theme.colorScheme.primary,
            ),
          ),
          const Spacer(),
          TextButton(
            onPressed: () => context.push('/login'),
            child: const Text('Login', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 16),
          ElevatedButton(
            onPressed: () => context.push('/signup'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text('Get Started'),
          ),
        ],
      ),
    );
  }

  Widget _buildHero(BuildContext context, ThemeData theme, bool isMobile) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : 64,
        vertical: isMobile ? 48 : 80,
      ),
      child: Flex(
        direction: isMobile ? Axis.vertical : Axis.horizontal,
        children: [
          Expanded(
            flex: isMobile ? 0 : 1,
            child: Column(
              crossAxisAlignment: isMobile ? CrossAxisAlignment.center : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'NEW: AI Money Mentor is here! 🚀',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Empower Your Kids with\nFinancial Literacy',
                  textAlign: isMobile ? TextAlign.center : TextAlign.start,
                  style: GoogleFonts.outfit(
                    fontSize: isMobile ? 40 : 64,
                    fontWeight: FontWeight.w900,
                    height: 1.1,
                    color: const Color(0xFF1A2E35),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'The smart family banking app that teaches kids how to earn, save, and grow their money through chores, automated buckets, and a dedicated AI mentor.',
                  textAlign: isMobile ? TextAlign.center : TextAlign.start,
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: Colors.blueGrey.shade600,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 40),
                Row(
                  mainAxisAlignment: isMobile ? MainAxisAlignment.center : MainAxisAlignment.start,
                  children: [
                    ElevatedButton(
                      onPressed: () => context.push('/signup'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
                        textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      child: const Text('Start Your Family Journey'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: isMobile ? MainAxisAlignment.center : MainAxisAlignment.start,
                  children: [
                    _buildAvatarStack(),
                    const SizedBox(width: 12),
                    Text(
                      'Joined by 10,000+ families this month',
                      style: TextStyle(color: Colors.blueGrey.shade400, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (!isMobile) const SizedBox(width: 64),
          Expanded(
            flex: isMobile ? 0 : 1,
            child: Padding(
              padding: EdgeInsets.only(top: isMobile ? 48 : 0),
              child: Image.asset(
                'assets/images/famfi_hero.png',
                fit: BoxFit.contain,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatarStack() {
    return SizedBox(
      width: 100,
      height: 32,
      child: Stack(
        children: [
          for (var i = 0; i < 4; i++)
            Positioned(
              left: i * 20.0,
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: CircleAvatar(
                  radius: 14,
                  backgroundColor: Colors.blueGrey.shade100,
                  child: Text(['🧑', '👧', '👶', '👨'][i], style: const TextStyle(fontSize: 14)),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFeatures(BuildContext context, ThemeData theme, bool isMobile) {
    return Container(
      width: double.infinity,
      color: const Color(0xFFF0F4F6),
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : 64,
        vertical: 80,
      ),
      child: Column(
        children: [
          Text(
            'Everything You Need to Raise\nMoney-Smart Kids',
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: isMobile ? 32 : 48,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1A2E35),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Built-in features designed to make financial education fun and interactive.',
            textAlign: TextAlign.center,
            style: theme.textTheme.titleMedium?.copyWith(color: Colors.blueGrey.shade600),
          ),
          const SizedBox(height: 64),
          Wrap(
            spacing: 24,
            runSpacing: 24,
            alignment: WrapAlignment.center,
            children: [
              _buildFeatureCard(
                theme,
                '🧹',
                'Smart Chores',
                'Assign, track, and reward chores with ease. Integrate with Google Tasks for a seamless workflow.',
              ),
              _buildFeatureCard(
                theme,
                '🪣',
                'Automated Buckets',
                'Set up rules to automatically split earnings into giving, saving, and spending buckets.',
              ),
              _buildFeatureCard(
                theme,
                '📈',
                'Interest & Growth',
                'Set personalized interest rates to teach your kids of how their money can work for them.',
              ),
              _buildFeatureCard(
                theme,
                '🤖',
                'AI Money Mentor',
                'A dedicated AI coach that answers your kids\' questions and gives personalized savings tips.',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureCard(ThemeData theme, String emoji, String title, String description) {
    return Container(
      width: 280,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(emoji, style: const TextStyle(fontSize: 24)),
          ),
          const SizedBox(height: 24),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 12),
          Text(
            description,
            style: TextStyle(color: Colors.blueGrey.shade400, height: 1.5, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildResponsibilitySection(BuildContext context, ThemeData theme, bool isMobile) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : 64,
        vertical: 100,
      ),
      child: Flex(
        direction: isMobile ? Axis.vertical : Axis.horizontal,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            flex: isMobile ? 0 : 1,
            child: Column(
              crossAxisAlignment: isMobile ? CrossAxisAlignment.center : CrossAxisAlignment.start,
              children: [
                Text(
                  'Building Foundations for\na Lifetime of Success',
                  textAlign: isMobile ? TextAlign.center : TextAlign.start,
                  style: GoogleFonts.outfit(
                    fontSize: isMobile ? 32 : 48,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF1A2E35),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'FamFi isn\'t just about tracking chores—it\'s about teaching the values that lead to lifelong financial health.',
                  textAlign: isMobile ? TextAlign.center : TextAlign.start,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: Colors.blueGrey.shade600,
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 48),
                _buildResponsibilityCheck(
                  theme,
                  Icons.hourglass_bottom_rounded,
                  'Delayed Gratification',
                  'Teach kids the value of waiting for big rewards through targeted saving goals.',
                ),
                _buildResponsibilityCheck(
                  theme,
                  Icons.account_balance_rounded,
                  'Real-World Decisions',
                  'Let them manage their own digital balance to gain confidence for the future.',
                ),
                _buildResponsibilityCheck(
                  theme,
                  Icons.favorite_rounded,
                  'Value-Based Giving',
                  'Encourage community impact by allocating a portion of every dollar to "Giving".',
                ),
              ],
            ),
          ),
          if (!isMobile) const SizedBox(width: 80),
          Expanded(
            flex: isMobile ? 0 : 1,
            child: Container(
              margin: EdgeInsets.only(top: isMobile ? 64 : 0),
              padding: const EdgeInsets.all(40),
              decoration: BoxDecoration(
                color: theme.colorScheme.secondary.withOpacity(0.05),
                borderRadius: BorderRadius.circular(40),
              ),
              child: Column(
                children: [
                  const Text('⭐', style: TextStyle(fontSize: 48)),
                  const SizedBox(height: 24),
                  Text(
                    'The Responsibility Pledge',
                    style: GoogleFonts.outfit(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.secondary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '"I will work hard, save systematically, and give generously."',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontStyle: FontStyle.italic,
                      fontSize: 18,
                      color: Colors.blueGrey.shade700,
                    ),
                  ),
                  const SizedBox(height: 40),
                  ElevatedButton(
                    onPressed: () => context.push('/signup'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.secondary,
                      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
                    ),
                    child: const Text('Start Teaching Today'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResponsibilityCheck(ThemeData theme, IconData icon, String title, String description) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 32),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: theme.colorScheme.secondary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: theme.colorScheme.secondary, size: 24),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(color: Colors.blueGrey.shade500, fontSize: 14),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPricing(BuildContext context, ThemeData theme, bool isMobile) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : 64,
        vertical: 80,
      ),
      child: Column(
        children: [
          Text(
            'Simple, Transparent Pricing',
            style: GoogleFonts.outfit(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1A2E35),
            ),
          ),
          const SizedBox(height: 48),
          Wrap(
            spacing: 32,
            runSpacing: 32,
            children: [
              _buildPricingCard(
                theme,
                'Family Basic',
                'Free',
                'Perfect for getting started.',
                [
                  '1 Child Profile',
                  'Basic Chore Tracking',
                  'Standard Savings Buckets',
                  'Activity History',
                ],
                false,
              ),
              _buildPricingCard(
                theme,
                'Family Premium',
                '\$4.99',
                'Everything you need for growth.',
                [
                  'Unlimited Child Profiles',
                  'AI Money Mentor Access',
                  'Google Tasks Integration',
                  'Advanced Interest Settings',
                  'Priority Support',
                ],
                true,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPricingCard(ThemeData theme, String title, String price, String subtitle, List<String> features, bool featured) {
    return Container(
      width: 340,
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: featured ? theme.colorScheme.primary : Colors.white,
        borderRadius: BorderRadius.circular(32),
        border: featured ? null : Border.all(color: Colors.blueGrey.shade100),
        boxShadow: featured
            ? [
                BoxShadow(
                  color: theme.colorScheme.primary.withOpacity(0.3),
                  blurRadius: 30,
                  offset: const Offset(0, 15),
                ),
              ]
            : [],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (featured)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                'MOST POPULAR',
                style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ),
          Text(
            title,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 20,
              color: featured ? Colors.white : const Color(0xFF1A2E35),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                price,
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 40,
                  color: featured ? Colors.white : const Color(0xFF1A2E35),
                ),
              ),
              if (price != 'Free')
                Padding(
                  padding: const EdgeInsets.only(bottom: 8, left: 4),
                  child: Text(
                    '/mo',
                    style: TextStyle(
                      color: featured ? Colors.white.withOpacity(0.7) : Colors.blueGrey,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: TextStyle(
              color: featured ? Colors.white.withOpacity(0.8) : Colors.blueGrey,
            ),
          ),
          const SizedBox(height: 32),
          const Divider(),
          const SizedBox(height: 32),
          for (final feature in features)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Row(
                children: [
                  Icon(
                    Icons.check_circle,
                    size: 20,
                    color: featured ? Colors.white : theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    feature,
                    style: TextStyle(
                      color: featured ? Colors.white : const Color(0xFF1A2E35),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: featured ? Colors.white : theme.colorScheme.primary,
                foregroundColor: featured ? theme.colorScheme.primary : Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 20),
              ),
              child: const Text('Get Started'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter(ThemeData theme) {
    return Container(
      width: double.infinity,
      color: const Color(0xFF1A2E35),
      padding: const EdgeInsets.symmetric(vertical: 64, horizontal: 24),
      child: Column(
        children: [
          const Text('💰', style: TextStyle(fontSize: 40)),
          const SizedBox(height: 16),
          Text(
            'FamFi',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 24,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Making financial education approachable for every family.',
            style: TextStyle(color: Colors.blueGrey.shade300),
          ),
          const SizedBox(height: 48),
          const Divider(color: Colors.white12),
          const SizedBox(height: 32),
          Text(
            '© 2026 FamFi Inc. All rights reserved.',
            style: TextStyle(color: Colors.blueGrey.shade500, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
