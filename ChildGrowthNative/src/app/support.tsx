import React from 'react';
import { LegalPage, Paragraph, Section } from '../components/LegalPage';

export default function SupportPage() {
  return (
    <LegalPage title="Quest Champ Support">
      <Paragraph>Help for children, parents, and internal testers.</Paragraph>

      <Section title="Delete an account">
        <Paragraph>Open Quest Champ, tap Settings, choose Delete account, review the warning, and confirm. This removes the signed-in Firebase account, cloud profile, synchronized progress, and family invitations. If the app asks you to sign in again, do that first and repeat the deletion.</Paragraph>
      </Section>

      <Section title="Guest data">
        <Paragraph>Guest progress stays on the device. Open Settings and choose Reset local data to remove it. Removing the app also removes guest data unless the operating system restores an app backup.</Paragraph>
      </Section>

      <Section title="Reminders and alarms">
        <Paragraph>Allow notifications in Android settings. Reminder sounds follow the phone’s notification-channel and volume settings. A quest can use a normal notification, an alarm-style sound, or a focus-session finish alert.</Paragraph>
      </Section>

      <Section title="Family and privacy help">
        <Paragraph>A parent or guardian may ask us to review, correct, unlink, or delete family account data. Include the Quest Champ nickname and the account email, but never send a password.</Paragraph>
      </Section>

      <Section title="Contact support">
        <Paragraph>Email the developer with the app version, device model, and a short description of what happened.</Paragraph>
      </Section>
    </LegalPage>
  );
}
