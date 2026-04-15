import axios from "@/lib/axios";
import * as ExpoFS from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export interface PDFData {
  vendor_id: number;
  id: number; // project_id
}

export async function fetchProjectDetailsAndShare(project: PDFData) {
  try {
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      console.error("Sharing is not available on this device");
      return;
    }

    const res = await axios.get(
      `/boxes/project-pdf/${project.id}/${project.vendor_id}`
    );

    const downloadUrl: string = res.data?.data?.download_url;
    const fileName: string    = res.data?.data?.file_name;

    if (!downloadUrl || !fileName) {
      console.error("Project PDF generation failed:", res.data?.message);
      return;
    }

    console.log("Downloading project PDF from:", downloadUrl);

    const localUri = `${ExpoFS.cacheDirectory}${fileName}`;
    const downloadRes = await ExpoFS.downloadAsync(downloadUrl, localUri);

    console.log("Project PDF saved at:", downloadRes.uri);

    await Sharing.shareAsync(downloadRes.uri, {
      mimeType: "application/pdf",
      dialogTitle: `Share ${fileName}`,
      UTI: "com.adobe.pdf",
    });

  } catch (err) {
    console.error("Failed to generate or share project PDF:", err);
    throw err;
  }
}

export async function fetchAllBoxesPdfAndShare(project: PDFData) {
  try {
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      console.error("Sharing is not available on this device");
      return;
    }

    const res = await axios.get(
      `/boxes/all-boxes-pdf/${project.id}/${project.vendor_id}`
    );

    const downloadUrl: string = res.data?.data?.download_url;
    const fileName: string    = res.data?.data?.file_name;

    if (!downloadUrl || !fileName) {
      console.error("All boxes PDF generation failed:", res.data?.message);
      return;
    }

    console.log("Downloading all boxes PDF from:", downloadUrl);

    const localUri = `${ExpoFS.cacheDirectory}${fileName}`;
    const downloadRes = await ExpoFS.downloadAsync(downloadUrl, localUri);

    console.log("All boxes PDF saved at:", downloadRes.uri);

    await Sharing.shareAsync(downloadRes.uri, {
      mimeType: "application/pdf",
      dialogTitle: `Share ${fileName}`,
      UTI: "com.adobe.pdf",
    });

  } catch (err) {
    console.error("Failed to generate or share all boxes PDF:", err);
    throw err;
  }
}

export async function fetchProjectFullReportAndShare(project: PDFData) {
  try {
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      console.error("Sharing is not available on this device");
      return;
    }
 
    const res = await axios.get(
      `/boxes/project-full-report/${project.id}/${project.vendor_id}`
    );
 
    const downloadUrl: string = res.data?.data?.download_url;
    const fileName: string    = res.data?.data?.file_name;
 
    if (!downloadUrl || !fileName) {
      console.error("Project full report failed:", res.data?.message);
      return;
    }
 
    console.log("Downloading full report from:", downloadUrl);
 
    const localUri = `${ExpoFS.cacheDirectory}${fileName}`;
    const downloadRes = await ExpoFS.downloadAsync(downloadUrl, localUri);
 
    console.log("Full report saved at:", downloadRes.uri);
 
    await Sharing.shareAsync(downloadRes.uri, {
      mimeType: "application/pdf",
      dialogTitle: `Share ${fileName}`,
      UTI: "com.adobe.pdf",
    });
 
  } catch (err) {
    console.error("Failed to generate or share project full report:", err);
    throw err;
  }
}
