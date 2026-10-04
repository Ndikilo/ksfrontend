import type { Translations } from './en';

/** French copy — typed against the English shape so no key can be missed. */
export const fr: Translations = {
  common: {
    continue: 'Continuer',
    login: 'Se connecter',
    createAccount: 'Créer un compte',
    createAccountShort: 'Créer un compte',
    verifyAccount: 'Vérifier le compte',
    sendCode: 'Envoyer le code',
    resetPassword: 'Réinitialiser le mot de passe',
    alreadyHaveAccount: 'Vous avez déjà un compte ?',
    goBack: 'Retour',
    required: 'Requis',
    retry: 'Réessayer',
    loading: 'Chargement…',
  },

  validation: {
    email: 'Saisissez une adresse e-mail valide',
    phone: 'Saisissez un numéro de téléphone valide (avec indicatif pays)',
    password:
      'Votre mot de passe doit comporter au moins 8 caractères et inclure un chiffre et une lettre.',
    passwordMismatch: 'Les mots de passe saisis ne correspondent pas. Veuillez réessayer.',
  },

  language: {
    title: 'Choisissez votre langue',
    subtitleEn: 'Please select a preferred language',
    subtitleFr: 'Veuillez choisir une langue préférée',
  },

  onboarding: {
    slides: {
      findCare: {
        title: 'Trouvez les bons soins',
        subtitle:
          'Découvrez des médecins et infirmiers vérifiés selon vos besoins de santé, au même endroit',
      },
      book: {
        title: 'Réservez en quelques minutes',
        subtitle:
          'Choisissez un praticien, sélectionnez votre horaire et confirmez votre rendez-vous instantanément',
      },
      consult: {
        title: 'Consultez à votre façon',
        subtitle:
          'Participez à votre consultation en ligne ou en personne, selon votre choix et votre préférence',
      },
      records: {
        title: 'Accédez à vos dossiers',
        subtitle:
          'Consultez vos ordonnances, notes et rendez-vous passés à tout moment, en toute sécurité',
      },
    },
    practitionerPrompt: 'Un professionnel de santé ?',
    signUp: "S'inscrire",
  },

  register: {
    title: 'Créer un compte',
    subtitle: 'Créez votre compte en quelques minutes avec votre téléphone et votre e-mail',
    surname: 'Nom',
    givenNames: 'Prénoms',
    email: 'E-mail',
    phone: 'Numéro de téléphone',
    dateOfBirth: 'Date de naissance',
    sex: 'Sexe',
    male: 'Homme',
    female: 'Femme',
    selectSex: 'Sélectionnez le sexe',
    select: 'Sélectionner',
    password: 'Mot de passe',
    reenterPassword: 'Confirmez le mot de passe',
  },

  otp: {
    title: 'Confirmation OTP',
    subtitleRegister:
      'Saisissez le code à 6 chiffres envoyé au {{target}} pour vérifier votre compte, le code expire dans 5 minutes',
    subtitleReset:
      'Saisissez le code à 6 chiffres envoyé au {{target}} pour réinitialiser votre mot de passe, le code expire dans 5 minutes',
    resendIn: 'Renvoyer le code dans {{time}}',
    notReceived: "Vous n'avez pas reçu le code ?",
    resend: 'Renvoyer le code',
    enterCode: 'Saisissez le code à {{length}} chiffres',
    a11yHint:
      'Tapez les {{length}} chiffres du code qui vous a été envoyé. Vous pouvez aussi coller le code entier.',
    // Variantes de pluriel requises dans les DEUX locales : i18next résout
    // count via Intl.PluralRules et ignore la clé de base sans _one/_other.
    digitsEntered_one: '{{count}} chiffre saisi sur {{total}}',
    digitsEntered_other: '{{count}} chiffres saisis sur {{total}}',
  },

  login: {
    title: 'Connexion',
    subtitle: 'Connectez-vous avec votre e-mail et votre mot de passe pour continuer',
    identifier: 'Adresse e-mail',
    password: 'Mot de passe',
    rememberMe: 'Se souvenir de moi',
    forgotPassword: 'Mot de passe oublié ?',
    newHere: 'Nouveau sur KanaSanté ?',
    resetSuccess: 'Réinitialisation du mot de passe réussie',
  },

  forgot: {
    title: 'Réinitialiser le mot de passe',
    subtitle:
      "Saisissez l'e-mail lié à votre compte. Nous enverrons un code pour réinitialiser votre mot de passe",
    identifier: 'Adresse e-mail',
  },

  reset: {
    title: 'Réinitialiser le mot de passe',
    subtitle: 'Saisissez votre nouveau mot de passe et confirmez-le ci-dessous',
    password: 'Mot de passe',
    reenterPassword: 'Confirmez le mot de passe',
  },

  terms: {
    prefix: 'En vous inscrivant, vous reconnaissez avoir lu et accepté nos',
    terms: 'Conditions générales',
    and: 'et',
    privacy: 'Politique de confidentialité',
  },

  tabs: {
    home: 'Accueil',
    appointments: 'Rendez-vous',
    search: 'Trouver soins',
    profile: 'Profil',
  },

  appointments: {
    title: 'Rendez-vous',
    upcoming: 'À venir',
    past: 'Passés',
    upcomingEmptyTitle: 'Aucun rendez-vous à venir',
    upcomingEmptyMessage: 'Vos prochains rendez-vous apparaîtront ici.',
    upcomingEmptyAction: 'Trouver un praticien',
    pastEmptyTitle: 'Aucun rendez-vous passé',
    pastEmptyMessage: 'L’historique de vos rendez-vous apparaîtra ici.',
    detailTitle: 'Rendez-vous',
    statusPending: 'En attente',
    statusConfirmed: 'Confirmé',
    statusCancelled: 'Annulé',
    statusCompleted: 'Terminé',
    statusNoShow: 'Manqué',
    forDependent: 'Réservé pour un proche',
    cancelAction: 'Annuler le rendez-vous',
    rescheduleAction: 'Déplacer',
    cancelConfirmTitle: 'Annuler ce rendez-vous ?',
    cancelConfirmLate:
      'Le délai de préavis est de {{hours}} h — annuler maintenant constitue une annulation tardive et des frais de {{fee}} XAF s’appliquent.',
    // Réservations sans frais : l’annulation est toujours gratuite (termes
    // d’annulation, pas la formulation générale de la politique de réservation).
    cancelConfirmFree:
      'Vous pouvez annuler gratuitement — aucun frais d’annulation ne s’applique à ce rendez-vous.',
    cancelConfirm: 'Oui, annuler',
    cancelKeep: 'Garder le rendez-vous',
    cancelledBanner: 'Ce rendez-vous a été annulé.',
    // Vrai depuis P5 : le rendez-vous est confirmé dès que le paiement
    // aboutit — le bandeau pointe vers l’action Payer, pas une notification.
    pendingBanner:
      'Ce rendez-vous vous est réservé — il sera confirmé dès que votre paiement aboutira.',
    lateCancelBanner:
      'Annulé dans le délai de {{hours}} h — des frais de {{fee}} XAF s’appliquent.',
    rescheduleTitle: 'Choisissez un nouvel horaire',
    rescheduleConfirm: 'Confirmer le nouvel horaire',
    rescheduleKeepCurrent: 'Garder l’horaire actuel',
    rescheduleEmpty: 'Aucun créneau libre dans les deux prochaines semaines.',
    rescheduleEmptyAction: 'Actualiser les horaires',
    rescheduledBanner: 'Votre rendez-vous a été déplacé.',
    priceLabel: 'Prix',
    payCta: 'Payer {{amount}} XAF',
  },

  payments: {
    title: 'Paiement',
    amountLabel: 'Montant à payer',
    methodLabel: 'Moyen de paiement',
    methodPlaceholder: 'Choisissez votre moyen de paiement',
    momo: 'MoMo',
    orange: 'Orange Money',
    phoneLabel: 'Numéro Mobile Money',
    phoneHint: 'Le numéro du portefeuille qui sera débité.',
    phoneInvalid: 'Saisissez le numéro du portefeuille à débiter.',
    payNow: 'Payer {{amount}} XAF',
    momoDescription: 'Portefeuille MTN Mobile Money',
    orangeDescription: 'Portefeuille Orange Money',
    processingTitle: 'Confirmez sur votre téléphone',
    processingMessage: 'Validez la demande de paiement envoyée au {{phone}}. Cela peut prendre un instant.',
    processingMessageNoPhone: 'Validez la demande de paiement sur votre téléphone. Cela peut prendre un instant.',
    processingAction: 'C’est validé — revérifier',
    pollExhausted: 'Nous n’avons pas encore reçu la confirmation.',
    successTitle: 'Paiement reçu',
    successMessage: 'Votre rendez-vous est confirmé.',
    amountPaid: 'Montant payé',
    paidWith: 'Payé avec',
    paidAt: 'Payé le',
    receiptLabel: 'N° de reçu',
    notPayable: 'Ce rendez-vous ne peut plus être payé.',
    failureTitle: 'Échec du paiement',
    failureMessage: 'Le paiement n’a pas abouti — aucun montant n’a été débité.',
    refundedMessage: 'Votre paiement a été retourné sur votre portefeuille.',
    failureReasonLabel: 'Raison',
    retryAction: 'Réessayer',
    viewAppointment: 'Voir le rendez-vous',
  },

  search: {
    title: 'Trouver des soins',
    subtitle: 'Réservez des médecins et infirmiers vérifiés près de chez vous',
    searchPlaceholder: 'Rechercher par nom ou spécialité…',
    allProfessions: 'Tous',
    consultation: 'Type de consultation',
    inPerson: 'En personne',
    video: 'Vidéo',
    homeVisit: 'À domicile',
    sortBy: 'Trier par',
    sort: {
      rating: 'Mieux notés',
      availability: 'Disponibles bientôt',
      fee: 'Tarif le plus bas',
      experience: 'Les plus expérimentés',
      name: 'Nom A–Z',
      recency: 'Nouveautés',
    },
    resultsCount: '{{count}} praticien(s) trouvé(s)',
    loadMore: 'Charger plus',
    noResultsTitle: 'Aucun praticien trouvé',
    noResultsMessage: 'Essayez de modifier votre recherche ou de retirer un filtre.',
    clearFilters: 'Réinitialiser les filtres',
  },

  practitioner: {
    verified: 'Vérifié',
    yearsExperience: '{{years}} ans d’expérience',
    nextAvailable: 'Prochaine dispo {{when}}',
    about: 'À propos',
    noBio: 'Ce praticien n’a pas encore ajouté de présentation.',
    consultationOptions: 'Options de consultation',
    minutes: '{{count}} min',
    languages: 'Langues',
    locations: 'Lieux de pratique',
    qualifications: 'Diplômes et qualifications',
    bookNow: 'Prendre rendez-vous',
    notFound: 'Ce praticien n’est pas disponible.',
  },

  booking: {
    title: 'Prendre un rendez-vous',
    signInRequired: 'Connectez-vous pour réserver un rendez-vous.',
    signInAction: 'Se connecter',
    pickDay: 'Choisissez un jour',
    pickTime: 'Choisissez un horaire',
    slotsEmptyTitle: 'Aucun créneau libre',
    slotsEmptyMessage:
      '{{name}} n’a pas de créneau réservable dans les deux prochaines semaines. Revenez bientôt.',
    slotsEmptyAction: 'Actualiser les horaires',
    confirmTitle: 'Confirmez votre réservation',
    whoLabel: 'Pour qui est ce rendez-vous ?',
    forMyself: 'Pour moi',
    offeringLabel: 'Consultation',
    whenLabel: 'Quand',
    withLabel: 'Avec',
    // Chiffres réels de la politique publique du praticien (Review 005 A5) :
    // les conditions sont connues AVANT la réservation, en phrases complètes.
    confirmPolicyFree: 'Annulation gratuite jusqu’à {{hours}} h avant le début.',
    confirmPolicyFee:
      'Annulation gratuite jusqu’à {{hours}} h avant le début. Au-delà, les annulations sont facturées {{fee}} XAF.',
    noOfferingMatch:
      'Cet horaire ne correspond à aucune des consultations proposées par ce praticien. Choisissez un autre horaire.',
    next: 'Suivant',
    confirm: 'Confirmer le rendez-vous',
    backToSlots: 'Retour aux horaires',
    successTitle: 'Rendez-vous réservé',
    successPolicyFree: 'Annulation gratuite jusqu’à {{hours}} h avant le début.',
    successPolicyFee:
      'Annulation gratuite jusqu’à {{hours}} h avant le début. Au-delà, les annulations sont facturées {{fee}} XAF.',
    done: 'Terminé',
    // Annonces des créneaux pour les lecteurs d’écran : heure + type + état.
    chipSelected: 'sélectionné',
    chipNotSelected: 'non sélectionné',
    slotChipLabel: '{{time}}, {{types}} — {{state}}',
  },

  home: {
    greeting: 'Bonjour, {{name}} 👋',
    subtitle: "Voici ce qui se passe pour votre santé aujourd'hui.",
    nextAppointment: 'Prochain rendez-vous',
    scheduled: 'Planifié',
    appointmentWith: 'Dr Amara Diallo — Bilan de santé général',
    appointmentWhen: 'Demain à 10h30',
    tipsTitle: 'Conseils rapides',
    tipsBody:
      "Hydratez-vous et visez 30 minutes d'activité aujourd'hui. Les petits pas comptent.",
  },

  profile: {
    title: 'Profil',
    guestUser: 'Utilisateur invité',
    notSignedIn: 'Non connecté',
    appearance: 'Apparence',
    system: 'Système',
    light: 'Clair',
    dark: 'Sombre',
    signOut: 'Se déconnecter',
  },

  notFound: {
    title: "Cet écran n'existe pas.",
    headerTitle: 'Page introuvable',
    goHome: "Aller à l'accueil",
  },

  offline: {
    banner: 'Vous êtes hors ligne — la réservation et les paiements nécessitent une connexion.',
    error: 'Pas de connexion Internet. Vérifiez votre réseau et réessayez.',
  },

  input: {
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
  },

  dateField: {
    selectDate: 'Choisir une date',
    done: 'Terminé',
    placeholder: 'jj/mm/aaaa',
  },

  select: {
    placeholder: 'Sélectionner…',
  },

  errorBoundary: {
    message: 'Une erreur inattendue est survenue. Veuillez rouvrir cet écran.',
  },

  errors: {
    heading: 'Une erreur est survenue',
    network: 'Erreur réseau. Vérifiez votre connexion et réessayez.',
    timeout: 'La demande a expiré. Veuillez réessayer.',
    generic: 'Une erreur est survenue. Veuillez réessayer.',
    badRequest: "Nous n'avons pas pu traiter cette demande. Veuillez vérifier vos informations et réessayer.",
    unauthorized: 'Votre session a expiré. Veuillez vous reconnecter.',
    forbidden: "Vous n'avez pas la permission de faire cela.",
    notFound: "Nous n'avons pas trouvé ce que vous cherchez.",
    conflict: "Cela ne correspond plus à la dernière version. Actualisez l'écran et réessayez.",
    tooLarge: 'Ce fichier ou cette demande est trop volumineux.',
    validation: 'Veuillez vérifier les champs indiqués et réessayer.',
    rateLimited: 'Trop de demandes. Veuillez ralentir et réessayer.',
    server: 'Nos serveurs rencontrent un problème. Veuillez réessayer dans un instant.',
    codes: {
      EMAIL_NOT_VERIFIED: "Vérifiez d'abord votre adresse e-mail — nous vous avons envoyé un code.",
      INVALID_EMAIL_OR_PASSWORD: 'E-mail ou mot de passe incorrect.',
      USER_ALREADY_EXISTS: 'Un compte existe déjà avec cet e-mail. Essayez de vous connecter.',
      INVALID_OTP: "Ce code n'est pas correct. Vérifiez le code que nous vous avons envoyé.",
      OTP_EXPIRED: 'Ce code a expiré. Veuillez en demander un nouveau.',
      SESSION_REQUIRED:
        'E-mail vérifié. Veuillez vous connecter avec votre mot de passe pour continuer.',
    },
  },
};

export default fr;
