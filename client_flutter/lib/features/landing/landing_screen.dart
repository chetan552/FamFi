import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

// ─── Color Tokens ────────────────────────────────────────────────────────────
const _teal = Color(0xFF2B9EB3);
const _amber = Color(0xFFF5A623);
const _dark = Color(0xFF1A2E35);
const _bgLight = Color(0xFFF8FAFB);
const _bgMid = Color(0xFFEFF4F6);

class LandingScreen extends ConsumerWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      backgroundColor: _bgLight,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _NavBar(isMobile: isMobile),
            _HeroSection(isMobile: isMobile),
            _HowItWorksSection(isMobile: isMobile),
            _FeaturesSection(isMobile: isMobile),
            _ResponsibilitySection(isMobile: isMobile),
            _FaqSection(isMobile: isMobile),
            _PricingSection(isMobile: isMobile),
            const _Footer(),
          ],
        ),
      ),
    );
  }
}

// ─── Nav Bar ─────────────────────────────────────────────────────────────────
class _NavBar extends StatelessWidget {
  final bool isMobile;
  const _NavBar({required this.isMobile});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _bgLight,
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
      child: Row(
        children: [
          const Text('💰', style: TextStyle(fontSize: 28)),
          const SizedBox(width: 8),
          Text(
            'FamFi',
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.w900,
              fontSize: 22,
              color: _teal,
            ),
          ),
          const Spacer(),
          TextButton(
            onPressed: () => context.push('/login'),
            style: TextButton.styleFrom(foregroundColor: _dark),
            child: const Text('Login', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 12),
          ElevatedButton(
            onPressed: () => context.push('/signup'),
            style: ElevatedButton.styleFrom(
              backgroundColor: _teal,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
            child: const Text('Get Started', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
class _HeroSection extends StatelessWidget {
  final bool isMobile;
  const _HeroSection({required this.isMobile});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _bgLight,
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : 80,
        vertical: isMobile ? 48 : 72,
      ),
      child: isMobile
          ? Column(children: [_heroText(context), const SizedBox(height: 48), _heroImage()])
          : Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(flex: 5, child: _heroText(context)),
                const SizedBox(width: 48),
                Expanded(flex: 4, child: _heroImage()),
              ],
            ),
    );
  }

  Widget _heroText(BuildContext context) {
    return Column(
      crossAxisAlignment: isMobile ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        // Badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: _teal.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🐷', style: TextStyle(fontSize: 13)),
              const SizedBox(width: 6),
              Text(
                'The Digital Piggy Bank for Modern Families',
                style: TextStyle(color: _teal, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        Text(
          'Teach Your Kids\nMoney Skills\nThey\'ll Keep Forever',
          textAlign: isMobile ? TextAlign.center : TextAlign.start,
          style: GoogleFonts.outfit(
            fontSize: isMobile ? 36 : 54,
            fontWeight: FontWeight.w900,
            height: 1.12,
            color: _dark,
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'FamFi is a virtual family bank where kids earn money through chores, save in themed buckets, watch interest grow, and build real financial habits — no cash needed.',
          textAlign: isMobile ? TextAlign.center : TextAlign.start,
          style: GoogleFonts.inter(
            fontSize: 17,
            color: Colors.blueGrey.shade600,
            height: 1.65,
          ),
        ),
        const SizedBox(height: 36),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          alignment: isMobile ? WrapAlignment.center : WrapAlignment.start,
          children: [
            ElevatedButton(
              onPressed: () => context.push('/signup'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
                textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              child: const Text('Start Free'),
            ),
            OutlinedButton(
              onPressed: () => context.push('/login'),
              style: OutlinedButton.styleFrom(
                foregroundColor: _dark,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                side: BorderSide(color: Colors.blueGrey.shade300),
                textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              child: const Text('I Have an Account'),
            ),
          ],
        ),
        const SizedBox(height: 32),
        Row(
          mainAxisAlignment: isMobile ? MainAxisAlignment.center : MainAxisAlignment.start,
          children: [
            _avatarStack(),
            const SizedBox(width: 12),
            Text(
              'Families are already banking together',
              style: TextStyle(
                color: Colors.blueGrey.shade400,
                fontWeight: FontWeight.w500,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _heroImage() {
    return Image.asset('assets/images/famfi_hero.png', fit: BoxFit.contain);
  }

  Widget _avatarStack() {
    const emojis = ['🧑', '👧', '👶', '👨'];
    return SizedBox(
      width: 96,
      height: 30,
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
                  radius: 13,
                  backgroundColor: Colors.blueGrey.shade100,
                  child: Text(emojis[i], style: const TextStyle(fontSize: 13)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── How It Works ────────────────────────────────────────────────────────────
class _HowItWorksSection extends StatelessWidget {
  final bool isMobile;
  const _HowItWorksSection({required this.isMobile});

  static const _steps = [
    (
      number: '1',
      emoji: '👨‍👩‍👧‍👦',
      title: 'Create Your Family Bank',
      description: 'Sign up in 30 seconds, name your family bank, and add your children.',
    ),
    (
      number: '2',
      emoji: '🧹',
      title: 'Assign Chores & Rewards',
      description: 'Set chores with dollar values. Kids mark them done, you approve and pay.',
    ),
    (
      number: '3',
      emoji: '🎉',
      title: 'Watch Them Learn & Grow',
      description: 'Kids see their savings grow with interest, learn budgeting through buckets, and build habits that last.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _bgLight,
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : 80,
        vertical: 80,
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: _amber.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'QUICK SETUP',
              style: TextStyle(
                color: _amber,
                fontWeight: FontWeight.bold,
                fontSize: 12,
                letterSpacing: 1,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Up and Running in 3 Steps',
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: isMobile ? 30 : 42,
              fontWeight: FontWeight.bold,
              color: _dark,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'No bank accounts, no cash, no complicated setup.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 16, color: Colors.blueGrey.shade500),
          ),
          const SizedBox(height: 56),
          isMobile
              ? Column(
                  children: [
                    for (var i = 0; i < _steps.length; i++) ...[
                      _StepCard(step: _steps[i], isMobile: isMobile),
                      if (i < _steps.length - 1) ...[
                        Icon(Icons.arrow_downward_rounded, color: Colors.blueGrey.shade300, size: 28),
                        const SizedBox(height: 8),
                      ],
                    ],
                  ],
                )
              : Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var i = 0; i < _steps.length; i++) ...[
                      Expanded(child: _StepCard(step: _steps[i], isMobile: isMobile)),
                      if (i < _steps.length - 1)
                        Padding(
                          padding: const EdgeInsets.only(top: 44),
                          child: Icon(Icons.arrow_forward_rounded, color: Colors.blueGrey.shade300, size: 28),
                        ),
                    ],
                  ],
                ),
        ],
      ),
    );
  }
}

class _StepCard extends StatelessWidget {
  final ({String number, String emoji, String title, String description}) step;
  final bool isMobile;
  const _StepCard({required this.step, required this.isMobile});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      margin: EdgeInsets.symmetric(horizontal: isMobile ? 0 : 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 16, offset: const Offset(0, 6)),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: _teal.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            alignment: Alignment.center,
            child: Text(step.emoji, style: const TextStyle(fontSize: 28)),
          ),
          const SizedBox(height: 16),
          Text(
            'Step ${step.number}',
            style: TextStyle(color: _teal, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),
          Text(
            step.title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: _dark),
          ),
          const SizedBox(height: 8),
          Text(
            step.description,
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.blueGrey.shade400, fontSize: 14, height: 1.5),
          ),
        ],
      ),
    );
  }
}

// ─── Features ────────────────────────────────────────────────────────────────
class _FeaturesSection extends StatelessWidget {
  final bool isMobile;
  const _FeaturesSection({required this.isMobile});

  static const _features = [
    ('🧹', 'Smart Chores', 'Assign chores with dollar values, track completion, and approve payouts. Sync with Google Tasks for zero extra work.'),
    ('🪣', 'Savings Buckets', 'Every dollar earned is automatically split into Saving, Spending, and Giving buckets you configure — teaching kids where money goes.'),
    ('📈', 'Interest & Matching', 'Set a family interest rate so kids see compounding in action. Enable parent matching to double the bonus.'),
    ('🤖', 'AI Money Mentor', 'An always-on AI coach that answers money questions, sets age-appropriate goals, and delivers personalized tips for each child.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _bgMid,
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : 80,
        vertical: 80,
      ),
      child: Column(
        children: [
          Text(
            'Everything Your Family\nBank Needs',
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: isMobile ? 30 : 42,
              fontWeight: FontWeight.bold,
              color: _dark,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'A virtual bank your kids can actually see, touch, and understand.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 16, color: Colors.blueGrey.shade500),
          ),
          const SizedBox(height: 56),
          Wrap(
            spacing: 20,
            runSpacing: 20,
            alignment: WrapAlignment.center,
            children: [
              for (final f in _features)
                _FeatureCard(emoji: f.$1, title: f.$2, description: f.$3),
            ],
          ),
        ],
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final String emoji, title, description;
  const _FeatureCard({required this.emoji, required this.title, required this.description});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 280),
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 16, offset: const Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: _teal.withValues(alpha: 0.09),
              borderRadius: BorderRadius.circular(14),
            ),
            alignment: Alignment.center,
            child: Text(emoji, style: const TextStyle(fontSize: 22)),
          ),
          const SizedBox(height: 20),
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: _dark)),
          const SizedBox(height: 8),
          Text(description, style: TextStyle(color: Colors.blueGrey.shade400, fontSize: 14, height: 1.55)),
        ],
      ),
    );
  }
}

