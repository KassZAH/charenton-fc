import { requireUser } from "@/lib/auth/current-user";

type Item = { emoji: string; title: string; text: string };

const PLAYER_ITEMS: Item[] = [
  {
    emoji: "🔑",
    title: "Se connecter",
    text: "Sur l'écran de connexion, clique ton nom dans la liste, puis tape ton code PIN (4 ou 6 chiffres selon ton compte).",
  },
  {
    emoji: "🏠",
    title: "Accueil",
    text: "Le prochain match, tes stats de la saison, une phrase qui se moque gentiment de toi selon tes stats, et des alertes (blessure, cotisation non réglée, souvenir « Ce jour-là ») quand elles te concernent.",
  },
  {
    emoji: "✅",
    title: "Répondre à une convocation",
    text: "Sur l'Accueil ou la fiche du match, choisis Présent / Incertain / Absent / Blessé. Tu peux changer d'avis à tout moment, ça s'enregistre tout de suite.",
  },
  {
    emoji: "🩹",
    title: "Se déclarer blessé",
    text: "Depuis l'Accueil ou ton profil, « Je suis blessé » : choisis une durée (prochain match, ~1 semaine, ~2 semaines, ~1 mois, date précise, ou inconnue). Tes convocations à venir passent automatiquement en Blessé. « Je suis rétabli » annule tout d'un coup.",
  },
  {
    emoji: "🚗",
    title: "Covoiturage",
    text: "Sur la fiche d'un match à venir, section Covoiturage : indique si tu conduis ou si tu as besoin d'une place.",
  },
  {
    emoji: "🎒",
    title: "Qui apporte quoi",
    text: "Sur la fiche d'un match à venir, section « Qui apporte quoi » : réserve un élément de matériel (« Je m'en occupe ») ou coche-le comme apporté.",
  },
  {
    emoji: "⚽",
    title: "Fiche d'un match",
    text: "Détails du match (lieu, itinéraire, capitaine), et une fois terminé : les buts, les cartons, les votes pour les récompenses, et les cartes à partager.",
  },
  {
    emoji: "🏆",
    title: "Voter pour les récompenses",
    text: "Une fois un match terminé, vote pour Homme du match, Vendange, Mur, Geste, Moment, Boucher, et d'éventuelles récompenses ponctuelles créées pour ce match précis. Tu ne peux pas voter pour toi-même, et tu peux changer ton vote.",
  },
  {
    emoji: "📤",
    title: "Partager une carte",
    text: "Sur la fiche d'un match : Affiche du match, Carte résultat, Carte de composition. Sur ta fiche joueur : Carte joueur (stats de la saison) et Carte carrière (stats all-time). Tout se télécharge ou se partage en image.",
  },
  {
    emoji: "👥",
    title: "Équipe",
    text: "La liste de l'effectif. Clique un nom pour voir sa fiche complète.",
  },
  {
    emoji: "👤",
    title: "Fiche joueur",
    text: "Stats détaillées, récompenses gagnées, badges, objectifs personnels visibles, bilan avec/sans ce joueur, et l'historique des matchs joués.",
  },
  {
    emoji: "📊",
    title: "Stats",
    text: "Un menu déroulant pour choisir le classement à afficher : buteurs, passeurs, buts + passes déc., présences, cartons, ou n'importe quelle récompense.",
  },
  {
    emoji: "📈",
    title: "Tendances",
    text: "Depuis Stats : forme sur les 5 derniers matchs, projection de fin de saison, records imminents, bilan domicile/extérieur, par jour, par mois, par formation, et répartition des types de buts.",
  },
  {
    emoji: "🥇",
    title: "Records",
    text: "Les meilleures performances, sur la saison en cours ou sur toute l'histoire du club — bascule en haut de la page.",
  },
  {
    emoji: "⚖️",
    title: "Comparer 2 joueurs",
    text: "Depuis Stats, choisis deux joueurs pour voir toutes leurs stats côte à côte.",
  },
  {
    emoji: "📄",
    title: "Bilan de fin de saison",
    text: "Depuis Stats → Bilan : le résumé complet de la saison (victoires/nuls/défaites, buts, cartons, records), partageable en un lien.",
  },
  {
    emoji: "🏛️",
    title: "Mémoire du club",
    text: "Depuis Stats → Mémoire : frise historique, souvenir du jour, souvenir aléatoire, Hall of Fame, mur des citations, historique des maillots. Les coachs peuvent y ajouter des entrées.",
  },
  {
    emoji: "🏅",
    title: "Trophées",
    text: "Depuis Stats → Trophées : vote pour le joueur du mois parmi 3 candidats sélectionnés automatiquement, bingo de saison, défis collectifs, et les trophées de fin de saison attribués par les coachs.",
  },
  {
    emoji: "🎖️",
    title: "Badges",
    text: "Ils tombent tout seuls : premier but, 10 matchs joués, série de présence, 5 récompenses de match, etc. Rien à faire, ça se déclenche automatiquement.",
  },
  {
    emoji: "💶",
    title: "Ma cotisation",
    text: "Depuis Équipe → « Ma cotisation » (ou le lien d'alerte sur l'Accueil si elle n'est pas réglée) : ton propre montant dû et payé, jamais celui des autres. Seuls les coachs peuvent la modifier.",
  },
  {
    emoji: "📅",
    title: "S'abonner au calendrier",
    text: "Depuis ton profil : copie le lien et ajoute-le à ton appli calendrier (Google, Apple...) pour voir tous les matchs automatiquement, sans rien faire de plus.",
  },
  {
    emoji: "🎯",
    title: "Objectifs personnels",
    text: "Depuis ton profil : ajoute un objectif (« marquer 10 buts cette saison »), marque-le atteint, et choisis qui peut le voir (privé, coachs, équipe).",
  },
  {
    emoji: "🔐",
    title: "Centre de confidentialité",
    text: "Depuis ton profil : choisis qui voit ta photo, ton anniversaire et tes mesures (privé, coachs, équipe, public). Active ton profil public pour obtenir un lien partageable hors de l'appli.",
  },
];

