// Expo merges app.json into config before evaluating this file.
// Release builds must never silently select the temporary development backend.
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const release = profile === 'preview' || profile === 'production';
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const termsUrl = process.env.EXPO_PUBLIC_TERMS_URL;
  const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL;
  const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

  const requireHttps = (value, name) => {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} must be configured with an absolute HTTPS URL.`);
    }
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) ||
        url.hostname.startsWith('[')) {
      throw new Error(`${name} must use an HTTPS domain without embedded credentials.`);
    }
  };

  if (release) requireHttps(apiBaseUrl, 'EXPO_PUBLIC_API_BASE_URL');
  if (profile === 'production') {
    requireHttps(termsUrl, 'EXPO_PUBLIC_TERMS_URL');
    requireHttps(privacyUrl, 'EXPO_PUBLIC_PRIVACY_URL');
    if (!supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail) ||
        /(?:^|\.)example\.(?:com|org|net)$/i.test(supportEmail.split('@')[1])) {
      throw new Error('EXPO_PUBLIC_SUPPORT_EMAIL must be a monitored, non-placeholder email address.');
    }
  }

  return {
    ...config,
    extra: {
      ...config.extra,
      ...(apiBaseUrl ? { apiBaseUrl } : {}),
      ...(termsUrl ? { termsUrl } : {}),
      ...(privacyUrl ? { privacyUrl } : {}),
      ...(supportEmail ? { supportEmail } : {}),
    },
  };
};
