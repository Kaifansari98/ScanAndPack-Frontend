import axios from "@/lib/axios";
import * as ExpoFS from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export interface PDFData {
  vendor_id: number;
  id: number; // project_id
}

/**
 * Downloads PDF from pre-signed S3 URL to local Expo cache directory and opens native share dialog.
 */
export async function downloadAndSharePdf(downloadUrl: string, fileName: string): Promise<void> {
  const sharingAvailable = await Sharing.isAvailableAsync();
  if (!sharingAvailable) {
    throw new Error("Sharing is not available on this device");
  }

  const cleanDir = ExpoFS.cacheDirectory?.endsWith("/")
    ? ExpoFS.cacheDirectory
    : `${ExpoFS.cacheDirectory}/`;

  // Remove any query params or slashes from fileName for local path
  const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, "_");
  const localUri = `${cleanDir}${safeFileName}`;

  const downloadRes = await ExpoFS.downloadAsync(downloadUrl, localUri);

  await Sharing.shareAsync(downloadRes.uri, {
    mimeType: "application/pdf",
    dialogTitle: `Share ${fileName}`,
    UTI: "com.adobe.pdf",
  });
}

/**
 * Helper to handle response containing either S3 download_url or HTML print string.
 */
export async function handlePdfOrPrintResponse(resData: any, defaultFileName: string): Promise<void> {
  const downloadUrl: string | undefined =
    resData?.data?.download_url || resData?.download_url || resData?.data?.pdf_url;
  const printHtml: string | undefined =
    resData?.data?.print_html || resData?.print_html;
  const fileName: string =
    resData?.data?.file_name || resData?.file_name || defaultFileName;

  if (downloadUrl) {
    await downloadAndSharePdf(downloadUrl, fileName);
    return;
  }

  if (printHtml) {
    const { uri } = await Print.printToFileAsync({ html: printHtml });

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (sharingAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${fileName}`,
        UTI: "com.adobe.pdf",
      });
    } else {
      await Print.printAsync({ html: printHtml });
    }
    return;
  }

  throw new Error(resData?.message || "Failed to get PDF URL or printable content");
}

export async function fetchProjectDetailsAndShare(project: PDFData): Promise<void> {
  try {
    const res = await axios.get(
      `/boxes/project-pdf/${project.id}/${project.vendor_id}`
    );

    await handlePdfOrPrintResponse(res.data, `project_${project.id}_report.pdf`);
  } catch (err) {
    console.error("Failed to generate or share project PDF:", err);
    throw err;
  }
}

export async function fetchAllBoxesPdfAndShare(project: PDFData): Promise<void> {
  try {
    const res = await axios.get(
      `/boxes/all-boxes-pdf/${project.id}/${project.vendor_id}`
    );

    await handlePdfOrPrintResponse(res.data, `all_boxes_${project.id}.pdf`);
  } catch (err) {
    console.error("Failed to generate or share all boxes PDF:", err);
    throw err;
  }
}

export async function fetchProjectFullReportAndShare(project: PDFData): Promise<void> {
  try {
    const res = await axios.get(
      `/boxes/project-full-report/${project.id}/${project.vendor_id}`
    );

    await handlePdfOrPrintResponse(res.data, `project_full_report_${project.id}.pdf`);
  } catch (err) {
    console.error("Failed to generate or share project full report:", err);
    throw err;
  }
}
