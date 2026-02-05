import { Router, Request, Response } from 'express';
import GameManager from '../assets/ts/db/2048_db.js';


const router = Router();


router.post('/update', async (req: Request, res: Response) => {

    const data = req.body.data;

    if (!data || !data.id)
    {
        res.status(400).json({ 
            error: true,
            message: "Données invalides",
            received: req.body,
            need: {
                id: "string",
                best_score: "number",
                max_tile: "number",
                lastPlayed: "Date",
            }
        });
        return;
    }

    try {

        GameManager.update(data);
        res.json({ success: true });

    }
    catch (error) {
        res.status(500).json({ 
            error: true, 
            message: "Erreur serveur", 
            details: error 
        });
    }

});


router.get('/leaderboard', async (req: Request, res: Response) => {

    try {

        const allPlayers = await GameManager.getAll();
        
        const sortedByBestScore = [...allPlayers].sort((a, b) => b.best_score - a.best_score);
        const sortedByTotalScore = [...allPlayers].sort((a, b) => b.total_score - a.total_score);
        const sortedByMaxTile = [...allPlayers].sort((a, b) => b.max_tile - a.max_tile);

        res.json({
            success: true,
            leaderboard: {
                best_score: sortedByBestScore,
                total_score: sortedByTotalScore,
                max_tile: sortedByMaxTile
            }
        });

    }
    catch (error) {
        res.status(500).json({ 
            error: true, 
            message: "Erreur serveur", 
            details: error 
        });
    }

});


router.get('/player/:id', async (req: Request, res: Response) => {

    const playerId = req.cookies.userId;

    try { 

        const playerData = await GameManager.getByUserID(playerId);

        if (!playerData) {
            res.status(404).json({ 
                error: true,
                message: "Joueur non trouvé",
                playerId
            });
            return;
        }

        res.json({
            success: true,
            player: playerData
        });

    }
    catch (error) {
        res.status(500).json({ 
            error: true, 
            message: "Erreur serveur", 
            details: error 
        });
    }

});



export default router;
