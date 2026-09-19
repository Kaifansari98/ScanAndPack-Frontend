import axios from "@/lib/axios";
import * as Print from "expo-print";
import { handlePdfOrPrintResponse } from "./projectPdfUtils";

export interface BoxDetailsInput {
  vendor_id: number;
  project_id: number;
  id: number; // box_id
}

const AUTO_PRINT_API_ATTEMPTS = 3;
const AUTO_PRINT_RETRY_DELAY_MS = 750;

const wait = (delay: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delay));

export const fetchBoxDetailsAndShare = async ({
  vendor_id,
  project_id,
  id,
}: BoxDetailsInput): Promise<void> => {
  try {
    const res = await axios.get(
      `/boxes/boxes/pdf/${id}/${project_id}/${vendor_id}`,
    );

    await handlePdfOrPrintResponse(res.data, `box_${id}_label.pdf`);
  } catch (err) {
    console.error("Failed to fetch or share box PDF:", err);
    throw err;
  }
};

/**
 * Fetches a box label and opens the native print flow directly. This is kept
 * separate from the download/share action used on the box details screens.
 */
export const printBoxLabel = async ({
  vendor_id,
  project_id,
  id,
}: BoxDetailsInput): Promise<void> => {
  let printHtml: string | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= AUTO_PRINT_API_ATTEMPTS; attempt += 1) {
    try {
      const response = await axios.get(
        `/boxes/boxes/pdf/${id}/${project_id}/${vendor_id}`,
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data?.message || "Failed to generate box label",
        );
      }

      printHtml = response.data?.data?.print_html || response.data?.print_html;

      if (!printHtml) {
        throw new Error(
          response.data?.message || "Printable box label is unavailable",
        );
      }

      break;
    } catch (error: unknown) {
      lastError = error;

      if (attempt < AUTO_PRINT_API_ATTEMPTS) {
        await wait(AUTO_PRINT_RETRY_DELAY_MS);
      }
    }
  }

  if (!printHtml) {
    throw lastError instanceof Error
      ? lastError
      : new Error("Printable box label is unavailable");
  }

  // The web label contains its own window.print() call. Expo Print owns the
  // native print flow, so disable the embedded browser print call first.
  const appControlledHtml = String(printHtml).replace(
    /window\.print\(\);/g,
    "window.__printHandledByApp = true;",
  );

  await Print.printAsync({ html: appControlledHtml });
};

// Backward-compatible alias
export const fetchBoxtDetailsAndShare = fetchBoxDetailsAndShare;
