import { ErrorRequestHandler } from "express";
import { Webhook } from "./src/webhook.js";

const webhook = new Webhook('https://discord.com/api/webhooks/1429472000253890601/vw_Kx1KoHjig2I05iumB9WhyT0nSvh78n2eEclUxd19RNsieJ8khUowjcfmCKtWSxTUD');

process.on("uncaughtException", async (error) => {
    console.error("Erreur non gérée :", error);
    await webhook.sendError(error, "uncaughtException");
});

process.on("unhandledRejection", async (reason) => {
    console.error("Rejet non géré :", reason);
    await webhook.sendError(reason, "unhandledRejection");
});

const errorHandler: ErrorRequestHandler = (err, req, res, next): void => {
    webhook.sendError(err, `Route : ${req.method} ${req.url}`);
    next();
}

export {
    webhook,
    errorHandler as SilverIssueMiddleware
}