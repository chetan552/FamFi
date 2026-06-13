import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Divider, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';

const teal = '#2B9EB3';
const amber = '#F5A623';
const heroImage = require('@/assets/images/famfi_hero.png');

const steps = [
  {
    number: '1',
    emoji: '👨‍👩‍👧‍👦',
    title: 'Create Your Family Bank',
    description: 'Sign up in 30 seconds, name your family bank, and add your children.',
  },
  {
    number: '2',
    emoji: '🧹',
    title: 'Assign Chores & Rewards',
    description: 'Set chores with dollar values. Kids mark them done, you approve and pay.',
  },
  {
    number: '3',
    emoji: '🎉',
    title: 'Watch Them Learn & Grow',
    description: 'Kids see their savings grow with interest, learn budgeting through buckets, and build habits that last.',
  },
];

const features = [
  ['🧹', 'Smart Chores', 'Assign chores with dollar values, track completion, approve payouts, and sync with Google Tasks.'],
  ['🪣', 'Savings Buckets', 'Every dollar earned can be split into Saving, Spending, and Giving buckets.'],
  ['📈', 'Interest & Matching', 'Set family interest and parent matching so kids see compounding in action.'],
  ['🤖', 'AI Money Mentor', 'An always-on coach for age-appropriate money questions and savings goals.'],
];

const pillars = [
  ['hourglass-bottom', 'Delayed Gratification', 'Teach the discipline of saving up for something meaningful instead of spending impulsively.'],
  ['bank-outline', 'Real-World Decisions', 'Let kids manage a digital balance and experience choices safely.'],
  ['heart-outline', 'Giving & Generosity', 'Build giving habits by allocating a slice of every payday to causes they choose.'],
];

const faqs = [
  ['Is this real money?', 'No. FamFi is a virtual family bank for tracking allowances and teaching money skills. No real bank accounts or cards are involved.'],
  ['What age is this for?', 'FamFi works well for kids ages 4-16. Younger kids love earning and watching buckets fill up; older kids appreciate interest and budgeting.'],
  ['Can both parents use it?', 'Yes. Share your family invite code and both parents can manage chores, approve payouts, and track progress.'],
  ['What if I have multiple kids?', 'The free plan supports 1 child. Family Premium supports unlimited child profiles, AI mentor access, and Google Tasks sync.'],
  ['How does interest work?', 'You set a monthly interest rate on any savings bucket. FamFi calculates and credits interest when you process it.'],
];

