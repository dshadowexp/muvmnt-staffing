import { getSession } from "@/lib/session";
import { createAdminClient } from "@/services/supabase/server";
import { redirect } from "next/navigation";

export async function createClient({name, type}: {name: string, type: string}) {
    const session = await getSession();
    if (!session) {
      return redirect("/sign-in");
    }
  
    const { userId } = session;
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("clients")
        .insert({ name, type, 'user_id': userId })
        .select()
        .single();
  
    if (error) {
        throw new Error(error.message);
    }
  }
  
  export async function updateClient(clientId: string, { name, type }: {name: string, type: string}) {
    const session = await getSession();
    if (!session) {
      return redirect("/sign-in");
    }
  
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("clients")
      .update({ name, type })
      .eq("id", clientId)
      .select()
      .single();
  
    if (error) {
      throw new Error(error.message);
    }
  
    return data;
  }