import { listConversations } from "@/lib/conversation-store";
import { indexAssets } from "@/lib/asset-store";
import { failure, ok } from "@/lib/http";

export async function GET() {
  try {
    return ok(await indexAssets(await listConversations()));
  } catch (error) {
    return failure(error, 500);
  }
}
