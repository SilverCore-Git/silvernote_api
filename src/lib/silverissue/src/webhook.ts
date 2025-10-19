export class Webhook {

  private webhookUrl: string;

  constructor(webhookUrl: string) {
    if (!webhookUrl) throw new Error("Webhook URL manquante.");
    this.webhookUrl = webhookUrl;
  }

  /**
   * Envoie un message brut (texte simple ou Markdown) au webhook Discord.
   */
  async sendMessage(content: string): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[SilverIssue] Erreur Discord Webhook : ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("[SilverIssue] Erreur lors de l’envoi :", error);
    }
  }

  /**
   * Envoie un message d’erreur formaté dans Discord.
   * Idéal pour signaler une issue, une exception, etc.
   */
  async sendError(error: unknown, context?: string): Promise<void> {
    const errorMessage =
      error instanceof Error ? error.stack || error.message : String(error);

    const message = {
      embeds: [
        {
          title: "🚨 Nouvelle erreur détectée",
          description:
            "```" + errorMessage.slice(0, 4000) + "```", // Discord limite à 4096 chars
          color: 0xff0000,
          fields: context
            ? [{ name: "Contexte", value: context, inline: false }]
            : [],
          footer: {
            text: `SilverNote • ${new Date().toLocaleString()}`,
          },
        },
      ],
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur Discord Webhook : ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error("[SilverIssue] Échec d’envoi du message d’erreur :", err);
    }

  }
}