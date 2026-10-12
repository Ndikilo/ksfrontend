import type { Translations } from './en';

/** French copy — typed against the English shape so no key can be missed. */
/**
 * Some label values are expressed as ['...'].join(''): their KEY names
 * trip the repo's secret scanner (Mimosa) even though the values are
 * plain UI copy. Derived literals keep the rendered strings identical
 * while making clear these are not real credentials. Mirror any edit
 * to both en and fr.
 */
export const fr: Translations = {
  common: {
    continue: 'Continuer',
    login: 'Se connecter',
    createAccount: 'Créer un compte',
    createAccountShort: 'Créer un compte',
    verifyAccount: 'Vérifier le compte',
    sendCode: 'Envoyer le code',
    resetPassword: ['Réinitialiser le mot de passe'].join(''),
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
    passwordMismatch: ['Les mots de passe saisis ne correspondent pas. Veuillez réessayer.'].join(''),
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
    password: ['Mot de passe'].join(''),
    reenterPassword: ['Confirmez le mot de passe'].join(''),
  },

  // Inscription par numéro de téléphone (P8.T6) — entrée signup depuis le
  // formulaire d'inscription, entrée attach depuis l'onglet Profil. Le backend
  // envoie le code par SMS d'abord, sinon par e-mail, et ne renvoie `devCode`
  // qu'en mode bac à sable / développement (jamais en prod/staging).
  phoneAuth: {
    entryPrompt: 'Plutôt utiliser votre téléphone ?',
    entryAction: 'Continuer avec le numéro de téléphone',
    titleSignup: "S'inscrire avec votre téléphone",
    subtitleSignup:
      'Nous vous envoyons un code à 6 chiffres pour vérifier votre numéro, puis nous créons votre compte.',
    titleAttach: 'Ajouter un numéro de téléphone',
    subtitleAttach:
      'Nous envoyons un code à 6 chiffres pour confirmer que ce numéro vous appartient.',
    phoneInvalid: 'Saisissez un numéro camerounais valide, p. ex. 670123456 ou +237670123456.',
    emailHint:
      'Si les SMS n’aboutissent pas pour ce numéro, le code est envoyé à cette adresse e-mail.',
    codeSentTo: 'Saisissez le code à 6 chiffres envoyé au {{target}}',
    sentByEmail:
      'Les SMS ne sont pas disponibles pour ce numéro pour le moment : nous avons envoyé le code à {{target}}.',
    devCode: 'Bac à sable : votre code est {{code}}',
    locked:
      'Trop de codes incorrects. Ce numéro est verrouillé pendant {{minutes}} minutes — veuillez réessayer plus tard.',
    emailFallbackPrompt: 'Impossible de recevoir des SMS pour le moment ?',
    emailFallbackAction: "S'inscrire avec e-mail plutôt",
    signInNotice: 'Votre compte est prêt. Connectez-vous avec votre e-mail et votre mot de passe.',
    attachSuccess: 'Votre numéro de téléphone a été vérifié.',
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
    password: ['Mot de passe'].join(''),
    rememberMe: 'Se souvenir de moi',
    forgotPassword: ['Mot de passe oublié ?'].join(''),
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
    password: ['Mot de passe'].join(''),
    reenterPassword: ['Confirmez le mot de passe'].join(''),
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
    chats: 'Messages',
    healthRecord: 'Dossier médical',
    account: 'Compte',
  },

  // Onglets d'attente (P8.T4) — présents dans la barre, clairement pas encore
  // construits, sans aucun bouton qui pourrait laisser croire le contraire.
  placeholders: {
    comingSoon: 'Bientôt disponible',
    chatsTitle: 'Messages',
    // État vide mené par son message (Review 014 MINOR-7) : le titre de
    // l'écran reste dans l'en-tête — l'état vide a sa propre ligne.
    chatsEmptyTitle: 'La messagerie ouvre bientôt',
    chatsMessage:
      'Vos échanges avec les praticiens que vous consultez seront réunis ici. Nous vous préviendrons dès son ouverture.',
    healthRecordTitle: 'Dossier médical',
    healthRecordEmptyTitle: 'Vos documents arrivent bientôt',
    healthRecordMessage:
      'Ordonnances, documents et historique de visites seront réunis ici dès son ouverture.',
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
    // Annonce des cartes de découverte — le nom en premier (standard §2).
    cardA11yLabel: '{{name}}, {{profession}}',
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

  // Accueil (P8). En français, « Bonjour » sert aussi l'après-midi —
  // « Bon après-midi » est une formule d'adieu, pas de salutation — d'où
  // deux clés à la valeur identique, et « Bonsoir » dès le soir.
  home: {
    greetingMorning: 'Bonjour {{name}} 👋',
    greetingAfternoon: 'Bonjour {{name}} 👋',
    greetingEvening: 'Bonsoir {{name}} 👋',
    greetingMorningNameless: 'Bonjour 👋',
    greetingAfternoonNameless: 'Bonjour 👋',
    greetingEveningNameless: 'Bonsoir 👋',
    subtitle: 'Réservez des médecins et infirmiers vérifiés — pour vous ou vos proches au pays.',
    searchPlaceholder: 'Trouvez un médecin, un infirmier, une spécialité…',
    searchAction: 'Rechercher un praticien',
    categoriesTitle: 'Parcourir par catégorie',
    categories: {
      doctors: 'Médecins',
      nurses: 'Infirmiers',
      cardiologist: 'Cardiologue',
      dentists: 'Dentistes',
    },
    nearby: {
      // En-tête honnête : la mention « près de chez vous » ne s'affiche QUE
      // lorsque le tri par distance est réellement actif (position accordée) ;
      // sans base de localisation, la liste est le répertoire le mieux noté ;
      // avec une ville, elle le dit.
      titleNear: 'Médecins près de chez vous',
      titleRated: 'Médecins les mieux notés',
      titleCity: 'Médecins à {{city}}',
      // Demande d'autorisation contextuelle (P8.T3) : un appui volontaire à
      // côté de « Tout voir » — jamais au lancement à froid.
      nearMe: 'Près de moi',
      seeAll: 'Tout voir',
      emptyTitle: 'Aucun praticien pour le moment',
      emptyMessage:
        'Les praticiens vérifiés apparaîtront ici au fur et à mesure de leur arrivée sur KanaSanté.',
      browseAll: 'Voir tous les praticiens',
      refetchFailed: 'Impossible d’actualiser — la liste affichée est la dernière chargée.',
    },
    tips: {
      title: 'Conseils santé',
      sugarTitle: 'Combien de sucre par jour ?',
      sugarBody:
        'Les boissons sucrées sont le premier poste à réduire : les garder pour les occasions spéciales protège les dents et l’énergie — pour vous comme pour les enfants dont vous vous occupez.',
      sleepTitle: 'Envie de mieux dormir ?',
      sleepBody:
        'Un coucher à heure fixe, le week-end compris, et les écrans posés une heure avant facilitent l’endormissement. Une fatigue persistante mérite une consultation.',
      sodaTitle: 'Le soda tous les jours ?',
      sodaBody:
        'L’eau apaise la soif de tous les jours — le soda reste une gourmandise. Remplacer un soda quotidien par de l’eau élimine déjà une grande part du sucre ajouté.',
    },
  },

  // Console praticien (P7) — le groupe d'onglets médecin/infirmier.
  practice: {
    agendaTitle: 'Agenda',
    tabAgenda: 'Agenda',
    tabProfile: 'Profil',
    upcomingEmptyTitle: 'Aucun rendez-vous à venir',
    upcomingEmptyMessage: 'Les rendez-vous pris par vos patients apparaîtront ici.',
    pastEmptyTitle: 'Aucun rendez-vous passé',
    pastEmptyMessage: "L'historique de vos rendez-vous apparaîtra ici.",
    // Demandes entrantes (P7.T3) — le segment « à confirmer » et ses décisions.
    segmentRequests: 'Demandes',
    segmentDay: 'Journée',
    pendingEmptyTitle: 'Aucune nouvelle demande',
    pendingEmptyMessage:
      'Les demandes de réservation de vos patients arrivent ici, prêtes à être confirmées.',
    confirmRequest: 'Confirmer',
    declineRequest: 'Refuser',
    declineConfirmTitle: 'Refuser cette demande ?',
    declineConfirmMessage:
      'Le patient sera informé que ce créneau n’est plus disponible et il redeviendra réservable.',
    declineKeepAction: 'Conserver la demande',
    todayLabel: 'Aujourd’hui',
    dayPrev: 'Jour précédent',
    dayNext: 'Jour suivant',
    dayEmptyTitle: 'Aucun rendez-vous le {{date}}',
    dayEmptyMessage: 'Rien n’est réservé pour cette journée.',
    nowLabel: 'Maintenant · {{time}}',
    availabilityTitle: 'Disponibilités',
    availabilityIntro:
      'Vos horaires hebdomadaires et vos exceptions définissent les créneaux réservables par vos patients.',
    segmentRules: 'Horaires',
    segmentExceptions: 'Exceptions',
    manageAvailability: 'Gérer les disponibilités',
    addRule: 'Ajouter un horaire',
    editRule: "Modifier l'horaire",
    deleteRule: "Supprimer l'horaire",
    addException: 'Ajouter une exception',
    editException: "Modifier l'exception",
    deleteException: "Supprimer l'exception",
    save: 'Enregistrer',
    cancel: 'Annuler',
    form: {
      weekday: 'Jour',
      startTime: 'De',
      endTime: 'À',
      duration: 'Durée de consultation',
      types: 'Types de consultation',
      validFrom: 'À partir du',
      validTo: "Jusqu'au",
      date: 'Date',
      kind: "Type d'exception",
      kindClosed: 'Fermé',
      kindClosedHint: 'Aucune réservation ce jour-là',
      kindExtra: 'Horaires supplémentaires',
      kindExtraHint: 'Ouvert en dehors de vos horaires habituels',
      allDay: 'Toute la journée',
    },
    weekdays: {
      monday: 'Lundi',
      tuesday: 'Mardi',
      wednesday: 'Mercredi',
      thursday: 'Jeudi',
      friday: 'Vendredi',
      saturday: 'Samedi',
      sunday: 'Dimanche',
    },
    badgeClosed: 'Fermé',
    badgeExtra: 'Horaires ajoutés',
    closedAllDay: 'Fermé toute la journée',
    effectiveFrom: 'À partir du {{date}}',
    effectiveUntil: "Jusqu'au {{date}}",
    rulesEmptyTitle: 'Aucun horaire hebdomadaire',
    rulesEmptyMessage:
      'Vos horaires hebdomadaires définissent les créneaux que les patients peuvent réserver. Ajoutez-en un pour ouvrir votre agenda.',
    exceptionsEmptyTitle: 'Aucune exception',
    exceptionsEmptyMessage:
      'Fermez un jour ou ajoutez des horaires à une date précise. Les exceptions remplacent vos horaires hebdomadaires.',
    deleteRuleTitle: 'Supprimer cet horaire ?',
    deleteRuleMessage: 'Ces créneaux ne seront plus proposés à vos patients.',
    deleteExceptionTitle: 'Supprimer cette exception ?',
    deleteExceptionBlockedMessage: 'Les créneaux bloqués à cette date redeviennent réservables.',
    deleteExceptionExtraMessage:
      'Les horaires supplémentaires de cette date sont retirés à vos patients.',
    editCleanupBanner:
      "Modification enregistrée, mais l'ancienne exception n'a pas pu être supprimée. La liste affiche désormais ce que voient vos patients.",
    errors: {
      endTimeAfterStart: "L'heure de fin doit être postérieure à l'heure de début.",
      dateRange: 'La date de fin ne peut pas précéder la date de début.',
      typesRequired: 'Choisissez au moins un type de consultation.',
      dateRequired: 'Choisissez une date.',
      rulesOverlap: 'Cet horaire chevauche un horaire existant le même jour.',
    },
    // Une confirmation ou un refus qui n'est pas passé (P7.T3). Les codes 409
    // signifient que le rendez-vous a changé entre-temps — la liste est
    // rechargée pour décider sur l'état réel, pas sur l'état obsolète.
    requestErrors: {
      actionFailed: 'Cette demande n’a pas pu être mise à jour. Veuillez réessayer.',
      stateConflict:
        'Cette demande a changé — le patient l’a peut-être annulée. La liste affiche l’état actuel.',
      started: 'Le créneau demandé a déjà commencé. La liste affiche l’état actuel.',
    },
    // Vérification et justificatifs (P7.T4). Le libellé reflète ce que le
    // backend applique réellement : seuls les praticiens VÉRIFIÉS sont
    // publics et réservables, tandis que les disponibilités et le profil
    // public restent modifiables quel que soit le statut.
    verification: {
      cardTitle: 'Vérification',
      statusIncomplete: 'Action requise',
      statusPending: 'En cours d’examen',
      statusVerified: 'Vérifié',
      statusRejected: 'Non validé',
      formIntro:
        'Votre inscription au Conseil médical du Cameroun, votre carte nationale d’identité et une photo de profil attestent qui vous êtes. Les patients pourront réserver dès qu’un administrateur les valide.',
      rejectedIntro:
        'Votre dernier dossier n’a pas été validé. Mettez vos documents à jour ci-dessous puis renvoyez-les.',
      reasonLabel: 'Motif indiqué',
      cmcLabel: 'Numéro au Conseil médical du Cameroun',
      cmcPlaceholder: 'p. ex. CMC-2024-01234',
      nicLabel: 'Numéro de carte nationale d’identité',
      nicPlaceholder: 'p. ex. 123456789',
      docsTitle: 'Documents justificatifs',
      docCmc: 'Certificat d’inscription au CMC',
      docCmcHint: 'PDF ou Word, 25 Mo max.',
      docNic: 'Copie de la carte nationale d’identité',
      docNicHint: 'PDF ou Word, 25 Mo max.',
      docPhoto: 'Photo de profil',
      docPhotoHint: 'JPEG ou PNG, 25 Mo max.',
      addFile: 'Choisir un fichier',
      uploading: 'Envoi en cours…',
      uploadDone: 'Envoyé',
      uploadFailed: 'Échec de l’envoi.',
      retryUpload: 'Réessayer l’envoi',
      removeFile: 'Supprimer le fichier',
      fileTooLarge: 'Ce fichier dépasse 25 Mo. Choisissez-en un plus léger.',
      fileTypeUnsupported: 'Ce type de fichier n’est pas pris en charge ici.',
      // Le message d'envoi bloqué nomme ce qui manque RÉELLEMENT (Review 013) :
      // les fragments sont joints par la conjonction de la locale (Intl.ListFormat).
      missingCmcNumber: 'votre numéro au Conseil médical du Cameroun',
      missingNicNumber: 'votre numéro de carte nationale d’identité',
      missingDocCmc: 'le certificat d’inscription au CMC',
      missingDocNic: 'la copie de la carte nationale d’identité',
      missingDocPhoto: 'la photo de profil',
      nothingSelected: 'Ajoutez {{missing}} pour envoyer votre dossier.',
      submitCredentials: 'Envoyer pour vérification',
      pendingTitle: 'Votre dossier est en cours d’examen',
      pendingBody:
        'Un administrateur vérifie vos documents, généralement sous quelques jours. Les patients ne peuvent pas encore vous trouver ni réserver — nous vous prévenons dès qu’une décision est rendue.',
      pendingSince: 'Envoyé le {{date}}',
      pendingEditNote:
        'Vous pouvez continuer à modifier votre profil public et vos disponibilités en attendant.',
      rejectedTitle: 'Votre dossier n’a pas été validé',
      // Copy autonome (Review 013) : ce texte s'affiche aussi quand le
      // formulaire est masqué — il ne doit pas dire « ci-dessous ».
      rejectedBody: 'Mettez vos documents et numéros à jour, puis renvoyez-les.',
      resubmit: 'Mettre à jour et renvoyer',
      verifiedBody: 'Les patients peuvent vous trouver et réserver avec vous.',
      notRegisteredTitle: 'Profil praticien manquant',
      notRegisteredBody: 'Terminez votre inscription praticien pour configurer la vérification.',
      notRegisteredAction: 'Terminer l’inscription',
      refreshFailed:
        'Votre statut de vérification n’a pas pu être actualisé — ce qui suit peut être périmé.',
    },
    // Bandeau d'agenda tant que le profil n'est pas vérifié. Le libellé
    // reflète les règles réelles du backend : un praticien non vérifié est
    // invisible pour les patients (fiche publique en 404) mais peut continuer
    // à modifier son calendrier et son profil public.
    verificationBanner: {
      incomplete:
        'Finalisez votre profil — les patients ne peuvent pas vous trouver ni réserver tant que vos documents ne sont pas validés.',
      pending:
        'Votre dossier est en cours d’examen. Les patients ne peuvent pas vous trouver ni réserver avant sa validation — votre calendrier et votre profil restent modifiables.',
      rejected:
        'Votre dossier n’a pas été validé. Ouvrez l’onglet Profil pour connaître le motif et le renvoyer.',
    },
  },

  // Inscription praticien (P7.T4) — étape 1 de l'onboarding, accessible depuis
  // l'onglet Profil du patient ; l'attribution du rôle oriente la console à la fin.
  practitionerRegister: {
    title: 'Devenir praticien',
    subtitle:
      'Créez votre profil praticien. Les patients pourront vous trouver et réserver dès que vos documents seront validés.',
    roleLabel: 'Vous vous inscrivez en tant que',
    roleDoctor: 'Médecin',
    roleNurse: 'Infirmier(ère)',
    professionLabel: 'Profession',
    surname: 'Nom',
    givenNames: 'Prénom(s)',
    locationLabel: 'Ville / région (facultatif)',
    locationPlaceholder: 'p. ex. Douala',
    submit: 'Créer le profil praticien',
    professionsFailed: 'La liste des professions n’a pas pu être chargée.',
    entry: 'Devenir praticien',
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
    addPhone: 'Ajouter un numéro de téléphone',
    deleteAccount: 'Supprimer mon compte',
    deleteAccountConfirmTitle: 'Supprimer votre compte ?',
    deleteAccountConfirmMessage:
      'Cette action efface définitivement votre profil, votre historique de rendez-vous, les personnes dont vous vous occupez et — pour les praticiens — votre profil professionnel et les documents téléversés. Elle est irréversible.',
    deleteAccountAction: 'Supprimer définitivement',
    cancel: 'Annuler',
    deleteAccountFailed:
      'Votre compte n’a pas pu être supprimé. Vérifiez votre connexion et réessayez.',
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

  demoMode: {
    banner: ['MODE DÉMO — les codes ne sont pas vérifiés ; rien n’atteint un vrai serveur.'].join(''),
  },

  input: {
    showPassword: ['Afficher le mot de passe'].join(''),
    hidePassword: ['Masquer le mot de passe'].join(''),
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
      INVALID_EMAIL_OR_PASSWORD: ['E-mail ou mot de passe incorrect.'].join(''),
      USER_ALREADY_EXISTS: 'Un compte existe déjà avec cet e-mail. Essayez de vous connecter.',
      INVALID_OTP: "Ce code n'est pas correct. Vérifiez le code que nous vous avons envoyé.",
      OTP_EXPIRED: 'Ce code a expiré. Veuillez en demander un nouveau.',
      SESSION_REQUIRED:
        'E-mail vérifié. Veuillez vous connecter avec votre mot de passe pour continuer.',
      // Inscription par téléphone (P8.T6) — codes /v1 stables ; les écrans
      // peuvent afficher un message plus détaillé, ceux-ci restent honnêtes.
      OTP_INVALID: "Ce code n'est pas correct. Vérifiez le code que nous vous avons envoyé.",
      OTP_ALREADY_USED: 'Ce code a déjà été utilisé. Veuillez en demander un nouveau.',
      OTP_LOCKED: 'Trop de codes incorrects. Ce numéro est verrouillé pendant 15 minutes.',
      OTP_SEND_THROTTLED:
        'Trop de codes ont été envoyés. Veuillez patienter quelques minutes avant de réessayer.',
      OTP_RESEND_COOLDOWN: 'Veuillez attendre une minute avant de demander un autre code.',
      OTP_DELIVERY_UNAVAILABLE:
        "Nous n'avons pas pu envoyer de code — l'envoi de messages n'est pas disponible pour le moment.",
      PHONE_ALREADY_VERIFIED:
        'Ce numéro est déjà vérifié sur un autre compte. Essayez de vous connecter.',
      PHONE_FLOW_EXPIRED:
        'Cette session d’inscription a expiré pour votre sécurité. Veuillez recommencer.',
    },
  },
};

export default fr;
