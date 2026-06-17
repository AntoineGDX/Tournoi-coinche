// C'EST COINCHÉ ! — Edge Function "partner-notify"
// Gère tous les emails de notification du site :
//   - request_received / request_accepted / request_declined  (binôme)
//   - inscription_created                                      (nouvelle inscription)
//   - payment_confirmed                                        (paiement validé par admin)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_ADDRESS = "C'est Coinché <notifications@cestcoinche.fr>";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---- Template HTML --------------------------------------------------------

function emailTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

  <!-- Header -->
  <tr><td style="background:#1a1a1a;padding:24px 32px;border-bottom:4px solid #f5c842">
    <span style="font-family:Georgia,serif;font-size:26px;font-weight:900;color:#f5c842;text-transform:uppercase;letter-spacing:-1px">C'EST COINCHÉ !</span>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:36px 32px;border-left:4px solid #1a1a1a;border-right:4px solid #1a1a1a">
    ${content}
  </td></tr>

  <!-- Infos tournoi -->
  <tr><td style="background:#f5c842;padding:18px 32px;border:4px solid #1a1a1a;border-top:3px solid #1a1a1a">
    <p style="margin:0;font-size:12px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:.08em">
      📅 13 &amp; 14 juin 2026 &nbsp;·&nbsp; 📍 Le 109, Nice &nbsp;·&nbsp; 🃏 Format doublette &nbsp;·&nbsp; 20€ / équipe
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#1a1a1a;padding:16px 32px">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,.45)">
      C'est Coinché · 89 Route de Turin, 06300 Nice ·
      <a href="https://cestcoinche.fr" style="color:#f5c842;text-decoration:none">cestcoinche.fr</a>
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

function btn(label: string, url: string, outline = false): string {
  return outline
    ? `<a href="${url}" style="display:inline-block;background:#ffffff;color:#1a1a1a;padding:12px 22px;font-weight:900;font-size:12px;text-decoration:none;text-transform:uppercase;letter-spacing:.1em;border:2.5px solid #1a1a1a;margin-top:8px;margin-right:10px">${label} →</a>`
    : `<a href="${url}" style="display:inline-block;background:#f5c842;color:#1a1a1a;padding:12px 22px;font-weight:900;font-size:12px;text-decoration:none;text-transform:uppercase;letter-spacing:.1em;border:2.5px solid #1a1a1a;margin-top:8px;margin-right:10px">${label} →</a>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.6">${text}</p>`;
}

function h2(text: string): string {
  return `<h2 style="margin:0 0 24px;font-size:22px;font-weight:900;color:#1a1a1a;text-transform:uppercase;letter-spacing:-0.5px">${text}</h2>`;
}

// ---- Helpers --------------------------------------------------------------

function displayName(team: { team_name: string; player1_name: string }) {
  return team.team_name || team.player1_name;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY non configurée — email non envoyé.");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });
  if (!res.ok) {
    console.error("Échec envoi email Resend:", await res.text());
  }
}

// ---- Emails : binôme ------------------------------------------------------

