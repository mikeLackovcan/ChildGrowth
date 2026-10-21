import React from 'react';
import { LegalPage, Paragraph, Section } from '../components/LegalPage';

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <Paragraph>Effective: October 21, 2026</Paragraph>
      <Paragraph>Quest Champ is a habit, chore, focus, and reward companion designed for children ages 5–12 and their families. Children can use the core app in guest mode without creating an account.</Paragraph>

      <Section title="Information we process">
        <Paragraph>Guest mode stores quests, progress, rewards, settings, and world customizations only on the device.</Paragraph>
        <Paragraph>If a parent or family chooses an account, Quest Champ uses Firebase Authentication and Cloud Firestore. Account data may include an email address, Firebase user ID, display name, nickname, family role, quests and schedules, progress, rewards, avatar and world choices, and approved family links or invitations.</Paragraph>
        <Paragraph>Google Sign-In shares basic account information with Quest Champ only when the user chooses that sign-in method. Quest Champ does not collect precise location, contacts, microphone recordings, advertising IDs, or payment-card information.</Paragraph>
      </Section>

      <Section title="How information is used">
        <Paragraph>We use information only to provide sign-in, synchronize progress, restore family data, connect approved parent and child profiles, schedule requested reminders, and operate the features selected by the family.</Paragraph>
        <Paragraph>Reminder and focus notifications are scheduled by the device. Quest Champ does not collect a push-notification token for advertising or marketing.</Paragraph>
      </Section>

      <Section title="Children and parents">
        <Paragraph>Quest Champ is child-directed. Guest mode is the privacy-first option. A parent or guardian should supervise any account creation or family linking and may review, correct, unlink, or delete the child’s information.</Paragraph>
        <Paragraph>We do not sell children’s personal information, show third-party advertising, use behavioral advertising, or intentionally profile children for marketing.</Paragraph>
      </Section>

      <Section title="Storage and service providers">
        <Paragraph>Cloud accounts use Google Firebase Authentication and Cloud Firestore. The Quest Champ Firestore database is configured in Frankfurt, Germany. Google processes this information as our service provider under its applicable data-protection terms.</Paragraph>
        <Paragraph>Account data is kept while the account is active or as needed to provide the service and comply with legal obligations. Guest data remains on the device until the app data is reset or the app is removed.</Paragraph>
      </Section>

      <Section title="Deletion and family choices">
        <Paragraph>A signed-in user can open Settings and choose Delete account to permanently remove the Firebase account, profile, synced progress, and family invitations. Reset local data removes information stored on that device. Families may also contact us for help with access, correction, export, or deletion.</Paragraph>
      </Section>

      <Section title="Security and changes">
        <Paragraph>We use authentication, Firebase access controls, and data minimization to protect family information. No online service can guarantee absolute security. Material policy changes will be posted here with a revised effective date.</Paragraph>
      </Section>

      <Section title="Contact">
        <Paragraph>For privacy questions, parental requests, or account-deletion help, contact the Quest Champ developer:</Paragraph>
      </Section>
    </LegalPage>
  );
}
