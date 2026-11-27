import { backendApi, backendProxyResponse } from "@/lib/server-api";

export async function GET() {
  return backendProxyResponse(
    await backendApi("/wishlist", { method: "GET" }),
    "Failed to load your wishlist.",
  );
}
