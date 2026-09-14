/**
 * Central registry of bundled image assets. Import `Images.logo` instead of
 * scattering `require('../../assets/…')` calls across components (DRY — one
 * place to rename or swap a file).
 */
export const Images = {
  logo: require('../../assets/logo.png'),
  onboarding: {
    one: require('../../assets/oborading-one.png'),
    two: require('../../assets/onboarding-two.png'),
    three: require('../../assets/onboarding-three.png'),
    four: require('../../assets/onboarding-four.png'),
  },
} as const;

/** Intrinsic aspect ratio (width / height) of the logo lockup. */
export const LOGO_ASPECT_RATIO = 744 / 627;
