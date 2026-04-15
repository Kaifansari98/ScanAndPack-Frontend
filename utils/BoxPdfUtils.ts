import axios from "@/lib/axios";
import * as ExpoFS from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export interface BoxDetailsInput {
  vendor_id: number;
  project_id: number;
  id: number; // box_id
}

export const fetchBoxtDetailsAndShare = async ({
  vendor_id,
  project_id,
  id,
}: BoxDetailsInput) => {
  try {
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      console.error("Sharing is not available on this device");
      return;
    }

    const res = await axios.get(`/boxes/boxes/pdf/${id}/${project_id}/${vendor_id}`);

    const downloadUrl: string = res.data?.data?.download_url;
    const fileName: string    = res.data?.data?.file_name;

    if (!downloadUrl || !fileName) {
      console.error("PDF generation failed:", res.data?.message);
      return;
    }

    console.log("Downloading PDF from:", downloadUrl);

    const localUri = `${ExpoFS.cacheDirectory}${fileName}`;

    const downloadRes = await ExpoFS.downloadAsync(downloadUrl, localUri);

    console.log("PDF saved at:", downloadRes.uri);

    await Sharing.shareAsync(downloadRes.uri, {
      mimeType: "application/pdf",
      dialogTitle: `Share ${fileName}`,
      UTI: "com.adobe.pdf",
    });

  } catch (err) {
    console.error("Failed to fetch or share box PDF:", err);
  }
};