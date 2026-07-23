import { deleteConversation, getConversation, saveConversation } from "@/lib/conversation-store";
import { failure, ok } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const item = await getConversation((await context.params).id);
    return item ? ok(item) : failure(new Error("会话不存在"), 404);
  } catch (error) { return failure(error, 500); }
}

export async function PUT(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    const body = await request.json();
    if (body.id !== id) throw new Error("会话 ID 不匹配");
    return ok(await saveConversation(body));
  } catch (error) { return failure(error); }
}

export async function DELETE(_: Request, context: Context) {
  try {
    await deleteConversation((await context.params).id);
    return ok({ deleted: true });
  } catch (error) { return failure(error); }
}
