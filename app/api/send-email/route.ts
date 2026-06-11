import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return Response.json(
        { error: 'Champs requis manquants : to, subject, html' },
        { status: 400 }
      );
    }

    // Mode simulation si aucune clé d'API n'est définie
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('re_placeholder') || process.env.RESEND_API_KEY === '') {
      console.warn("⚠️ RESEND_API_KEY non configurée ou contient un placeholder. Simulation de l'envoi d'e-mail.");
      console.log("-----------------------------------------");
      console.log(`[E-mail simulé] Destinataire : ${to}`);
      console.log(`[E-mail simulé] Objet : ${subject}`);
      console.log(`[E-mail simulé] Contenu : ${html}`);
      console.log("-----------------------------------------");
      return Response.json({ success: true, simulated: true });
    }

    const { data, error } = await resend.emails.send({
      from: 'PharmaGeo <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Erreur API Resend :', error);
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ success: true, data });
  } catch (err: unknown) {
    console.error('Erreur send-email endpoint :', err);
    const errorMessage = err instanceof Error ? err.message : 'Une erreur inconnue est survenue';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
