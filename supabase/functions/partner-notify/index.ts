// C'EST COINCHÉ ! — Edge Function "partner-notify"
// Envoie un email (via Resend) quand une demande de binôme est reçue,
// acceptée ou refusée. Appelée depuis js/binome.js juste après l'action
// sur la table `partner_requests`.
//
// Déploiement :
//   supabase functions deploy partner-notify
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//
// Adresse d'expédition : il faut soit vérifier un domaine sur Resend et
// utiliser une adresse de ce domaine (ex: notifications@cestcoinche.fr),
// soit, pour tester avant ça, utiliser "onboarding@resend.dev" — qui ne
// peut envoyer que vers l'adresse email du compte Resend utilisé.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// TODO: une fois un domaine vérifié sur Resend, remplacer par
// "C'est Coinché <notifications@cestcoinche.fr>" (ou ton domaine).
// "onboarding@resend.dev" ne peut envoyer que vers l'email du compte Resend.
const FROM_ADDRESS = "C'est Coinché <onboarding@resend.dev>";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const { event, fromTeamId, toTeamId } = await req.json();

    if (
      !["request_received", "request_accepted", "request_declined"].includes(event) ||
      !fromTeamId || !toTeamId
    ) {
      return new Response(JSON.stringify({ error: "Requête invalide" }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: CORS_HEADERS,
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: teams, error } = await admin
      .from("teams")
      .select("id, user_id, team_name, player1_name, email, notify_binome_requests")
      .in("id", [fromTeamId, toTeamId]);

    if (error || !teams) {
      return new Response(JSON.stringify({ error: "Équipe introuvable" }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    const fromTeam = teams.find((t) => t.id === fromTeamId);
    const toTeam = teams.find((t) => t.id === toTeamId);
    if (!fromTeam || !toTeam) {
      return new Response(JSON.stringify({ error: "Équipe introuvable" }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    // L'appelant doit être l'une des deux équipes concernées.
    const callerId = userData.user.id;
    if (fromTeam.user_id !== callerId && toTeam.user_id !== callerId) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 403,
        headers: CORS_HEADERS,
      });
    }

    const binomeUrl = "https://antoinegdx.github.io/Tournoi-coinche/binome.html";

    if (event === "request_received" && toTeam.notify_binome_requests) {
      await sendEmail(
        toTeam.email,
        "Tu as reçu une proposition de binôme — C'est Coinché !",
        `<p>Salut ${toTeam.player1_name},</p>
         <p><b>${displayName(fromTeam)}</b> souhaite faire équipe avec toi pour le tournoi de coinche.</p>
         <p><a href="${binomeUrl}">Réponds dans l'espace binôme →</a></p>`,
      );
    } else if (event === "request_accepted" && fromTeam.notify_binome_requests) {
      await sendEmail(
        fromTeam.email,
        "Ta demande de binôme a été acceptée — C'est Coinché !",
        `<p>Salut ${fromTeam.player1_name},</p>
         <p><b>${displayName(toTeam)}</b> a accepté de faire équipe avec toi. Votre doublette est désormais enregistrée pour le tournoi.</p>
         <p><a href="https://antoinegdx.github.io/Tournoi-coinche/mon-equipe.html">Voir mon équipe →</a></p>`,
      );
    } else if (event === "request_declined" && fromTeam.notify_binome_requests) {
      await sendEmail(
        fromTeam.email,
        "Ta demande de binôme a été refusée — C'est Coinché !",
        `<p>Salut ${fromTeam.player1_name},</p>
         <p><b>${displayName(toTeam)}</b> a décliné ta proposition de binôme.</p>
         <p><a href="${binomeUrl}">Trouver un·e autre binôme →</a></p>`,
      );
    }

    return new Response(JSON.stringify({ ok: true }), { headers: CORS_HEADERS });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
});
