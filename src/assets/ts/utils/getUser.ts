import { clerkClient } from '@clerk/clerk-sdk-node';


export async function getUser(
    clerkUserId: string
): Promise<any> 
{

    try {

        const clerkUser = await clerkClient.users.getUser(clerkUserId);

        return {

            user_id: clerkUser.id,
            
            username: clerkUser.username || 
                      `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 
                      clerkUser.emailAddresses[0]?.emailAddress.split('@')[0],
            imageUrl: clerkUser.imageUrl,

        };
    } 
    catch (error) 
    {

        console.error(`Erreur Clerk pour l'ID ${clerkUserId}:`, error);

        return {
            user_id: clerkUserId,
            username: "Utilisateur inconnu",
            imageUrl: "https://www.gravatar.com/avatar/?d=mp"
        };

    }

}