import _fetch from 'node-fetch'
const USER_AGENT = "silvernote-mcp/1.0";

export default async function fetch(url: string, parms: any) 
{
    return await fetch(url, {
        ...parms,
        Headers: {
            "User-Agent": USER_AGENT
        }
    })
}