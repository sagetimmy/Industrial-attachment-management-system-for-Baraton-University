import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const NAVY = '#0D1B2E';
const TEAL = '#2EC4A0';
const WHITE = '#FFFFFF';
const GRAY = '#8899AA';
const LIGHT_BG = '#F7F8FA';
const DARK = '#111827';
const BORDER = '#E5E7EB';

export function PrivacyPolicyContent() {
  const Section = ({ title, children }) => (
    <View style={styles.ppSection}>
      <Text style={styles.ppSectionTitle}>{title}</Text>
      <Text style={styles.ppBody}>{children}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.ppHero}>
        <Ionicons name="shield-checkmark-outline" size={40} color={TEAL} />
        <Text style={styles.ppHeroTitle}>Your Privacy Matters</Text>
        <Text style={styles.ppHeroSub}>
          This policy explains how the Industrial Attachment Management System (IAMS) collects,
          uses, and protects your personal information.
        </Text>
        <View style={styles.ppEffectiveBadge}>
          <Text style={styles.ppEffectiveText}>Effective Date: January 1, 2025</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Section title="1. Introduction">
          The Industrial Attachment Management System (IAMS) is operated by the University of
          Eastern Africa, Baraton (UEAB). This Privacy Policy governs the collection and use of
          personal information submitted through this application by students, supervisors, host
          organizations, and administrative staff.
        </Section>

        <View style={styles.divider} />

        <Section title="2. Information We Collect">
          We collect the following categories of information:{'\n\n'}
          <Text style={styles.ppBullet}>• <Text style={styles.ppBold}>Identity Data:</Text> Full name, registration number, student ID, email address, and phone number.{'\n'}</Text>
          <Text style={styles.ppBullet}>• <Text style={styles.ppBold}>Academic Data:</Text> Department, year of study, attachment records, logbook entries, and evaluation scores.{'\n'}</Text>
          <Text style={styles.ppBullet}>• <Text style={styles.ppBold}>Organizational Data:</Text> Host organization name, location, contact details, and available slots.{'\n'}</Text>
          <Text style={styles.ppBullet}>• <Text style={styles.ppBold}>Usage Data:</Text> Login timestamps, activity logs, and device information for security purposes.</Text>
        </Section>

        <View style={styles.divider} />

        <Section title="3. How We Use Your Information">
          Your information is used strictly for the following purposes:{'\n\n'}
          <Text style={styles.ppBullet}>• Facilitating the assignment of students to host organizations and supervisors.{'\n'}</Text>
          <Text style={styles.ppBullet}>• Tracking logbook submissions, evaluations, and site visits.{'\n'}</Text>
          <Text style={styles.ppBullet}>• Sending system notifications related to your attachment status.{'\n'}</Text>
          <Text style={styles.ppBullet}>• Generating academic and administrative reports for UEAB departments.{'\n'}</Text>
          <Text style={styles.ppBullet}>• Ensuring platform security and preventing unauthorized access.</Text>
        </Section>

        <View style={styles.divider} />

        <Section title="4. Data Sharing">
          UEAB does not sell, rent, or trade your personal information to third parties.
          Your data may be shared only in the following limited circumstances:{'\n\n'}
          <Text style={styles.ppBullet}>• With assigned supervisors and host organizations, limited to attachment-relevant details.{'\n'}</Text>
          <Text style={styles.ppBullet}>• With UEAB academic departments for reporting and accreditation purposes.{'\n'}</Text>
          <Text style={styles.ppBullet}>• With system service providers (e.g., cloud hosting) under strict confidentiality agreements.{'\n'}</Text>
          <Text style={styles.ppBullet}>• When required by law or a valid court order.</Text>
        </Section>

        <View style={styles.divider} />

        <Section title="5. Data Retention">
          Your personal data is retained for the duration of your academic program at UEAB and
          for a minimum of five (5) years thereafter, in accordance with Kenyan data protection
          regulations and institutional record-keeping policies. Inactive accounts may be
          archived after one (1) year of inactivity.
        </Section>

        <View style={styles.divider} />

        <Section title="6. Your Rights">
          Under the Kenya Data Protection Act, 2019, we have the right to:{'\n\n'}
          <Text style={styles.ppBullet}>• Access the personal data we hold about you.{'\n'}</Text>
          <Text style={styles.ppBullet}>• Request correction of inaccurate or incomplete data.{'\n'}</Text>
          <Text style={styles.ppBullet}>• Request deletion of your data where legally permissible.{'\n'}</Text>
          <Text style={styles.ppBullet}>• Object to processing of your data for specific purposes.{'\n'}</Text>
          <Text style={styles.ppBullet}>• Lodge a complaint with the Office of the Data Protection Commissioner (ODPC).</Text>
        </Section>

        <View style={styles.divider} />

        <Section title="7. Security">
          IAMS employs industry-standard security measures including encrypted data transmission
          (HTTPS), hashed password storage, JWT-based authentication with session expiry, and
          role-based access control to protect your information from unauthorized access,
          alteration, or disclosure.
        </Section>

        <View style={styles.divider} />

        <Section title="8. Cookies & Local Storage">
          This application stores authentication tokens locally on your device to maintain your
          session. No tracking cookies are used. Clearing your app storage or logging out will
          remove all locally stored session data.
        </Section>

        <View style={styles.divider} />

        <Section title="9. Changes to This Policy">
          UEAB reserves the right to update this Privacy Policy periodically. Users will be
          notified of significant changes through the application. Continued use of IAMS after
          such changes constitutes acceptance of the revised policy.
        </Section>

        <View style={styles.divider} />

        <Section title="10. Contact Us">
          For any privacy-related inquiries, data access requests, or complaints, please contact:{'\n\n'}
          <Text style={styles.ppBold}>Data Protection Officer{'\n'}</Text>
          University of Eastern Africa, Baraton{'\n'}
          P.O. Box 2500 – 30100, Eldoret, Kenya{'\n'}
          📧 admin@baraton.ac.ke{'\n'}
          📞 +254794955329
        </Section>
      </View>

      <View style={styles.ppFooter}>
        <Ionicons name="lock-closed-outline" size={14} color={GRAY} />
        <Text style={styles.ppFooterText}>
          IAMS v1.0.0 · University of Eastern Africa, Baraton · © 2025
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <PrivacyPolicyContent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: WHITE, fontSize: 18, fontWeight: '700' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, backgroundColor: LIGHT_BG, paddingHorizontal: 16 },
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    elevation: 1,
  },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },
  ppHero: {
    alignItems: 'center',
    backgroundColor: NAVY,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  ppHeroTitle: { fontSize: 22, fontWeight: '800', color: WHITE, marginTop: 12, marginBottom: 8 },
  ppHeroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20 },
  ppEffectiveBadge: {
    marginTop: 16,
    backgroundColor: 'rgba(46,196,160,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(46,196,160,0.3)',
  },
  ppEffectiveText: { color: TEAL, fontSize: 12, fontWeight: '600' },
  ppSection: { padding: 20 },
  ppSectionTitle: { fontSize: 14, fontWeight: '800', color: NAVY, marginBottom: 10 },
  ppBody: { fontSize: 13, color: DARK, lineHeight: 22 },
  ppBullet: { fontSize: 13, color: DARK, lineHeight: 22 },
  ppBold: { fontWeight: '700', color: DARK },
  ppFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    marginBottom: 8,
  },
  ppFooterText: { fontSize: 11, color: GRAY },
});
