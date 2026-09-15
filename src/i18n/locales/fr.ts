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
    enterCode: 'Saisissez le code à 6 chiffres',
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
    search: 'Trouver soins',
    profile: 'Profil',
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
    bookingNotice: 'La réservation et les paiements arrivent bientôt — vous pourrez réserver cette consultation ici même.',
    notFound: 'Ce praticien n’est pas disponible.',
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
    goHome: "Aller à l'accueil",
  },
};

export default fr;