// ─── Responsibility ───────────────────────────────────────────────────────────
class _ResponsibilitySection extends StatelessWidget {
  final bool isMobile;
  const _ResponsibilitySection({required this.isMobile});

  static const _pillars = [
    (Icons.hourglass_bottom_rounded, 'Delayed Gratification', 'Teach the discipline of saving up for something meaningful instead of spending impulsively.'),
    (Icons.account_balance_rounded, 'Real-World Decisions', 'Let kids manage a real digital balance and experience the consequences of their choices safely.'),
    (Icons.favorite_rounded, 'Giving & Generosity', 'Build giving habits early by allocating a slice of every paycheck to causes they choose.'),
  ];

  @override
  Widget build(BuildContext context) {
    final left = _leftContent();
    final right = _rightCard(context);

    return Container(
      color: _bgLight,
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : 80,
        vertical: 80,
      ),
      child: isMobile
          ? Column(children: [left, const SizedBox(height: 48), right])
          : Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(flex: 5, child: left),
                const SizedBox(width: 64),
                Expanded(flex: 4, child: right),
              ],
            ),
    );
  }

  Widget _leftContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Raising Financially\nResponsible Kids',
          style: GoogleFonts.outfit(
            fontSize: 40,
            fontWeight: FontWeight.bold,
            color: _dark,
            height: 1.2,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          "FamFi isn't just a tracker — it's a hands-on curriculum for real-world money values.",
          style: GoogleFonts.inter(fontSize: 16, color: Colors.blueGrey.shade500, height: 1.6),
        ),
        const SizedBox(height: 40),
        for (final p in _pillars) ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _amber.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(p.$1, color: _amber, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.$2, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: _dark)),
                    const SizedBox(height: 4),
                    Text(p.$3, style: TextStyle(color: Colors.blueGrey.shade500, fontSize: 14, height: 1.5)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),
        ],
      ],
    );
  }

  Widget _rightCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [_amber.withValues(alpha: 0.08), _amber.withValues(alpha: 0.02)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: _amber.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          const Text('⭐', style: TextStyle(fontSize: 44)),
          const SizedBox(height: 20),
          Text(
            'The Family Pledge',
            style: GoogleFonts.outfit(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: _amber,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            '"We will earn with effort, save with purpose, and give with joy."',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontStyle: FontStyle.italic,
              fontSize: 17,
              color: const Color(0xFF4A3B10),
              height: 1.55,
            ),
          ),
          const SizedBox(height: 36),
          ElevatedButton(
            onPressed: () => context.push('/signup'),
            style: ElevatedButton.styleFrom(
              backgroundColor: _amber,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: const Text('Start Teaching Today', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          ),
        ],
      ),
    );
  }
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
class _FaqSection extends StatelessWidget {
  final bool isMobile;
  const _FaqSection({required this.isMobile});

