import { useTranslation } from 'react-i18next';
import React from 'react';
import { LegalPage, Paragraph, Section } from '../components/LegalPage';

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  return (
    <LegalPage title={t('privacy_title')}>
      <Paragraph>{t('privacy_effective')}</Paragraph>
      <Paragraph>{t('privacy_intro')}</Paragraph>

      <Section title={t('privacy_data_title')}>
        <Paragraph>{t('privacy_guest')}</Paragraph>
        <Paragraph>{t('privacy_account')}</Paragraph>
        <Paragraph>{t('privacy_google')}</Paragraph>
      </Section>

      <Section title={t('privacy_use_title')}>
        <Paragraph>{t('privacy_use')}</Paragraph>
        <Paragraph>{t('privacy_notifications')}</Paragraph>
      </Section>

      <Section title={t('privacy_family_title')}>
        <Paragraph>{t('privacy_family')}</Paragraph>
        <Paragraph>{t('privacy_advertising')}</Paragraph>
      </Section>

      <Section title={t('privacy_storage_title')}>
        <Paragraph>{t('privacy_storage')}</Paragraph>
        <Paragraph>{t('privacy_retention')}</Paragraph>
      </Section>

      <Section title={t('privacy_deletion_title')}>
        <Paragraph>{t('privacy_deletion')}</Paragraph>
      </Section>

      <Section title={t('privacy_security_title')}>
        <Paragraph>{t('privacy_security')}</Paragraph>
      </Section>

      <Section title={t('privacy_contact_title')}>
        <Paragraph>{t('privacy_contact')}</Paragraph>
      </Section>
    </LegalPage>
  );
}
