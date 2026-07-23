import { listConversations, saveConversation } from "@/lib/conversation-store";
import { failure, ok } from "@/lib/http";

export async function GET() {
  try { return ok(await listConversations()); }
  catch (error) { return failure(error, 500); }
}

export async function POST(request: Request) {
  try { return ok(await saveConversation(await request.json()), { status: 201 }); }
  catch (error) { return failure(error); }
}
