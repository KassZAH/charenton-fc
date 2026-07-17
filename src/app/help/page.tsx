import { requireUser } from "@/lib/auth/current-user";

type Item = { emoji: string; title: string; text: string };

const PLAYER_ITEMS: Item[] = [
  {
    emoji: "🔑",
    title: "Se connecter",
    text: "Sur l'écran de connexion, clique ton nom dans la liste, puis tape ton code PIN (4 chiffres pour un joueur, 6 pour un admin).",
  },
  {
    emoji: "🏠",
    title: "Accueil",
    text: "Tu retrouves le prochain match, tes stats de la saison et une petite phrase qui se moque gentiment de toi selon tes stats.",
  },
  {
    emoji: "✅",
    title: "Répondre à une convocation",
    text: "Sur l'Accueil ou la fiche du match, choisis Présent / Incertain / Absent / Blessé. Tu peux changer d'avis à tout moment, ça s'enregistre tout de suite.",
  },
  {
    emoji: "⚽",
    title: "Fiche d'un match",
    text: "Détails du match, et une fois le match terminé : les buts, les cartons, et les votes pour les récompenses.",
  },
  {
    emoji: "🏆",
    title: "Voter pour les récompenses",
    text: "Une fois un match terminé, vote pour Homme du match, Mur du match, etc. dans les menus déroulants. Tu ne peux pas voter pour toi-même, et tu peux changer ton vote.",
  },
  {
    emoji: "👥",
    title: "Équipe",
    text: "La liste de l'effectif. Clique un nom pour voir sa fiche complète.",
  },
  {
    emoji: "👤",
    title: "Fiche joueur",
    text: "Stats détaillées, récompenses gagnées, badges, et l'historique des matchs joués.",
  },
  {
    emoji: "📊",
    title: "Stats",
    text: "Les classements de l'équipe : buteurs, passeurs, présences, cartons, et un classement par récompense.",
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
    emoji: "🎖️",
    title: "Badges",
    text: "Ils tombent tout seuls : premier but, 10 matchs joués, série de présence, etc. Rien à faire, ça se déclenche automatiquement.",
  },
  {
    emoji: "⚙️",
    title: "Mon profil",
    text: "Clique ton nom en haut de l'écran. Tu peux modifier tes infos (nom, poste, pied fort, citation), et suivre ton poids/ta taille — privé par défaut, tu choisis si tu le partages avec l'équipe.",
  },
];

const ADMIN_ITEMS: Item[] = [
  {
    emoji: "➕",
    title: "Créer un match",
    text: "Depuis Matchs → « + Nouveau match ». Pour poser plusieurs matchs d'un coup (juste adversaire + date), utilise « Plusieurs matchs d'un coup », l'heure et le lieu se complètent plus tard.",
  },
  {
    emoji: "✏️",
    title: "Modifier ou supprimer un match",
    text: "Bouton « Modifier » sur la fiche du match : date, heure, lieu, adversaire, type, anecdote. Bouton rouge en bas pour le supprimer.",
  },
  {
    emoji: "🧩",
    title: "Feuille tactique",
    text: "Bouton « Feuille tactique » sur la fiche du match : choisis une formation (4-4-2, 4-3-3, 3-5-2, 4-2-3-1) et place un joueur par poste, parmi ceux qui ont répondu « Présent ».",
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
    text: "Sur un match terminé, section Buts : buteur, passeur (optionnel), minute (optionnel). Bouton « Supprimer » sur chaque ligne en cas d'erreur.",
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
    emoji: "💬",
    title: "Partager sur WhatsApp",
    text: "Sur la fiche match : « Partager la convocation » (avant le match, avec le décompte des réponses), « Relancer les sans-réponse », et « Partager le résultat » (après le match, avec buteurs et récompenses).",
  },
];

export default async function HelpPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
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
          🔒 Réservé aux admins
        </h2>
        <p className="mb-3 text-xs text-steel/70">
          Le rôle coach a exactement les mêmes droits, plus la feuille tactique (formation et placement des
          joueurs) sur chaque match.
        </p>
        <ul className="space-y-3">
          {ADMIN_ITEMS.map((item) => (
            <HelpCard key={item.title} item={item} admin />
          ))}
        </ul>
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
