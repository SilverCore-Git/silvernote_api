import  type { NextFunction, Response, Request } from "express";
import config from '../config.json';
import { error } from "console";

export default function  AllowedOriginCheck (req: Request, res: Response, next: NextFunction) 
{

    const allowedOrigins = config.corsOptions.origin;

    const origin = req.headers.origin;
    const client_sk = req.headers.authorization;
    const cloud_sk = process.env.MOBILE_SECRET_KEY;

    if (client_sk)
    {
        if (!cloud_sk) 
        {
            res.status(502).json({ error: true, message: 'cloud sk not found' });
            return;
        }

        if (client_sk !== client_sk) 
        {
            res.status(402).json({ error: true, message: 'client and cloud sk doesn\'t mach' });
            return;
        }

        if (cloud_sk && client_sk === cloud_sk) 
        {
            return next();
        }

        // res.status(501).json({ error: true, message: 'An error has alive' });
        // return;
    }

    if (!origin || origin && !allowedOrigins.includes(origin)) {
        res.status(403).json({ error: true, message: "Invalid or missing origin" });
        return;
    }

    next();

};