  static const _faqs = [
    (
      question: 'Is this real money?',
      answer: 'No. FamFi is a virtual family bank for tracking allowances and teaching money skills. No real bank accounts or cards are involved — just the lessons.',
    ),
    (
      question: 'What age is this for?',
      answer: 'FamFi works great for kids ages 4-16. Younger kids love earning and watching buckets fill up; older kids appreciate interest and budgeting.',
    ),
    (
      question: 'Can both parents use it?',
      answer: 'Yes! Share your family invite code and both parents can manage chores, approve payouts, and track progress from their own devices.',
    ),
    (
      question: 'What if I have multiple kids?',
      answer: 'The free plan supports 1 child. Upgrade to Family Premium for unlimited child profiles, AI mentor access, and Google Tasks sync.',
    ),
    (
      question: 'How does the interest feature work?',
      answer: 'You set a monthly interest rate (e.g., 5%) on any savings bucket. When you run "Process Interest," FamFi calculates and credits interest on every child\'s balance — just like a real bank.',
    ),
    (
      question: 'Can kids use it on their own device?',
      answer: 'Yes! Kids can log in on a tablet or phone to view their balances, mark chores as done, and check their savings goals. Parents approve everything.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _bgLight,
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : 80,
        vertical: 80,
      ),
      child: Column(
        children: [
          Text(
            'Frequently Asked Questions',
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: isMobile ? 30 : 42,
              fontWeight: FontWeight.bold,
              color: _dark,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Everything you need to know before getting started.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 16, color: Colors.blueGrey.shade500),
          ),
          const SizedBox(height: 48),
          Container(
            constraints: const BoxConstraints(maxWidth: 760),
            child: Column(
              children: [
                for (final faq in _faqs)
                  _FaqTile(question: faq.question, answer: faq.answer),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FaqTile extends StatefulWidget {
  final String question, answer;
  const _FaqTile({required this.question, required this.answer});

  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _expanded ? _teal.withValues(alpha: 0.3) : Colors.blueGrey.shade100),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
          childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          onExpansionChanged: (val) => setState(() => _expanded = val),
          title: Text(
            widget.question,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 15,
              color: _expanded ? _teal : _dark,
            ),
          ),
          trailing: AnimatedRotation(
            turns: _expanded ? 0.5 : 0,
            duration: const Duration(milliseconds: 200),
            child: Icon(Icons.expand_more, color: _expanded ? _teal : Colors.blueGrey.shade400),
          ),
          children: [
            Text(
              widget.answer,
              style: TextStyle(color: Colors.blueGrey.shade500, fontSize: 14, height: 1.6),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
class _PricingSection extends StatelessWidget {
  final bool isMobile;
  const _PricingSection({required this.isMobile});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _bgMid,
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : 80,
        vertical: 80,
      ),
      child: Column(
        children: [
          Text(
            'Simple, Honest Pricing',
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(fontSize: isMobile ? 30 : 42, fontWeight: FontWeight.bold, color: _dark),
          ),
          const SizedBox(height: 10),
          Text(
            'Start free. Upgrade when your family is ready.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 16, color: Colors.blueGrey.shade500),
          ),
          const SizedBox(height: 56),
          Wrap(
            spacing: 24,
            runSpacing: 24,
            alignment: WrapAlignment.center,
            children: [
              _PricingCard(
                title: 'Family Basic',
                price: 'Free',
                subtitle: 'Perfect to get started.',
                features: const ['1 Child Profile', 'Chore Tracking & Payday', 'Savings Buckets', 'Activity History'],
                featured: false,
                onTap: () => context.push('/signup'),
              ),
              _PricingCard(
                title: 'Family Premium',
                price: '\$4.99',
                subtitle: 'Unlock the full experience.',
                features: const [
                  'Unlimited Child Profiles',
                  'AI Money Mentor',
                  'Google Tasks Sync',
                  'Interest & Parent Matching',
                  'Kiosk Dashboard for Tablets',
                  'Priority Support',
                ],
                featured: true,
                onTap: () => context.push('/signup'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PricingCard extends StatelessWidget {
  final String title, price, subtitle;
  final List<String> features;
  final bool featured;
  final VoidCallback onTap;

  const _PricingCard({
    required this.title,
    required this.price,
    required this.subtitle,
    required this.features,
    required this.featured,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bg = featured ? _teal : Colors.white;
    final fg = featured ? Colors.white : _dark;
    final subtle = featured ? Colors.white.withValues(alpha: 0.7) : Colors.blueGrey.shade400;
    final iconColor = featured ? Colors.white : _teal;

    return Container(
      width: 320,
      padding: const EdgeInsets.all(36),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(28),
        border: featured ? null : Border.all(color: Colors.blueGrey.shade100),
        boxShadow: featured
            ? [BoxShadow(color: _teal.withValues(alpha: 0.25), blurRadius: 32, offset: const Offset(0, 12))]
            : [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 16, offset: const Offset(0, 6))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (featured)
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text('MOST POPULAR', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
            ),
          Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: fg)),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(price, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 38, color: fg)),
              if (price != 'Free')
                Padding(
                  padding: const EdgeInsets.only(bottom: 7, left: 3),
                  child: Text('/mo', style: TextStyle(color: subtle, fontSize: 14)),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(subtitle, style: TextStyle(color: subtle, fontSize: 14)),
          Divider(height: 40, color: featured ? Colors.white24 : Colors.blueGrey.shade100),
          for (final f in features)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(
                children: [
                  Icon(Icons.check_circle_rounded, size: 18, color: iconColor),
                  const SizedBox(width: 10),
                  Expanded(child: Text(f, style: TextStyle(color: fg, fontWeight: FontWeight.w500, fontSize: 14))),
                ],
              ),
            ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onTap,
              style: ElevatedButton.styleFrom(
                backgroundColor: featured ? Colors.white : _teal,
                foregroundColor: featured ? _teal : Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: const Text('Get Started', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Footer ───────────────────────────────────────────────────────────────────
class _Footer extends StatelessWidget {
  const _Footer();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _dark,
      padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 32),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('💰', style: TextStyle(fontSize: 26)),
              const SizedBox(width: 8),
              Text('FamFi', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Making financial literacy approachable for every family.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.blueGrey.shade400, fontSize: 14),
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 24,
            alignment: WrapAlignment.center,
            children: [
              TextButton(
                onPressed: () => context.push('/login'),
                child: Text('Login', style: TextStyle(color: Colors.blueGrey.shade400, fontSize: 13)),
              ),
              TextButton(
                onPressed: () => context.push('/signup'),
                child: Text('Sign Up', style: TextStyle(color: Colors.blueGrey.shade400, fontSize: 13)),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(color: Colors.white12),
          const SizedBox(height: 24),
          Text(
            '© 2026 FamFi Inc. All rights reserved.',
            style: TextStyle(color: Colors.blueGrey.shade600, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