export default function WelcomeScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 800;
  const { setHasSeenOnboarding } = useSettingsStore();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const goTo = (route: '/(auth)/login' | '/(auth)/signup') => {
    setHasSeenOnboarding(true);
    router.push(route);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.nav, isMobile && styles.navMobile, { backgroundColor: theme.colors.surface }]}>
          <Pressable style={styles.brand} onPress={() => router.replace('/(auth)/welcome')}>
            <Text style={styles.brandEmoji}>💰</Text>
            <Text style={styles.brandText}>FamFi</Text>
          </Pressable>
          <View style={[styles.navActions, isMobile && styles.navActionsMobile]}>
            <Button mode="text" textColor={theme.colors.onSurface} onPress={() => goTo('/(auth)/login')}>
              Login
            </Button>
            <Button mode="contained" buttonColor={teal} onPress={() => goTo('/(auth)/signup')}>
              Get Started
            </Button>
          </View>
        </View>

        <View style={styles.hero}>
          <Image source={heroImage} resizeMode="cover" style={styles.heroImage} />
          <View style={styles.heroScrim} />
          <View style={[styles.heroInner, isMobile && styles.heroInnerMobile]}>
            <View style={styles.badge}>
              <Text style={styles.badgeEmoji}>🐷</Text>
              <Text style={styles.badgeText}>The Digital Piggy Bank for Modern Families</Text>
            </View>
            <Text
              variant={isMobile ? 'displaySmall' : 'displayLarge'}
              style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}
            >
              Teach Your Kids Money Skills They'll Keep Forever
            </Text>
            <Text variant="titleMedium" style={styles.heroCopy}>
              FamFi is a virtual family bank where kids earn money through chores, save in themed buckets, watch interest grow, and build real financial habits without cash.
            </Text>
            <View style={[styles.heroActions, isMobile && styles.heroActionsMobile]}>
              <Button
                mode="contained"
                buttonColor={teal}
                onPress={() => goTo('/(auth)/signup')}
                contentStyle={styles.ctaContent}
                style={styles.ctaButton}
              >
                Start Free
              </Button>
              <Button
                mode="outlined"
                textColor="#FFFFFF"
                onPress={() => goTo('/(auth)/login')}
                contentStyle={styles.ctaContent}
                style={styles.outlineOnHero}
              >
                I Have an Account
              </Button>
            </View>
          </View>
        </View>

        <Section
          eyebrow="Quick Setup"
          title="Up and Running in 3 Steps"
          subtitle="No bank accounts, no cash, no complicated setup."
          background={theme.colors.surface}
          isMobile={isMobile}
        >
          <View style={[styles.stepGrid, isMobile && styles.stackGrid]}>
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <InfoCard style={styles.stepCard}>
                  <View style={styles.cardEmojiBox}>
                    <Text style={styles.cardEmoji}>{step.emoji}</Text>
                  </View>
                  <Text style={styles.stepNumber}>Step {step.number}</Text>
                  <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                    {step.title}
                  </Text>
                  <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
                    {step.description}
                  </Text>
                </InfoCard>
                {!isMobile && index < steps.length - 1 && (
                  <MaterialCommunityIcons name="arrow-right" size={28} color={theme.colors.outline} style={styles.stepArrow} />
                )}
              </React.Fragment>
            ))}
          </View>
        </Section>

        <Section
          title="Everything Your Family Bank Needs"
          subtitle="A virtual bank your kids can actually see, touch, and understand."
          background={theme.colors.surfaceVariant}
          isMobile={isMobile}
        >
          <View style={styles.featureGrid}>
            {features.map(([emoji, title, description]) => (
              <InfoCard key={title} style={styles.featureCard}>
                <View style={styles.cardEmojiBox}>
                  <Text style={styles.featureEmoji}>{emoji}</Text>
                </View>
                <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                  {title}
                </Text>
                <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
                  {description}
                </Text>
              </InfoCard>
            ))}
          </View>
        </Section>

        <View style={[styles.responsibility, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.sectionInner, styles.responsibilityInner, isMobile && styles.stackGrid]}>
            <View style={styles.responsibilityText}>
              <Text variant={isMobile ? 'headlineLarge' : 'displaySmall'} style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Raising Financially Responsible Kids
              </Text>
              <Text variant="bodyLarge" style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                FamFi is a hands-on curriculum for real-world money values.
              </Text>
              <View style={styles.pillarList}>
                {pillars.map(([icon, title, description]) => (
                  <View key={title} style={styles.pillarRow}>
                    <View style={styles.pillarIcon}>
                      <MaterialCommunityIcons name={icon as any} size={22} color={amber} />
                    </View>
                    <View style={styles.pillarText}>
                      <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                        {title}
                      </Text>
                      <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
                        {description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <View style={[styles.pledgeCard, { borderColor: '#F5A62344' }]}>
              <Text style={styles.pledgeEmoji}>⭐</Text>
              <Text variant="headlineSmall" style={styles.pledgeTitle}>The Family Pledge</Text>
              <Text variant="titleMedium" style={[styles.pledgeQuote, { color: theme.colors.onSurface }]}>
                "We will earn with effort, save with purpose, and give with joy."
              </Text>
              <Button mode="contained" buttonColor={amber} onPress={() => goTo('/(auth)/signup')} style={styles.ctaButton}>
                Start Teaching Today
              </Button>
            </View>
          </View>
        </View>

        <Section
          title="Simple, Honest Pricing"
          subtitle="Start free. Upgrade when your family is ready."
          background={theme.colors.surfaceVariant}
          isMobile={isMobile}
        >
          <View style={styles.pricingGrid}>
            <PricingCard
              title="Family Basic"
              price="Free"
              subtitle="Perfect to get started."
              features={['1 Child Profile', 'Chore Tracking & Payday', 'Savings Buckets', 'Activity History']}
              onPress={() => goTo('/(auth)/signup')}
            />
            <PricingCard
              featured
              title="Family Premium"
              price="$4.99"
              subtitle="Unlock the full experience."
              features={['Unlimited Child Profiles', 'AI Money Mentor', 'Google Tasks Sync', 'Interest & Parent Matching', 'Kiosk Dashboard for Tablets']}
              onPress={() => goTo('/(auth)/signup')}
            />
          </View>
        </Section>

        <Section
          title="Frequently Asked Questions"
          subtitle="Everything you need to know before getting started."
          background={theme.colors.surface}
          isMobile={isMobile}
        >
          <View style={styles.faqList}>
            {faqs.map(([question, answer], index) => {
              const expanded = expandedFaq === index;
              return (
                <Pressable
                  key={question}
                  onPress={() => setExpandedFaq(expanded ? null : index)}
                  style={[
                    styles.faqItem,
                    {
                      borderColor: expanded ? '#2B9EB355' : theme.colors.outline,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                >
                  <View style={styles.faqQuestionRow}>
                    <Text variant="titleSmall" style={{ color: expanded ? teal : theme.colors.onSurface, fontWeight: '700' }}>
                      {question}
                    </Text>
                    <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={expanded ? teal : theme.colors.onSurfaceVariant} />
                  </View>
                  {expanded && (
                    <Text style={[styles.faqAnswer, { color: theme.colors.onSurfaceVariant }]}>
                      {answer}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Section>

        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <Text style={styles.brandEmoji}>💰</Text>
            <Text style={styles.footerBrandText}>FamFi</Text>
          </View>
          <Text style={styles.footerCopy}>Making financial literacy approachable for every family.</Text>
          <View style={styles.footerLinks}>
            <Button mode="text" textColor="#9DB5BE" onPress={() => goTo('/(auth)/login')}>Login</Button>
            <Button mode="text" textColor="#9DB5BE" onPress={() => goTo('/(auth)/signup')}>Sign Up</Button>
          </View>
          <Divider style={styles.footerDivider} />
          <Text style={styles.copyright}>© 2026 FamFi Inc. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  background,
  isMobile,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  background: string;
  isMobile: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionBand, { backgroundColor: background }]}>
      <View style={styles.sectionInner}>
        {eyebrow && (
          <View style={styles.eyebrowPill}>
            <Text style={styles.eyebrowText}>{eyebrow}</Text>
          </View>
        )}
        <Text
          variant={isMobile ? 'headlineLarge' : 'displaySmall'}
          style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
        >
          {title}
        </Text>
        <Text variant="bodyLarge" style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          {subtitle}
        </Text>
        {children}
      </View>
    </View>
  );
}

function InfoCard({ children, style }: { children: React.ReactNode; style?: object }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.infoCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function PricingCard({
  title,
  price,
  subtitle,
  features: planFeatures,
  featured,
  onPress,
}: {
  title: string;
  price: string;
  subtitle: string;
  features: string[];
  featured?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const bg = featured ? teal : theme.colors.surface;
  const fg = featured ? '#FFFFFF' : theme.colors.onSurface;
  const muted = featured ? '#FFFFFFBB' : theme.colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.pricingCard,
        {
          backgroundColor: bg,
          borderColor: featured ? teal : theme.colors.outline,
        },
      ]}
    >
      {featured && (
        <View style={styles.popularPill}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}
      <Text variant="titleLarge" style={{ color: fg, fontWeight: '800' }}>{title}</Text>
      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: fg }]}>{price}</Text>
        {price !== 'Free' && <Text style={{ color: muted, marginBottom: 8 }}>/mo</Text>}
      </View>
      <Text style={{ color: muted }}>{subtitle}</Text>
      <Divider style={[styles.planDivider, { backgroundColor: featured ? '#FFFFFF33' : theme.colors.outline }]} />
      {planFeatures.map((feature) => (
        <View key={feature} style={styles.planFeatureRow}>
          <MaterialCommunityIcons name="check-circle" size={18} color={featured ? '#FFFFFF' : teal} />
          <Text style={{ color: fg, flex: 1, fontWeight: '600' }}>{feature}</Text>
        </View>
      ))}
      <Button
        mode="contained"
        buttonColor={featured ? '#FFFFFF' : teal}
        textColor={featured ? teal : '#FFFFFF'}
        onPress={onPress}
        style={styles.planButton}
      >
        Get Started
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  nav: {
    minHeight: 76,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navMobile: { paddingHorizontal: spacing.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandEmoji: { fontSize: 28 },
  brandText: { color: teal, fontSize: 24, fontWeight: '900' },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navActionsMobile: { gap: spacing.xs },
  hero: { minHeight: 540, justifyContent: 'center', overflow: 'hidden', backgroundColor: '#07191E' },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.18,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 25, 30, 0.72)',
  },
  heroInner: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: 64,
    alignItems: 'flex-start',
  },
  heroInnerMobile: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 64,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(43, 158, 179, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(92, 200, 219, 0.32)',
  },
  badgeEmoji: { fontSize: 14 },
  badgeText: { color: '#B2EBF2', fontWeight: '800', fontSize: 13 },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 50,
    fontWeight: '900',
    marginTop: spacing.xl,
    maxWidth: 680,
    lineHeight: 56,
  },
  heroTitleMobile: {
    textAlign: 'center',
    lineHeight: 44,
  },
  heroCopy: {
    color: '#D5E4E8',
    marginTop: spacing.md,
    maxWidth: 640,
    lineHeight: 26,
  },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  heroActionsMobile: { justifyContent: 'center' },
  ctaButton: { borderRadius: 12 },
  ctaContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  outlineOnHero: { borderColor: '#FFFFFFAA', borderRadius: 12 },
  sectionBand: { paddingHorizontal: spacing.xl, paddingVertical: 64 },
  sectionInner: { width: '100%', maxWidth: 1120, alignSelf: 'center', alignItems: 'center' },
  eyebrowPill: {
    backgroundColor: '#F5A62322',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    marginBottom: spacing.md,
  },
  eyebrowText: { color: amber, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  sectionTitle: { textAlign: 'center', fontWeight: '900' },
  sectionSubtitle: { textAlign: 'center', marginTop: spacing.sm, marginBottom: 56, lineHeight: 26 },
  stepGrid: { flexDirection: 'row', alignItems: 'flex-start', width: '100%' },
  stackGrid: { flexDirection: 'column', alignItems: 'stretch' },
  infoCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: spacing.xl,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  stepCard: { flex: 1, alignItems: 'center', marginHorizontal: spacing.sm, marginBottom: spacing.md },
  stepArrow: { marginTop: 58 },
  cardEmojiBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B9EB31A',
    marginBottom: spacing.md,
  },
  cardEmoji: { fontSize: 28 },
  featureEmoji: { fontSize: 24 },
  stepNumber: { color: teal, fontWeight: '900', fontSize: 13, marginBottom: spacing.sm },
  cardTitle: { fontWeight: '800', marginBottom: spacing.sm },
  cardDescription: { lineHeight: 22 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.lg },
  featureCard: { width: 260, minHeight: 230 },
  responsibility: { paddingHorizontal: spacing.xl, paddingVertical: 80 },
  responsibilityInner: { flexDirection: 'row', gap: 64, alignItems: 'center' },
  responsibilityText: { flex: 1, alignSelf: 'stretch' },
  pillarList: { gap: spacing.lg },
  pillarRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  pillarIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5A62322',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarText: { flex: 1 },
  pledgeCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 28,
    padding: spacing.xxl,
    backgroundColor: '#F5A62314',
  },
  pledgeEmoji: { fontSize: 44 },
  pledgeTitle: { color: amber, fontWeight: '900', marginTop: spacing.md },
  pledgeQuote: { textAlign: 'center', fontStyle: 'italic', lineHeight: 28, marginVertical: spacing.xl },
  pricingGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xl },
  pricingCard: {
    width: 320,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 28,
    padding: spacing.xl,
  },
  popularPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF33',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  popularText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginTop: spacing.sm },
  price: { fontSize: 38, fontWeight: '900' },
  planDivider: { marginVertical: spacing.lg },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  planButton: { marginTop: spacing.md, borderRadius: 12 },
  faqList: { width: '100%', maxWidth: 760, gap: spacing.md },
  faqItem: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: spacing.lg },
  faqQuestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  faqAnswer: { lineHeight: 23, marginTop: spacing.md },
  footer: { backgroundColor: '#1A2E35', paddingHorizontal: spacing.xl, paddingVertical: 60, alignItems: 'center' },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footerBrandText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  footerCopy: { color: '#9DB5BE', marginTop: spacing.md, textAlign: 'center' },
  footerLinks: { flexDirection: 'row', marginTop: spacing.md },
  footerDivider: { width: '100%', maxWidth: 720, marginVertical: spacing.lg, backgroundColor: '#FFFFFF22' },
  copyright: { color: '#6D8A94', fontSize: 12 },
});
