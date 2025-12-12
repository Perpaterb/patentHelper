/**
 * Privacy Policy Screen
 *
 * Public page displaying the privacy policy for Parenting Helper app.
 * No authentication required.
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';

const PrivacyPolicyScreen = () => {
  const lastUpdated = 'December 13, 2025';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Surface style={styles.card}>
          <Text variant="headlineLarge" style={styles.title}>
            Privacy Policy
          </Text>
          <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>

          <Section title="1. Introduction">
            <Text style={styles.paragraph}>
              Welcome to Parenting Helper ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the "Service").
            </Text>
            <Text style={styles.paragraph}>
              Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.
            </Text>
          </Section>

          <Section title="2. Information We Collect">
            <Text style={styles.subheading}>Personal Information</Text>
            <Text style={styles.paragraph}>
              We collect personal information that you voluntarily provide to us when you register for the Service, including:
            </Text>
            <Text style={styles.listItem}>- Email address</Text>
            <Text style={styles.listItem}>- Name (first and last name)</Text>
            <Text style={styles.listItem}>- Profile information (display name, profile icon)</Text>

            <Text style={styles.subheading}>Information You Share</Text>
            <Text style={styles.paragraph}>
              When using our Service, you may share:
            </Text>
            <Text style={styles.listItem}>- Messages and communications within groups</Text>
            <Text style={styles.listItem}>- Calendar events and schedules</Text>
            <Text style={styles.listItem}>- Financial records and expense tracking</Text>
            <Text style={styles.listItem}>- Photos, videos, and documents</Text>
            <Text style={styles.listItem}>- Audio and video call recordings (when enabled)</Text>

            <Text style={styles.subheading}>Automatically Collected Information</Text>
            <Text style={styles.paragraph}>
              We automatically collect certain information when you use the Service:
            </Text>
            <Text style={styles.listItem}>- Device information (device type, operating system)</Text>
            <Text style={styles.listItem}>- Log data (access times, pages viewed)</Text>
            <Text style={styles.listItem}>- IP address</Text>
          </Section>

          <Section title="3. How We Use Your Information">
            <Text style={styles.paragraph}>
              We use the information we collect to:
            </Text>
            <Text style={styles.listItem}>- Provide, operate, and maintain the Service</Text>
            <Text style={styles.listItem}>- Create and manage your account</Text>
            <Text style={styles.listItem}>- Enable communication between group members</Text>
            <Text style={styles.listItem}>- Process transactions and send related information</Text>
            <Text style={styles.listItem}>- Send you technical notices and support messages</Text>
            <Text style={styles.listItem}>- Respond to your comments and questions</Text>
            <Text style={styles.listItem}>- Protect against fraudulent or illegal activity</Text>
          </Section>

          <Section title="4. How We Share Your Information">
            <Text style={styles.paragraph}>
              We may share your information in the following situations:
            </Text>
            <Text style={styles.subheading}>With Group Members</Text>
            <Text style={styles.paragraph}>
              Information you share within a group (messages, calendar events, financial records) is visible to other members of that group based on their role permissions.
            </Text>
            <Text style={styles.subheading}>With Service Providers</Text>
            <Text style={styles.paragraph}>
              We may share your information with third-party service providers who perform services on our behalf, including:
            </Text>
            <Text style={styles.listItem}>- Cloud hosting (Amazon Web Services)</Text>
            <Text style={styles.listItem}>- Authentication (Kinde)</Text>
            <Text style={styles.listItem}>- Payment processing (Stripe)</Text>
            <Text style={styles.listItem}>- Email services</Text>

            <Text style={styles.subheading}>Legal Requirements</Text>
            <Text style={styles.paragraph}>
              We may disclose your information where required by law or in response to valid legal requests.
            </Text>
          </Section>

          <Section title="5. Data Retention">
            <Text style={styles.paragraph}>
              We retain your personal information for as long as your account is active or as needed to provide you services. Group administrators can export audit logs of group activity. When content is deleted, it may be hidden from view but retained in our systems for compliance and recovery purposes.
            </Text>
          </Section>

          <Section title="6. Data Security">
            <Text style={styles.paragraph}>
              We implement appropriate technical and organizational security measures to protect your personal information, including:
            </Text>
            <Text style={styles.listItem}>- Encryption of data in transit (TLS/SSL)</Text>
            <Text style={styles.listItem}>- Encryption of data at rest</Text>
            <Text style={styles.listItem}>- Secure authentication mechanisms</Text>
            <Text style={styles.listItem}>- Regular security assessments</Text>
            <Text style={styles.paragraph}>
              However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </Text>
          </Section>

          <Section title="7. Your Privacy Rights">
            <Text style={styles.paragraph}>
              Depending on your location, you may have the following rights:
            </Text>
            <Text style={styles.listItem}>- Access your personal information</Text>
            <Text style={styles.listItem}>- Correct inaccurate information</Text>
            <Text style={styles.listItem}>- Request deletion of your information</Text>
            <Text style={styles.listItem}>- Object to processing of your information</Text>
            <Text style={styles.listItem}>- Data portability</Text>
            <Text style={styles.paragraph}>
              To exercise these rights, please contact us using the information provided below.
            </Text>
          </Section>

          <Section title="8. Children's Privacy">
            <Text style={styles.paragraph}>
              Our Service is designed for use by families, which may include children. We do not knowingly collect personal information directly from children under 13 without parental consent. Parents and guardians manage their children's accounts and information through their own accounts.
            </Text>
          </Section>

          <Section title="9. International Data Transfers">
            <Text style={styles.paragraph}>
              Your information may be transferred to and processed in countries other than your own. Our servers are located in Australia (AWS Sydney region). We ensure appropriate safeguards are in place for international data transfers.
            </Text>
          </Section>

          <Section title="10. Changes to This Privacy Policy">
            <Text style={styles.paragraph}>
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date. You are advised to review this privacy policy periodically for any changes.
            </Text>
          </Section>

          <Section title="11. Contact Us">
            <Text style={styles.paragraph}>
              If you have questions or concerns about this privacy policy or our practices, please contact us at:
            </Text>
            <Text style={styles.contactInfo}>Email: support@familyhelperapp.com</Text>
            <Text style={styles.contactInfo}>Website: https://familyhelperapp.com</Text>
          </Section>
        </Surface>
      </ScrollView>
    </View>
  );
};

/**
 * Section component for organizing policy content
 */
const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text variant="titleLarge" style={styles.sectionTitle}>
      {title}
    </Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    padding: 32,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
  },
  title: {
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#555',
    marginBottom: 12,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 24,
    color: '#555',
    marginLeft: 16,
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 15,
    color: '#6200ee',
    marginBottom: 4,
  },
});

export default PrivacyPolicyScreen;
