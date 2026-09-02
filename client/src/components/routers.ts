import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { extractionRuntimeHealth, extractPdfDocument } from "./pdfExtractor";
import { storagePut } from "./storage";

const MAX_BASE64_LENGTH = 14_000_000;

function toBanglaDigits(value: string) {
  return value.replace(/[0-9]/gu, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
}

function formatDateOfBirth(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${day} ${months[Number(month) - 1] || month} ${year}`;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  pdf: router({
    health: publicProcedure.query(() => extractionRuntimeHealth()),
    extract: publicProcedure
      .input(
        z.object({
          fileName: z.string().min(1).max(180),
          mimeType: z.string().optional(),
          contentBase64: z.string().min(1).max(MAX_BASE64_LENGTH),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (input.mimeType && input.mimeType !== "application/pdf") {
          throw new Error("Please upload a PDF file.");
        }

        const buffer = Buffer.from(input.contentBase64, "base64");
        const result = await extractPdfDocument(buffer);
        const { images, fields } = result;
        const host = ctx.req.get("host") || "localhost";
        const forwardedProto = ctx.req.get("x-forwarded-proto")?.split(",")[0]?.trim();
        const protocol = host.startsWith("localhost")
          ? (forwardedProto || ctx.req.protocol)
          : "https";
        const origin = `${protocol}://${host}`;
        const imageLinks: { userIMG: string | null; signIMG: string | null } = {
          userIMG: null,
          signIMG: null,
        };

        await Promise.all(
          images.map(async (image) => {
            const stored = await storagePut(
              `pdf-extracted/${fields.nationalId || "unknown"}/${image.role}.png`,
              image.buffer,
              image.contentType,
            );
            imageLinks[image.role === "user" ? "userIMG" : "signIMG"] =
              `${origin}${stored.url}`;
          }),
        );

        const data = {
          nameBangla: fields.nameBangla || "",
          nameEnglish: (fields.nameEnglish || "").toUpperCase(),
          nationalId: fields.nationalId || "",
          pin: fields.pin || "",
          dateOfBirth: formatDateOfBirth(fields.dateOfBirth || ""),
          dateOfToday: toBanglaDigits(new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Dhaka",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date()).replaceAll("/", "-")),
          fatherName: fields.fatherName || "",
          motherName: fields.motherName || "",
          gender: fields.gender || "",
          religion: fields.religion || "",
          birthPlace: fields.birthPlace || "",
          bloodGroup: fields.bloodGroup || "",
          userIMG: imageLinks.userIMG,
          signIMG: imageLinks.signIMG,
          address: fields.address || "",
        };

        return {
          code: 200,
          success: true,
          message: "Data fetched successfully",
          developer: "Mehraj chowdhury",
          data,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
