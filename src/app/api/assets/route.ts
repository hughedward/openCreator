import { listConversations } from "@/lib/conversation-store";
import {
  indexAssets, moveAssetToTrash, permanentlyDeleteAsset, restoreAsset,
} from "@/lib/asset-store";
import { failure, ok } from "@/lib/http";

export async function GET() {
  try {
    return ok(await indexAssets(await listConversations()));
  } catch (error) {
    return failure(error, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const input = await request.json() as { action?: string; path?: string };
    if (!input.path) throw new Error("缺少资产路径");
    if (input.action === "trash") {
      return ok({ path: await moveAssetToTrash(input.path) });
    }
    if (input.action === "restore") {
      return ok({ path: await restoreAsset(input.path) });
    }
    throw new Error("不支持的资产操作");
  } catch (error) {
    return failure(error, 400);
  }
}

export async function DELETE(request: Request) {
  try {
    const path = new URL(request.url).searchParams.get("path");
    if (!path) throw new Error("缺少资产路径");
    await permanentlyDeleteAsset(path);
    return ok({ deleted: true });
  } catch (error) {
    return failure(error, 400);
  }
}
