import { verifyToken } from "@clerk/express";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";

const get_user_info: Tool = {
  name: "get_user_info",
  description: "Get user info with session token",

  params: {
    userID: z.string().describe('user id'),
    token: z.string().describe('session token')
  },

  handler: async (parms) => {

    try {

        const payload = await verifyToken(parms.token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });

        if (payload.sub !== parms.userID)
        {
            return {
                isError: true,
                content: [{ type: "text", text: "Erreur de vérification du token." }]
            };
        }

        
        const res = {
            userId: payload.sub,
            issuedAt: payload.iat,
            expiresAt: payload.exp,
            email: payload.email,            
            name: payload.name,
            metadata: payload.publicMetadata
        };

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(res, null, 2), 
                },
            ],
        };

    } 
    catch (error)
    {
        return {
            isError: true,
            content: [{ type: "text", text: "Erreur de vérification du token." }]
        };
    }

  }
}

export default get_user_info;