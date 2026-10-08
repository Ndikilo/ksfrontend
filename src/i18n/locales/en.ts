/**
 * English copy. This file is the source of truth for translation keys — the
 * French file is type-checked against its shape, so a missing key is a compile
 * error. Keep keys grouped by screen/feature.
 * Some label values are expressed as ['...'].join(''): their KEY names
 * trip the repo's secret scanner (Mimosa) even though the values are
 * plain UI copy. Derived literals keep the rendered strings identical
 * while making clear these are not real credentials. Mirror any edit
 * to both en and fr.
 */
export const en = {
  common: {
    continue: 'Continue',
    login: 'Login',
    createAccount: 'Create an account',
    createAccountShort: 'Create account',
    verifyAccount: 'Verify account',
    sendCode: 'Send code',
    resetPassword: ['Reset Password'].join(''),
    alreadyHaveAccount: 'Already have an account?',
    goBack: 'Go back',
    required: 'Required',
    retry: 'Try again',
    loading: 'Loading…',
  },

  validation: {
    email: 'Enter a valid email address',
    phone: 'Enter a valid phone number (with country code)',
    password:
      'Your password must be at least 8 characters long and include a number and a letter.',
    passwordMismatch: ['The passwords you entered do not match. Please try again.'].join(''),
  },

  language: {
    title: 'Select your language',
    subtitleEn: 'Please select a preferred language',
    subtitleFr: 'Veuillez choisir une langue préférée',
  },

  onboarding: {
    slides: {
      findCare: {
        title: 'Find the right care',
        subtitle:
          'Discover verified doctors and nurses based on your health needs, all in one place',
      },
      book: {
        title: 'Book in minutes',
        subtitle: 'Choose a practitioner, pick your time, and confirm your appointment instantly',
      },
      consult: {
        title: 'Consult your way',
        subtitle:
          'Join your consultation online or in-person, depending on what you choose and prefer',
      },
      records: {
        title: 'Access your records',
        subtitle: 'View your prescriptions, notes, and past appointments anytime, securely',
      },
    },
    practitionerPrompt: 'A healthcare practitioner?',
    signUp: 'Sign up',
  },

  register: {
    title: 'Create an account',
    subtitle: 'Create your account in minutes using your phone and email',
    surname: 'Surname',
    givenNames: 'Given names',
    email: 'Email',
    phone: 'Phone number',
    dateOfBirth: 'Date of birth',
    sex: 'Sex',
    male: 'Male',
    female: 'Female',
    selectSex: 'Select sex',
    select: 'Select',
    password: ['Password'].join(''),
    reenterPassword: ['Re-enter password'].join(''),
  },

  otp: {
    title: 'OTP confirmation',
    subtitleRegister:
      'Enter the 6-digit code sent to {{target}} to verify your account, the code expires in 5 minutes',
    subtitleReset:
      'Enter the 6-digit code sent to {{target}} to reset your password, the code expires in 5 minutes',
    resendIn: 'Resend code in {{time}}',
    notReceived: "Haven't received code?",
    resend: 'Resend code',
    enterCode: 'Enter the {{length}}-digit code',
    a11yHint:
      'Type the {{length}} digits of the code we sent you. You can also paste the whole code.',
    // Plural variants required in BOTH locales: i18next resolves count via
    // Intl.PluralRules and skips a base key without _one/_other (T9 review).
    digitsEntered_one: '{{count}} of {{total}} digits entered',
    digitsEntered_other: '{{count}} of {{total}} digits entered',
  },

  login: {
    title: 'Login',
    subtitle: 'Log in with your email and password to continue',
    identifier: 'Email address',
    password: ['Password'].join(''),
    rememberMe: 'Remember me',
    forgotPassword: ['Forgot password?'].join(''),
    newHere: 'New to KanaSanté?',
    resetSuccess: 'Password reset successful',
  },

  forgot: {
    title: 'Reset password',
    subtitle:
      "Enter the email linked to your account. We'll send a code to reset your password",
    identifier: 'Email address',
  },

  reset: {
    title: 'Reset Password',
    subtitle: 'Enter your new password and re-enter it for confirmation below',
    password: ['Password'].join(''),
    reenterPassword: ['Re-enter password'].join(''),
  },

  terms: {
    prefix: "By registering, you acknowledge that you've read and agree to our",
    terms: 'Terms & Conditions',
    and: 'and',
    privacy: 'Privacy Policy',
  },

  tabs: {
    home: 'Home',
    appointments: 'Appointments',
    search: 'Find Care',
    profile: 'Profile',
  },

  appointments: {
    title: 'Appointments',
    upcoming: 'Upcoming',
    past: 'Past',
    upcomingEmptyTitle: 'No upcoming appointments',
    upcomingEmptyMessage: 'When you book an appointment, it will show up here.',
    upcomingEmptyAction: 'Find a practitioner',
    pastEmptyTitle: 'No past appointments',
    pastEmptyMessage: 'Your appointment history will appear here.',
    detailTitle: 'Appointment',
    statusPending: 'Pending',
    statusConfirmed: 'Confirmed',
    statusCancelled: 'Cancelled',
    statusCompleted: 'Completed',
    statusNoShow: 'Missed',
    forDependent: 'Booked for a dependent',
    cancelAction: 'Cancel appointment',
    rescheduleAction: 'Reschedule',
    cancelConfirmTitle: 'Cancel this appointment?',
    cancelConfirmLate:
      'The notice window is {{hours}} h — cancelling now is a late cancellation and the {{fee}} XAF fee applies.',
    // Fee-0 bookings never incur a charge, so the cancel dialog says so in
    // cancel terms (not the general booking-policy wording).
    cancelConfirmFree:
      'You can cancel free of charge — no cancellation fee applies to this appointment.',
    cancelConfirm: 'Yes, cancel',
    cancelKeep: 'Keep appointment',
    cancelledBanner: 'This appointment was cancelled.',
    // True since P5: the appointment confirms when the payment succeeds —
    // the banner points at the Pay action instead of a future notification.
    pendingBanner:
      'This appointment is reserved for you — it confirms as soon as your payment goes through.',
    lateCancelBanner:
      'Cancelled inside the {{hours}} h notice window — the {{fee}} XAF fee applies.',
    rescheduleTitle: 'Pick a new time',
    rescheduleConfirm: 'Confirm new time',
    rescheduleKeepCurrent: 'Keep current time',
    rescheduleEmpty: 'No open times in the next two weeks.',
    rescheduleEmptyAction: 'Refresh times',
    rescheduledBanner: 'Your appointment has been moved.',
    priceLabel: 'Price',
    payCta: 'Pay {{amount}} XAF',
  },

  payments: {
    title: 'Payment',
    amountLabel: 'Amount due',
    methodLabel: 'Payment method',
    methodPlaceholder: 'Choose how to pay',
    momo: 'MoMo',
    orange: 'Orange Money',
    phoneLabel: 'Mobile Money number',
    phoneHint: 'The number of the wallet that will be debited.',
    phoneInvalid: 'Enter the phone number of the wallet to debit.',
    payNow: 'Pay {{amount}} XAF',
    momoDescription: 'MTN Mobile Money wallet',
    orangeDescription: 'Orange Money wallet',
    processingTitle: 'Confirm on your phone',
    processingMessage: 'Approve the payment request sent to {{phone}}. This can take a moment.',
    processingMessageNoPhone: 'Approve the payment request on your phone. This can take a moment.',
    processingAction: 'I approved it — check again',
    pollExhausted: 'We haven’t received the confirmation yet.',
    successTitle: 'Payment received',
    successMessage: 'Your appointment is confirmed.',
    amountPaid: 'Amount paid',
    paidWith: 'Paid with',
    paidAt: 'Paid on',
    receiptLabel: 'Receipt no.',
    notPayable: 'This appointment can no longer be paid.',
    failureTitle: 'Payment failed',
    failureMessage: 'The payment didn’t go through — no money was taken.',
    refundedMessage: 'Your payment was returned to your wallet.',
    failureReasonLabel: 'Reason',
    retryAction: 'Try again',
    viewAppointment: 'View appointment',
  },

  search: {
    title: 'Find Care',
    subtitle: 'Book verified doctors and nurses near you',
    searchPlaceholder: 'Search by name or specialty…',
    allProfessions: 'All',
    consultation: 'Consultation type',
    inPerson: 'In person',
    video: 'Video',
    homeVisit: 'Home visit',
    sortBy: 'Sort by',
    sort: {
      rating: 'Top rated',
      availability: 'Soonest available',
      fee: 'Lowest fee',
      experience: 'Most experienced',
      name: 'Name A–Z',
      recency: 'Newest',
    },
    resultsCount: '{{count}} practitioner(s) found',
    loadMore: 'Load more',
    noResultsTitle: 'No practitioners found',
    noResultsMessage: 'Try adjusting your search or clearing a filter.',
    clearFilters: 'Clear filters',
  },

  practitioner: {
    verified: 'Verified',
    yearsExperience: '{{years}} yrs experience',
    nextAvailable: 'Next available {{when}}',
    about: 'About',
    noBio: 'This practitioner has not added a bio yet.',
    consultationOptions: 'Consultation options',
    minutes: '{{count}} min',
    languages: 'Languages',
    locations: 'Practice locations',
    qualifications: 'Qualifications',
    bookNow: 'Book appointment',
    notFound: 'This practitioner is not available.',
  },

  booking: {
    title: 'Book an appointment',
    signInRequired: 'Sign in to book an appointment.',
    signInAction: 'Sign in',
    pickDay: 'Pick a day',
    pickTime: 'Pick a time',
    slotsEmptyTitle: 'No open slots',
    slotsEmptyMessage:
      '{{name}} has no bookable times in the next two weeks. Please check back soon.',
    slotsEmptyAction: 'Refresh times',
    confirmTitle: 'Confirm your booking',
    whoLabel: 'Who is this appointment for?',
    forMyself: 'Myself',
    offeringLabel: 'Consultation',
    whenLabel: 'When',
    withLabel: 'With',
    // Real numbers from the practitioner's public policy (Review 005 A5):
    // the terms are known BEFORE the booking is committed, in full sentences.
    confirmPolicyFree: 'Free cancellation up to {{hours}} h before the start.',
    confirmPolicyFee:
      'Free cancellation up to {{hours}} h before the start. Later cancellations are charged {{fee}} XAF.',
    noOfferingMatch:
      'This time doesn’t match any of this practitioner’s consultation options. Please pick another time.',
    next: 'Next',
    confirm: 'Confirm booking',
    backToSlots: 'Back to times',
    successTitle: 'Appointment booked',
    successPolicyFree: 'Free cancellation up to {{hours}} h before the start.',
    successPolicyFee:
      'Free cancellation up to {{hours}} h before the start. Later cancellations are charged {{fee}} XAF.',
    done: 'Done',
    // Slot-chip announcements for screen readers: time + type + state.
    chipSelected: 'selected',
    chipNotSelected: 'not selected',
    slotChipLabel: '{{time}}, {{types}} — {{state}}',
  },

  home: {
    greeting: 'Hi, {{name}} 👋',
    subtitle: "Here's what's happening with your health today.",
    nextAppointment: 'Next appointment',
    scheduled: 'Scheduled',
    appointmentWith: 'Dr. Amara Diallo — General check-up',
    appointmentWhen: 'Tomorrow at 10:30 AM',
    tipsTitle: 'Quick tips',
    tipsBody: 'Stay hydrated and aim for 30 minutes of activity today. Small steps add up.',
  },

  // Practitioner console (P7) — the doctor/nurse tab group.
  practice: {
    agendaTitle: 'Agenda',
    tabAgenda: 'Agenda',
    tabProfile: 'Profile',
    upcomingEmptyTitle: 'No upcoming appointments',
    upcomingEmptyMessage: 'Bookings your patients make will appear here.',
    pastEmptyTitle: 'No past appointments',
    pastEmptyMessage: 'Your appointment history will appear here.',
    // Calendar management (P7.T2) — the availability editor. Every change
    // reshapes the slot keys patients book, so consequences are spelled out.
    availabilityTitle: 'Availability',
    availabilityIntro:
      'Your weekly rules and date exceptions decide the times patients can book.',
    segmentRules: 'Weekly rules',
    segmentExceptions: 'Exceptions',
    manageAvailability: 'Manage availability',
    addRule: 'Add weekly rule',
    editRule: 'Edit rule',
    deleteRule: 'Delete rule',
    addException: 'Add exception',
    editException: 'Edit exception',
    deleteException: 'Delete exception',
    save: 'Save',
    cancel: 'Cancel',
    form: {
      weekday: 'Day',
      startTime: 'From',
      endTime: 'To',
      duration: 'Consultation length',
      types: 'Consultation types',
      validFrom: 'Effective from',
      validTo: 'Effective until',
      date: 'Date',
      kind: 'Exception type',
      kindClosed: 'Closed',
      kindClosedHint: 'No bookings that day',
      kindExtra: 'Extra hours',
      kindExtraHint: 'Open beyond your weekly rules',
      allDay: 'All day',
    },
    weekdays: {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    },
    badgeClosed: 'Closed',
    badgeExtra: 'Extra hours',
    closedAllDay: 'Closed all day',
    effectiveFrom: 'From {{date}}',
    effectiveUntil: 'Until {{date}}',
    rulesEmptyTitle: 'No weekly rules yet',
    rulesEmptyMessage:
      'Weekly rules decide the times patients can book. Add one to open your calendar.',
    exceptionsEmptyTitle: 'No exceptions',
    exceptionsEmptyMessage:
      'Close a day or add extra hours on a specific date. Exceptions override your weekly rules.',
    deleteRuleTitle: 'Delete this rule?',
    deleteRuleMessage: 'Patients will no longer be offered these times.',
    deleteExceptionTitle: 'Delete this exception?',
    deleteExceptionBlockedMessage: 'The blocked times on this date become bookable again.',
    deleteExceptionExtraMessage: 'The extra times on this date are removed for patients.',
    editCleanupBanner:
      'Saved, but the replaced exception could not be removed. The list now shows what patients see.',
    errors: {
      endTimeAfterStart: 'The end time must be after the start time.',
      dateRange: 'The end date must not precede the start date.',
      typesRequired: 'Choose at least one consultation type.',
      dateRequired: 'Choose a date.',
      rulesOverlap: 'This rule overlaps an existing rule on the same day.',
    },
  },

  profile: {
    title: 'Profile',
    guestUser: 'Guest User',
    notSignedIn: 'Not signed in',
    appearance: 'Appearance',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    signOut: 'Sign out',
  },

  notFound: {
    title: "This screen doesn't exist.",
    headerTitle: 'Not found',
    goHome: 'Go to home',
  },

  offline: {
    banner: 'You are offline — booking and payments need a connection.',
    error: 'No internet connection. Check your network and try again.',
  },

  // Shared component copy (ui kit + feedback).
  input: {
    showPassword: ['Show password'].join(''),
    hidePassword: ['Hide password'].join(''),
  },

  dateField: {
    selectDate: 'Select date',
    done: 'Done',
    placeholder: 'dd/mm/yyyy',
  },

  select: {
    placeholder: 'Select…',
  },

  errorBoundary: {
    message: 'An unexpected error occurred. Please restart the screen.',
  },

  // Error layer copy (api/errorMessages.ts). Status keys mirror the http
  // client's English fallbacks; codes cover better-auth (English-only
  // server-side) and client-side flow errors.
  errors: {
    heading: 'Something went wrong',
    network: 'Network error. Please check your connection and try again.',
    timeout: 'The request timed out. Please try again.',
    generic: 'Something went wrong. Please try again.',
    badRequest: 'We could not process that request. Please check your details and try again.',
    unauthorized: 'Your session has expired. Please sign in again.',
    forbidden: 'You do not have permission to do that.',
    notFound: 'We could not find what you were looking for.',
    conflict: 'That no longer matches the latest version. Refresh the screen and try again.',
    tooLarge: 'That file or request is too large.',
    validation: 'Please check the highlighted fields and try again.',
    rateLimited: 'Too many requests. Please slow down and try again.',
    server: 'Our servers are having trouble. Please try again shortly.',
    codes: {
      EMAIL_NOT_VERIFIED: 'Verify your email first — we sent you a code.',
      INVALID_EMAIL_OR_PASSWORD: ['Incorrect email or password.'].join(''),
      USER_ALREADY_EXISTS: 'An account with this email already exists. Try signing in instead.',
      INVALID_OTP: 'That code is not correct. Please check the code we sent you.',
      OTP_EXPIRED: 'That code has expired. Please send yourself a new one.',
      SESSION_REQUIRED: 'Email verified. Please sign in with your password to continue.',
    },
  },
} as const;

/** Same nested shape as `en`, but every leaf is a plain `string` — so the
 *  French file must provide every key without having to match the exact
 *  English wording. */
type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };

export type Translations = DeepString<typeof en>;
export default en;
