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
    login: 'Sign in',
    createAccount: 'Create an account',
    createAccountShort: 'Create account',
    verifyAccount: 'Verify account',
    sendCode: 'Send code',
    resetPassword: ['Reset password'].join(''),
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
        subtitle: 'Discover verified doctors and nurses based on your health needs.',
      },
      book: {
        title: 'Book in minutes',
        subtitle: 'Choose a practitioner, pick your time, and confirm your appointment.',
      },
      consult: {
        title: 'Consult your way',
        subtitle: 'Join your consultation online or in person, whichever you prefer.',
      },
      records: {
        title: 'Access your records',
        subtitle: 'View your prescriptions, notes, and past appointments anytime, securely.',
      },
    },
    practitionerPrompt: 'Are you a practitioner? Create an account, then join from your profile.',
    signUp: 'Sign up',
  },

  register: {
    title: 'Create an account',
    subtitle: 'Create your account in minutes using your phone and email.',
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

  // Phone-number registration (P8.T6) — signup entry from the register form,
  // attach entry from the profile tab. The backend delivers the OTP via SMS
  // first, falls back to email, and only ever returns `devCode` in sandbox/dev
  // mode (never in prod/staging) — the sandbox banner renders from that.
  phoneAuth: {
    entryPrompt: 'Prefer to use your phone?',
    entryAction: 'Continue with phone number',
    titleSignup: 'Sign up with your phone',
    subtitleSignup:
      'We text you a 6-digit code to verify your number, then set up your account.',
    titleAttach: 'Add a phone number',
    subtitleAttach: 'We text a 6-digit code to confirm this number belongs to you.',
    phoneInvalid: 'Enter a valid Cameroon number, e.g. 670123456 or +237670123456.',
    emailHint: 'If SMS can’t reach this number, the code is sent to this email instead.',
    codeSentTo: 'Enter the 6-digit code sent to {{target}}',
    sentByEmail:
      'SMS isn’t available for this number right now, so we sent the code to {{target}} instead.',
    devCode: 'Sandbox: your code is {{code}}',
    locked:
      'Too many incorrect codes. This number is locked for {{minutes}} minutes — please try again later.',
    emailFallbackPrompt: 'Can’t receive texts right now?',
    emailFallbackAction: 'Sign up with email instead',
    signInNotice: 'Your account is ready. Sign in with your email and password.',
    attachSuccess: 'Your phone number has been verified.',
  },

  otp: {
    title: 'OTP confirmation',
    subtitleRegister:
      'Enter the 6-digit code sent to {{target}} to verify your account. The code expires in 5 minutes.',
    subtitleReset:
      'Enter the 6-digit code sent to {{target}} to reset your password. The code expires in 5 minutes.',
    resendIn: 'Resend code in {{time}}',
    notReceived: "Didn't receive the code?",
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
    title: 'Sign in',
    subtitle: 'Sign in with your email and password to continue.',
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
      "Enter the email linked to your account. We'll send a code to reset your password.",
    identifier: 'Email address',
  },

  reset: {
    title: 'Reset password',
    subtitle: 'Enter your new password and re-enter it for confirmation below.',
    password: ['Password'].join(''),
    reenterPassword: ['Re-enter password'].join(''),
  },

  terms: {
    unavailable: 'This document is currently unavailable. Please try again later.',
    prefix: "By registering, you acknowledge that you've read and agree to our",
    terms: 'Terms & Conditions',
    and: 'and',
    privacy: 'Privacy Policy',
  },

  tabs: {
    home: 'Home',
    appointments: 'Appointments',
    chats: 'Chats',
    healthRecord: 'Health record',
    account: 'Account',
  },

  // P8.T4 placeholder tabs — present in the bottom nav, clearly not built
  // yet, with no affordance that could pretend to work.
  placeholders: {
    comingSoon: 'Coming soon',
    chatsTitle: 'Chats',
    // Message-led empty state (Review 014 MINOR-7): the screen title stays in
    // the header — the empty state carries its own distinct line + explanation.
    chatsEmptyTitle: 'Messaging opens soon',
    chatsMessage:
      'Conversations with the practitioners you book will live here. We will let you know as soon as it opens.',
    healthRecordTitle: 'Health record',
    healthRecordEmptyTitle: 'Your records are on their way',
    healthRecordMessage:
      'Prescriptions, documents and visit history will be gathered here once it opens.',
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
    title: 'Find care',
    subtitle: 'Book verified doctors and nurses near you.',
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
    // Plural variants in BOTH locales (same convention as otp.digitsEntered):
    // a parenthetical "practitioner(s)" is programmer slop in user copy.
    resultsCount_one: '{{count}} practitioner found',
    resultsCount_other: '{{count}} practitioners found',
    loadMore: 'Load more',
    noResultsTitle: 'No practitioners found',
    noResultsMessage: 'Try adjusting your search or clearing a filter.',
    clearFilters: 'Clear filters',
  },

  practitioner: {
    verified: 'Verified',
    // Row announcement for discovery cards — the name leads (standard §2).
    cardA11yLabel: '{{name}}, {{profession}}',
    yearsExperience: '{{years}} yrs experience',
    nextAvailable: 'Next available {{when}}',
    about: 'About',
    noBio: 'This practitioner has not added a bio yet.',
    consultationOptions: 'Consultation options',
    minutes: '{{count}} min',
    feeFrom: 'From {{amount}} XAF',
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

  // Homepage (P8). Copy is product-specific on purpose: the core persona
  // books across timezones for dependents back home. The wave emoji is the
  // sanctioned greeting exception (standard §3).
  home: {
    greetingMorning: 'Good morning, {{name}} 👋',
    greetingAfternoon: 'Good afternoon, {{name}} 👋',
    greetingEvening: 'Good evening, {{name}} 👋',
    greetingMorningNameless: 'Good morning 👋',
    greetingAfternoonNameless: 'Good afternoon 👋',
    greetingEveningNameless: 'Good evening 👋',
    subtitle: 'Book verified doctors and nurses — for you or your family back home.',
    searchPlaceholder: 'Find a doctor, nurse or specialty…',
    searchAction: 'Search for a practitioner',
    categoriesTitle: 'Browse by category',
    categories: {
      doctors: 'Doctors',
      nurses: 'Nurses',
      cardiologist: 'Cardiologist',
      dentists: 'Dentists',
    },
    nearby: {
      // Honest header: the "near you" claim renders ONLY when distance
      // sorting is actually in effect (device fix granted); without a
      // location basis the list is the top-rated directory; with a city it
      // says so.
      titleNear: 'Doctors near you',
      titleRated: 'Top-rated doctors',
      titleCity: 'Doctors in {{city}}',
      // Contextual permission ask (P8.T3): a deliberate tap next to "See
      // all" — never a cold-launch prompt.
      nearMe: 'Near me',
      seeAll: 'See all',
      emptyTitle: 'No practitioners yet',
      emptyMessage: 'Verified practitioners will appear here as they join KanaSanté.',
      browseAll: 'Browse all practitioners',
      refetchFailed: 'Could not refresh — the list shown is the last one loaded.',
    },
    tips: {
      title: 'Health tips',
      sugarTitle: 'How much sugar is okay?',
      sugarBody:
        'Sugary drinks are the easiest place to cut back: keeping them for special occasions protects teeth and steady energy — for you and the children you care for.',
      sleepTitle: 'Want to sleep better?',
      sleepBody:
        'A steady bedtime — weekends included — and screens set aside an hour before make falling asleep easier. Persistent tiredness deserves a consultation.',
      sodaTitle: 'Should soda be a daily drink?',
      sodaBody:
        'Water covers everyday thirst — soda is a treat, not a staple. Swapping one daily soda for water already removes a large share of your added sugar.',
    },
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
    // Incoming requests (P7.T3) — the pending segment and its decisions.
    segmentRequests: 'Requests',
    segmentDay: 'Day',
    pendingEmptyTitle: 'No new requests',
    pendingEmptyMessage: 'Booking requests from your patients will appear here for you to confirm.',
    confirmRequest: 'Confirm',
    declineRequest: 'Decline',
    declineConfirmTitle: 'Decline this request?',
    declineConfirmMessage:
      'The patient will be told this time is no longer available and the slot reopens for booking.',
    declineKeepAction: 'Keep request',
    todayLabel: 'Today',
    dayPrev: 'Previous day',
    dayNext: 'Next day',
    dayEmptyTitle: 'No appointments on {{date}}',
    dayEmptyMessage: 'Nothing is booked for this day yet.',
    nowLabel: 'Now · {{time}}',
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
    // A confirm/decline that did not land (P7.T3). The 409 codes say the
    // appointment moved under us — the list refetches so the practitioner
    // acts on the real state, not the stale one.
    requestErrors: {
      actionFailed: 'This request could not be updated. Please try again.',
      stateConflict:
        'This request has changed — the patient may have cancelled it. The list shows the current state.',
      started: 'The requested time has already started. The list shows the current state.',
    },
    // Verification & credentials (P7.T4). The copy reflects what the backend
    // actually enforces: only VERIFIED practitioners are publicly listable or
    // bookable, while availability and the public profile stay editable at
    // every status (profile.routes description + availability guards).
    verification: {
      cardTitle: 'Verification',
      statusIncomplete: 'Action needed',
      statusPending: 'Under review',
      statusVerified: 'Verified',
      statusRejected: 'Not approved',
      formIntro:
        'Your Cameroon Medical Council registration, national ID and profile photo prove who you are. Patients can book you once an administrator approves them.',
      rejectedIntro:
        'Your last submission was not approved. Update your documents below and send them again.',
      reasonLabel: 'Reason given',
      cmcLabel: 'Cameroon Medical Council number',
      cmcPlaceholder: 'e.g. CMC-2024-01234',
      nicLabel: 'National ID card number',
      nicPlaceholder: 'e.g. 123456789',
      docsTitle: 'Supporting documents',
      docCmc: 'CMC registration certificate',
      docCmcHint: 'PDF or Word, up to 25 MB',
      docNic: 'National ID card copy',
      docNicHint: 'PDF or Word, up to 25 MB',
      docPhoto: 'Profile photo',
      docPhotoHint: 'JPEG or PNG, up to 25 MB',
      addFile: 'Choose file',
      uploading: 'Uploading…',
      uploadDone: 'Uploaded',
      uploadFailed: 'Upload failed.',
      retryUpload: 'Retry upload',
      removeFile: 'Remove file',
      fileTooLarge: 'That file is larger than 25 MB. Choose a smaller one.',
      fileTypeUnsupported: 'That file type is not supported here.',
      // Blocked-submit copy names the ACTUAL missing set (Review 013): the
      // fragments are joined with the locale's conjunction via Intl.ListFormat.
      missingCmcNumber: 'your Cameroon Medical Council number',
      missingNicNumber: 'your national ID card number',
      missingDocCmc: 'the CMC registration certificate',
      missingDocNic: 'the national ID card copy',
      missingDocPhoto: 'the profile photo',
      nothingSelected: 'Add {{missing}} to submit for verification.',
      submitCredentials: 'Submit for verification',
      pendingTitle: 'Your credentials are under review',
      pendingBody:
        'An administrator is checking your documents, usually within a few days. Patients cannot find or book you yet — we will notify you as soon as a decision is made.',
      pendingSince: 'Submitted on {{date}}',
      pendingEditNote:
        'You can keep editing your public profile and availability while you wait.',
      rejectedTitle: 'Your credentials were not approved',
      // Standalone copy (Review 013): this body also renders when the form is
      // hidden, so it must not say "below".
      rejectedBody: 'Update your documents and numbers, then send them again.',
      resubmit: 'Update and re-submit',
      verifiedBody: 'Patients can find and book you.',
      notRegisteredTitle: 'Practitioner profile missing',
      notRegisteredBody: 'Finish your practitioner registration to set up verification.',
      notRegisteredAction: 'Complete registration',
      refreshFailed:
        'Your verification status could not be refreshed — what you see below may be out of date.',
    },
    // The agenda-level banner while the profile is not verified yet. The
    // wording reflects the real backend rules: unverified practitioners are
    // invisible to patients (public detail 404s) but may keep editing their
    // calendar and public profile.
    verificationBanner: {
      incomplete:
        'Finish setting up your profile — patients cannot find or book you until your credentials are approved.',
      pending:
        'Your credentials are under review. Patients cannot find or book you until they are approved — your calendar and profile stay editable.',
      rejected:
        'Your credentials were not approved. Open the Profile tab to see the reason and send them again.',
    },
  },

  // Practitioner registration (P7.T4) — step 1 of onboarding, reached from the
  // patient Profile tab; the role grant routes the console on completion.
  practitionerRegister: {
    title: 'Join as a practitioner',
    subtitle:
      'Create your practitioner profile. Patients can find and book you once your documents are approved.',
    roleLabel: 'You are registering as',
    roleDoctor: 'Doctor',
    roleNurse: 'Nurse',
    professionLabel: 'Profession',
    surname: 'Surname',
    givenNames: 'Given names',
    locationLabel: 'City / region (optional)',
    locationPlaceholder: 'e.g. Douala',
    submit: 'Create practitioner profile',
    professionsFailed: 'The professions list could not be loaded.',
    entry: 'Join as a practitioner',
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
    addPhone: 'Add a phone number',
    deleteAccount: 'Delete my account',
    deleteAccountConfirmTitle: 'Delete your account?',
    deleteAccountConfirmMessage:
      'This permanently erases your profile, your booking history, the people you care for, and — for practitioners — your practice profile and uploaded documents. This cannot be undone.',
    deleteAccountAction: 'Delete permanently',
    cancel: 'Cancel',
    deleteAccountFailed:
      'Your account could not be deleted. Check your connection and try again.',
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

  demoMode: {
    banner: ['DEMO MODE — codes are not validated; nothing here reaches a real backend.'].join(''),
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
      // Phone-OTP registration (P8.T6) — stable /v1 codes; screens may render
      // richer parameterized copy, these are the honest fallbacks.
      OTP_INVALID: 'That code is not correct. Please check the code we sent you.',
      OTP_ALREADY_USED: 'That code has already been used. Please request a new one.',
      OTP_LOCKED: 'Too many incorrect codes. This number is locked for 15 minutes.',
      OTP_SEND_THROTTLED:
        'Too many codes have been sent. Please wait a few minutes before trying again.',
      OTP_RESEND_COOLDOWN: 'Please wait a minute before requesting another code.',
      OTP_DELIVERY_UNAVAILABLE:
        'We couldn’t send a code — message delivery isn’t available right now.',
      PHONE_ALREADY_VERIFIED:
        'This number is already verified on another account. Try signing in instead.',
      PHONE_FLOW_EXPIRED: 'This sign-up session ended for your security. Please start again.',
    },
  },
} as const;

/** Same nested shape as `en`, but every leaf is a plain `string` — so the
 *  French file must provide every key without having to match the exact
 *  English wording. */
type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };

export type Translations = DeepString<typeof en>;
export default en;