const ADMIN_ITEMS: Item[] = [
  {
    emoji: "➕",
    title: "Créer un match",
    text: "Depuis Matchs → « + Nouveau match ». Pour poser plusieurs matchs d'un coup (juste adversaire + date), utilise « Plusieurs matchs d'un coup ». « Rejouer contre cet adversaire » sur un match passé recrée un match identique (terrain, horaires, et en option présents/composition/matériel/capitaine).",
  },
  {
    emoji: "✏️",
    title: "Modifier ou supprimer un match",
    text: "Bouton « Modifier » sur la fiche du match : date, heure, lieu, adversaire, type, anecdote. Bouton rouge en bas pour le supprimer (récupérable depuis la Corbeille).",
  },
  {
    emoji: "🧩",
    title: "Feuille tactique",
    text: "Bouton « Feuille tactique » sur la fiche du match : choisis une formation (4-4-2, 4-3-3, 3-5-2, 4-2-3-1) et place un joueur par poste, parmi ceux qui ont répondu « Présent ».",
  },
  {
    emoji: "🧢",
    title: "Désigner le capitaine",
    text: "Sur la fiche du match : choisis le capitaine parmi les présents.",
  },
  {
    emoji: "🧑‍🤝‍🧑",
    title: "Gérer l'équipe",
    text: "Depuis Équipe : ajouter un joueur, le modifier (y compris changer son rôle ou réinitialiser son PIN), l'archiver/réactiver.",
  },
  {
    emoji: "📋",
    title: "Confirmer la feuille de match",
    text: "Sur un match terminé : coche qui a vraiment joué (pré-coché selon les réponses de présence). C'est cette liste qui sert de base à toutes les stats de présence — sans elle, les stats resteront à zéro.",
  },
  {
    emoji: "⚽",
    title: "Ajouter les buts et passes",
    text: "Sur un match terminé, section Buts : buteur, passeur (optionnel), minute (optionnel), type (classique, penalty, coup franc, CSC adverse ou CSC Charenton). Bouton « Supprimer » sur chaque ligne en cas d'erreur.",
  },
  {
    emoji: "🟨🟥",
    title: "Ajouter les cartons",
    text: "Même principe que les buts, section Cartons : joueur, jaune ou rouge, minute, commentaire.",
  },
  {
    emoji: "🔢",
    title: "Corriger le score",
    text: "En bas de la fiche match, le score peut être saisi puis corrigé à tout moment, même après validation.",
  },
  {
    emoji: "🔄",
    title: "Corriger une présence après coup",
    text: "Dans « Réponses de l'équipe » sur la fiche match, tu peux changer la réponse de n'importe quel joueur (désistement de dernière minute, erreur, etc.).",
  },
  {
    emoji: "✅",
    title: "Matchs à vérifier",
    text: "Depuis Matchs : la liste des matchs terminés dont la fiche est incomplète (score, présents, buteurs, récompenses manquants).",
  },
  {
    emoji: "🎉",
    title: "Récompense ponctuelle",
    text: "Sur la fiche d'un match terminé, section Récompenses : crée une catégorie de vote valable uniquement sur ce match (ex. « Blague du match »).",
  },
  {
    emoji: "📣",
    title: "Appel à renfort",
    text: "Sur la fiche d'un match à venir : crée un lien public temporaire (poste recherché, durée de validité, message) à partager à un joueur ponctuel hors de l'appli.",
  },
  {
    emoji: "💬",
    title: "Partager sur WhatsApp",
    text: "Sur la fiche match : « Partager la convocation » (avant le match, avec le décompte des réponses), « Relancer les sans-réponse », et « Partager le résultat » (après le match, avec buteurs et récompenses).",
  },
  {
    emoji: "💶",
    title: "Gérer les cotisations",
    text: "Depuis Équipe → Cotisations : fixe un montant pour tout le monde d'un coup ou joueur par joueur, et enregistre les paiements. Chaque joueur ne voit que son propre statut.",
  },
  {
    emoji: "🏛️",
    title: "Alimenter la mémoire du club",
    text: "Depuis Stats → Mémoire : intronise au Hall of Fame, ajoute une citation, un maillot historique, ou renseigne la date de création du club.",
  },
  {
    emoji: "🏅",
    title: "Attribuer les trophées de fin de saison",
    text: "Depuis Stats → Trophées → Trophées de fin de saison : attribue joueur de la saison, meilleur buteur, révélation, plus grande vendange, etc.",
  },
  {
    emoji: "🛠️",
    title: "Gestion de l'équipe",
    text: "Depuis Stats → Gestion : tableau de santé des données (matchs incomplets, âge de la dernière sauvegarde), sauvegardes (manuelles ou automatiques, métadonnées et statut d'intégrité visibles par tout coach ; téléchargement complet, export audit_log et suppression réservés au propriétaire du club — le fichier complet contient des données sensibles, à conserver en lieu sûr), corbeille (matchs/buts/cartons supprimés, restaurables), et gestion des saisons (verrouillage, nouvelle saison). Le propriétaire du club y trouve en plus la gestion des coachs (promotion, rétrogradation, transfert de propriété).",
  },
  {
    emoji: "🕓",
    title: "Historique des modifications",
    text: "Depuis Stats → Historique : les dernières modifications à fort enjeu (scores, buts, cartons, fiches joueurs, cotisations) avec un bouton pour annuler chacune.",
  },
];

