import { z } from "zod";
import { protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { supabase } from "@/lib/supabase";

async function getSignedUrlsMap(
  imagePaths: string[]
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    imagePaths.map(async (originalPath) => {
      const { data } = await supabase.storage
        .from("files")
        .createSignedUrl(originalPath, 3600);

      const signedUrl = data?.signedUrl;
      if (!signedUrl) return null;

      // Extract just the filename without extension to match the image ID in img tags
      // Path format: "user_id/img_id.png" -> key: "img_id"
      const filename = originalPath.split("/").pop() || "";
      const imageId = filename.replace(/\.[^/.]+$/, "");

      return [imageId, signedUrl] as const;
    })
  );

  return entries.reduce<Record<string, string>>((acc, entry) => {
    if (!entry) return acc;
    const [id, url] = entry;
    acc[id] = url;
    return acc;
  }, {});
}

function normalizeImageId(rawId: string): string {
  // Strip quotes, whitespace, and a single trailing extension from the id
  const cleaned = rawId.replace(/['"`]/g, "").trim();
  return cleaned.replace(/\.[^/.]+$/, "");
}

function injectImageSrcIntoContent(
  content: string,
  imageUrls: Record<string, string>
): string {
  // Find all id={...} patterns first, then work backwards/forwards to get full tag
  const idRegex = /\bid\s*=\s*\{([a-f0-9-]+)\}/gi;
  const replacements: Array<{
    start: number;
    end: number;
    replacement: string;
  }> = [];

  let match;
  // Collect all matches first (process in reverse to maintain indices)
  const matches: Array<{ id: string; idStart: number; idEnd: number }> = [];
  while ((match = idRegex.exec(content)) !== null) {
    const id = match[1];
    if (!id) continue; // Skip if no capture group
    matches.push({
      id,
      idStart: match.index,
      idEnd: match.index + match[0].length,
    });
  }

  // Process matches in reverse order
  for (let i = matches.length - 1; i >= 0; i--) {
    const matchData = matches[i];
    if (!matchData) continue;
    const { id, idStart, idEnd } = matchData;

    // Find tag start (look backwards for <img)
    let tagStart = idStart;
    while (tagStart > 0) {
      if (
        content.substring(tagStart - 1, tagStart + 4).toLowerCase() === "<img"
      ) {
        tagStart = tagStart - 1;
        break;
      }
      tagStart--;
      if (idStart - tagStart > 500) break; // Safety
    }

    // Find tag end (look forwards for /> or >)
    let tagEnd = idEnd;
    let braceDepth = 0;
    let inString = false;
    let stringChar = "";

    while (tagEnd < content.length) {
      const char = content[tagEnd];

      if (!inString) {
        if (char === "{") braceDepth++;
        else if (char === "}") braceDepth--;
        else if ((char === '"' || char === "'") && braceDepth === 0) {
          inString = true;
          stringChar = char;
        } else if (
          braceDepth === 0 &&
          (char === ">" || (char === "/" && content[tagEnd + 1] === ">"))
        ) {
          tagEnd = char === "/" ? tagEnd + 2 : tagEnd + 1;
          break;
        }
      } else {
        if (char === stringChar && content[tagEnd - 1] !== "\\") {
          inString = false;
        }
      }

      tagEnd++;
      if (tagEnd - idEnd > 2000) break; // Safety
    }

    if (tagStart < idStart && tagEnd > idEnd) {
      const fullTag = content.substring(tagStart, tagEnd);
      const normalizedId = normalizeImageId(id);
      const url = imageUrls[normalizedId] ?? imageUrls[id];

      if (url && !fullTag.includes("src=")) {
        // Extract alt attribute from the tag if present
        // More robust to handle various formats: alt="text", alt='text', alt=text
        const altMatch =
          fullTag.match(/alt\s*=\s*["']([^"']*)["']/i) ||
          fullTag.match(/alt\s*=\s*([^\s>]+)/i);
        const alt = altMatch ? altMatch[1] : "";

        // Convert directly to markdown image syntax instead of HTML tag
        const markdownImage = `![${alt}](${url})`;
        replacements.push({
          start: tagStart,
          end: tagEnd,
          replacement: markdownImage,
        });
      }
    }
  }

  // Apply replacements in reverse order
  let result = content;
  for (const { start, end, replacement } of replacements) {
    result = result.substring(0, start) + replacement + result.substring(end);
  }

  return result;
}

export const getSource = protectedProcedure
  .input(
    z.object({
      sourceId: z.string(),
    })
  )
  .query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const { sourceId } = input;
    const source = await ctx.db.source.findUnique({
      where: {
        id: sourceId,
        userId: userId,
      },
    });
    if (!source) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Source not found" });
    }

    let imageSignedUrls: Record<string, string> = {};
    if (source.image_paths.length > 0) {
      imageSignedUrls = await getSignedUrlsMap(source.image_paths);
    }

    let contentWithImages: unknown = source.content;
    if (
      source.content &&
      Array.isArray(source.content) &&
      Object.keys(imageSignedUrls).length > 0
    ) {
      contentWithImages = (
        source.content as Array<{
          type: "text" | "table";
          content: string;
          [key: string]: unknown;
        }>
      ).map((block) => {
        // Inject src attributes and convert to markdown in one step
        return {
          ...block,
          content: injectImageSrcIntoContent(block.content, imageSignedUrls),
        };
      });
    }

    return {
      ...source,
      content: contentWithImages,
    };
  });
