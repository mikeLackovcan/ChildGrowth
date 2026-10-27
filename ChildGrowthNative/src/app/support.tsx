import { useTranslation } from 'react-i18next';
import React from 'react';
import { LegalPage, Paragraph, Section } from '../components/LegalPage';

export default function SupportPage() {
  const { t } = useTranslation();
  return (
    <LegalPage title={t('support_title')}>
      <Paragraph>{t('support_intro')}</Paragraph>

      <Section title={t('support_delete_title')}>
        <Paragraph>{t('support_delete_body')}</Paragraph>
      </Section>

      <Section title={t('support_guest_title')}>
        <Paragraph>{t('support_guest_body')}</Paragraph>
      </Section>

      <Section title={t('support_reminders_title')}>
        <Paragraph>{t('support_reminders_body')}</Paragraph>
      </Section>

      <Section title={t('support_family_title')}>
        <Paragraph>{t('support_family_body')}</Paragraph>
      </Section>

      <Section title={t('support_contact_title')}>
        <Paragraph>{t('support_contact_body')}</Paragraph>
      </Section>
    </LegalPage>
  );
}