export default async function HelpPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-md lg:max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-lg font-extrabold text-cream">Aide 🙋</h1>
      <p className="mb-6 text-sm text-steel/70">Le mode d&apos;emploi de l&apos;appli, en deux minutes.</p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gold">
          Pour tout le monde
        </h2>
        <ul className="space-y-3">
          {PLAYER_ITEMS.map((item) => (
            <HelpCard key={item.title} item={item} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-gold">
          🔒 Réservé aux coachs
        </h2>
        <p className="mb-3 text-xs text-steel/70">
          Le propriétaire du club a en plus la main sur la gestion des coachs (promotion, rétrogradation,
          transfert de propriété) — voir Gestion de l&apos;équipe.
        </p>
        <ul className="space-y-3">
          {ADMIN_ITEMS.map((item) => (
            <HelpCard key={item.title} item={item} admin />
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-white/10 bg-navy-card p-4">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-steel">📲 Installation & limites</h2>
        <p className="mb-2 text-sm text-cream/80">
          L&apos;appli s&apos;installe sur l&apos;écran d&apos;accueil (iOS : Partager → « Sur l&apos;écran
          d&apos;accueil » — Android : menu du navigateur → « Installer l&apos;application »), avec sa propre icône
          et son écran de démarrage.
        </p>
        <p className="text-sm text-cream/70">
          En revanche, elle ne fonctionne pas hors connexion : il faut du réseau pour l&apos;ouvrir, il n&apos;y a
          pas de notifications push, et rien ne se synchronise en arrière-plan. Ce n&apos;est pas un bug, juste une
          limite actuelle.
        </p>
      </section>
    </div>
  );
}

function HelpCard({ item, admin = false }: { item: Item; admin?: boolean }) {
  return (
    <li
      className={`flex gap-3 rounded-xl border p-3 ${
        admin ? "border-gold/30 bg-gold/5" : "border-white/10 bg-navy-card"
      }`}
    >
      <span className="text-xl leading-none" aria-hidden>
        {item.emoji}
      </span>
      <div>
        <p className="text-sm font-semibold text-cream">{item.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-cream/70">{item.text}</p>
      </div>
    </li>
  );
}
