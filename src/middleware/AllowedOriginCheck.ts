import  type { NextFunction, Response, Request } from "express";
import config from '../config.json';

export default function  AllowedOriginCheck (req: Request, res: Response, next: NextFunction) 
{

    const allowedOrigins = config.corsOptions.origin;

    const origin = req.headers.origin;

    if (!origin || origin && !allowedOrigins.includes(origin)) {
        res.status(403).json({ error: true, message: "Invalid or missing origin" });
        return;
    }

    next();

};