async function handleBinomeEvents(
  event: string,
  fromTeamId: string,
  toTeamId: string,
  authHeader: string,
) {
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: CORS_HEADERS });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: teams, error } = await admin
    .from("teams")
    .select("id, user_id, team_name, player1_name, email, notify_binome_requests")
    .in("id", [fromTeamId, toTeamId]);

  if (error || !teams) return new Response(JSON.stringify({ error: "Équipe introuvable" }), { status: 404, headers: CORS_HEADERS });

  const fromTeam = teams.find((t) => t.id === fromTeamId);
  const toTeam   = teams.find((t) => t.id === toTeamId);
  if (!fromTeam || !toTeam) return new Response(JSON.stringify({ error: "Équipe introuvable" }), { status: 404, headers: CORS_HEADERS });

  const callerId = userData.user.id;
  if (fromTeam.user_id !== callerId && toTeam.user_id !== callerId) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 403, headers: CORS_HEADERS });
  }

  const binomeUrl = "https://cestcoinche.fr/binome.html";

  if (event === "request_received" && toTeam.notify_binome_requests) {
    await sendEmail(
      toTeam.email,
      `C'est Coinché ! — ${displayName(fromTeam)} veut faire équipe avec toi 🃏`,
      emailTemplate(
        h2("Une proposition de binôme !") +
        p(`Salut ${toTeam.player1_name},`) +
        p(`<b>${displayName(fromTeam)}</b> t'a envoyé une demande de binôme pour le tournoi de coinche. Jette un œil à son profil et réponds-lui dans l'espace binôme.`) +
        btn("Voir la demande", binomeUrl),
      ),
    );
  } else if (event === "request_accepted" && fromTeam.notify_binome_requests) {
    await sendEmail(
      fromTeam.email,
      `C'est Coinché ! — Votre doublette est enregistrée 🎉`,
      emailTemplate(
        h2("C'est parti !") +
        p(`Salut ${fromTeam.player1_name},`) +
        p(`<b>${toTeam.player1_name}</b> a accepté ta demande. Votre doublette <b>${fromTeam.team_name}</b> est officiellement dans la liste.`) +
        p(`Pensez à régler les 20€ si ce n'est pas encore fait pour confirmer votre place.`) +
        btn("Mon équipe", "https://cestcoinche.fr/mon-equipe.html") +
        btn("Payer sur HelloAsso", "https://www.helloasso.com/", true),
      ),
    );
  } else if (event === "request_declined" && fromTeam.notify_binome_requests) {
    await sendEmail(
      fromTeam.email,
      `C'est Coinché ! — Ta demande de binôme n'a pas abouti`,
      emailTemplate(
        h2("Pas de chance cette fois.") +
        p(`Salut ${fromTeam.player1_name},`) +
        p(`<b>${displayName(toTeam)}</b> n'est plus disponible comme binôme. Pas de panique, d'autres joueur·euses cherchent encore un partenaire.`) +
        btn("Trouver un binôme", binomeUrl),
      ),
    );
  }

  return new Response(JSON.stringify({ ok: true }), { headers: CORS_HEADERS });
}

// ---- Emails : inscription --------------------------------------------------

async function handleInscriptionCreated(body: Record<string, string>) {
  const { email, player1Name, teamName, registrationType } = body;
  if (!email || !player1Name) return new Response(JSON.stringify({ error: "Données manquantes" }), { status: 400, headers: CORS_HEADERS });

  const isSolo = registrationType === "solo";

  await sendEmail(
    email,
    isSolo
      ? `C'est Coinché ! — Tu es inscrit·e en solo 🃏`
      : `C'est Coinché ! — Votre doublette ${teamName} est enregistrée 🃏`,
    isSolo
      ? emailTemplate(
          h2("Bienvenue dans la liste !") +
          p(`Salut ${player1Name},`) +
          p(`Tu es bien inscrit·e en solo pour le tournoi. Direction l'espace binôme pour trouver ton partenaire — une fois en doublette, vous pourrez finaliser votre inscription et régler les 20€.`) +
          btn("Trouver mon binôme", "https://cestcoinche.fr/binome.html") +
          btn("Mon compte", "https://cestcoinche.fr/mon-equipe.html", true),
        )
      : emailTemplate(
          h2("Votre doublette est dans la liste !") +
          p(`Salut ${player1Name},`) +
          p(`La doublette <b>${teamName}</b> est bien enregistrée pour le tournoi. Il vous reste à régler les 20€ pour confirmer votre place définitivement.`) +
          btn("Payer sur HelloAsso", "https://www.helloasso.com/") +
          btn("Mon équipe", "https://cestcoinche.fr/mon-equipe.html", true),
        ),
  );

  return new Response(JSON.stringify({ ok: true }), { headers: CORS_HEADERS });
}

// ---- Emails : paiement confirmé -------------------------------------------

