import { env } from "@/data/env/server";
import { HumeClient } from "hume";

export async function fetchChatMessages(humeChatId: string, humeGroupChatId: string | null) {
    const client = new HumeClient({ apiKey: env.HUME_API_KEY });

    const allChatEvents: any[] = [];
    if (humeGroupChatId) {
        const chatGroupEventsIterator = await client.empathicVoice.chatGroups.listChatGroupEvents(humeGroupChatId,);
        
        for await (const chatEvent of chatGroupEventsIterator) {
            allChatEvents.push(chatEvent)
        }
    } else if (humeChatId) {
        const chatEventsIterator = await client.empathicVoice.chats.listChatEvents(
            humeChatId,
            { pageNumber: 0, pageSize: 100 }
        )
        
        for await (const chatEvent of chatEventsIterator) {
            allChatEvents.push(chatEvent)
        }
    }

    return allChatEvents
}