async function handlePaymentConfirmed(teamId: string, authHeader: string) {
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: CORS_HEADERS });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Vérifie que l'appelant est admin
  const { data: adminRow } = await admin.from("admins").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (!adminRow) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 403, headers: CORS_HEADERS });

  const { data: team, error } = await admin
    .from("teams")
    .select("id, team_name, player1_name, email, registration_type, partner_team_id")
    .eq("id", teamId)
    .single();

  if (error || !team) return new Response(JSON.stringify({ error: "Équipe introuvable" }), { status: 404, headers: CORS_HEADERS });

  const isSolo = team.registration_type === "solo";

  await sendEmail(
    team.email,
    isSolo
      ? `C'est Coinché ! — Paiement reçu, plus qu'à trouver ton binôme ✅`
      : `C'est Coinché ! — Paiement reçu, votre place est confirmée ✅`,
    isSolo
      ? emailTemplate(
          h2("Paiement reçu, merci !") +
          p(`Salut ${team.player1_name},`) +
          p(`Ton paiement a bien été enregistré. Il te reste à trouver un·e partenaire dans l'espace binôme pour participer au tournoi — ta place est réservée.`) +
          btn("Trouver mon binôme", "https://cestcoinche.fr/binome.html"),
        )
      : emailTemplate(
          h2("Votre place est confirmée !") +
          p(`Salut ${team.player1_name},`) +
          p(`Le paiement de la doublette <b>${team.team_name}</b> a bien été reçu. Votre place au tournoi est assurée — on se voit les 13 &amp; 14 juin au 109 à Nice !`) +
          btn("Mon équipe", "https://cestcoinche.fr/mon-equipe.html"),
        ),
  );

  return new Response(JSON.stringify({ ok: true }), { headers: CORS_HEADERS });
}

// ---- Email : séparation de binôme -----------------------------------------

async function handlePartnerSplit(myTeamId: string, partnerTeamId: string, authHeader: string) {
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: CORS_HEADERS });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: teams } = await admin
    .from("teams")
    .select("id, user_id, team_name, player1_name, email, notify_binome_requests")
    .in("id", [myTeamId, partnerTeamId]);

  if (!teams) return new Response(JSON.stringify({ error: "Équipe introuvable" }), { status: 404, headers: CORS_HEADERS });

  const myTeam      = teams.find((t) => t.id === myTeamId);
  const partnerTeam = teams.find((t) => t.id === partnerTeamId);
  if (!myTeam || !partnerTeam) return new Response(JSON.stringify({ error: "Équipe introuvable" }), { status: 404, headers: CORS_HEADERS });

  if (myTeam.user_id !== userData.user.id) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 403, headers: CORS_HEADERS });

  if (partnerTeam.notify_binome_requests) {
    await sendEmail(
      partnerTeam.email,
      `C'est Coinché ! — Votre doublette s'est séparée`,
      emailTemplate(
        h2("Retour en solo.") +
        p(`Salut ${partnerTeam.player1_name},`) +
        p(`<b>${myTeam.player1_name}</b> et toi ne formez plus une doublette. Tu es de nouveau inscrit·e en solo et disponible dans l'espace binôme pour trouver un·e nouveau·elle partenaire.`) +
        btn("Trouver un binôme", "https://cestcoinche.fr/binome.html"),
      ),
    );
  }

  return new Response(JSON.stringify({ ok: true }), { headers: CORS_HEADERS });
}

// ---- Serveur --------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const body = await req.json();
    const { event } = body;

    if (!event) return new Response(JSON.stringify({ error: "Événement manquant" }), { status: 400, headers: CORS_HEADERS });

    if (["request_received", "request_accepted", "request_declined"].includes(event)) {
      return await handleBinomeEvents(event, body.fromTeamId, body.toTeamId, authHeader);
    }

    if (event === "inscription_created") {
      return await handleInscriptionCreated(body);
    }

    if (event === "payment_confirmed") {
      return await handlePaymentConfirmed(body.teamId, authHeader);
    }

    if (event === "partner_split") {
      return await handlePartnerSplit(body.myTeamId, body.partnerTeamId, authHeader);
    }

    return new Response(JSON.stringify({ error: "Événement inconnu" }), { status: 400, headers: CORS_HEADERS });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500, headers: CORS_HEADERS });
  }
});
