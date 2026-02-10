import { weight } from "@/data/generic";
import axios from "@/lib/axios";
import { ScanAndPackUrl } from "@/utils/getAssetUrls";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { getBoxWeight } from "./BoxWeight";
import { getProjectWeight } from "./ProjectWeight";

export interface PDFData {
  vendor_id: number;
  id: number;
  client_id: number;
}
// ✅ Generate QR as base64 PNG from third-party API
async function generateQRBase64(qrValue: string): Promise<string> {
  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
    qrValue
  )}&size=150x150`;

  const response = await FileSystem.downloadAsync(
    apiUrl,
    FileSystem.cacheDirectory + "qr.png"
  );

  const base64 = await FileSystem.readAsStringAsync(response.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return `data:image/png;base64,${base64}`;
}

export async function fetchProjectDetailsAndShare(project: PDFData) {
  try {
    const permissionResponse = await Sharing.isAvailableAsync();
    if (!permissionResponse) {
      console.error("❌ Sharing is not available on this device");
      return;
    }

    const res = await axios.get(
      `/boxes/details/vendor/${project.vendor_id}/project/${project.id}/client/${project.client_id}/boxes`
    );

    // console.log(res)

    const ProjectWeight = await getProjectWeight(project.vendor_id, project.id);
    const { vendor, project: projectDetails, boxes, client } = res.data;

    // ✅ Use base64 QR image
    const qrValue = `${project.vendor_id}, ${project.id}, ${project.client_id}`;
    const qrBase64 = await generateQRBase64(qrValue);

    const boxesWithWeights = await Promise.all(
      boxes.map(async (box: any) => {
        const { box_weight } = await getBoxWeight(
          project.vendor_id,
          project.id,
          box.box_id
        );
        return { box_weight };
      })
    );

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .logo { width: 100px; }
            .vendor-details { text-align: right; }
            .vendor-details h2 { margin: 0; font-size: 18px; }
            .vendor-details p { margin: 5px 0; font-size: 14px; }
            .details { margin-bottom: 20px; }
            .details p { margin: 5px 0; font-size: 16px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
            th { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; color:#fff; background-color: #3b3b3b; font-weight: bold; }
            .table-container { margin-top: 10px; }
            .row { background-color: #000000; height: 1px; border: none }
            .project-name { text-align: center; }
            .client-section p { font-size: 14px; margin: 2px 0; }
            .info-qr-container { display: flex; flex-direction: row; justify-content: space-between; width: 100%; align-items: end; margin-bottom: 10px;}
            .qrContainer { height: 80px; width: 80px; border: 1px solid black; display: flex; align-items: center; justify-content: center; }
            .project-details-row { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: bold; }
            p { margin: 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${ScanAndPackUrl(vendor.logo)}" class="logo" alt="Logo" />
            <div class="vendor-details">
              <h2>${vendor.vendor_name.replace(/&/g, "&amp;")}</h2>
              <p>Contact: ${vendor.primary_contact_number}</p>
              <p>Email: ${vendor.primary_contact_email}</p>
              <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div class="info-qr-container">
            <div class="client-section">
              <p><strong>Client Name:</strong> ${client.name}</p>
              <p><strong>Contact:</strong> ${client.contact}</p>
              <p><strong>Email:</strong> ${client.email}</p>
              <p><strong>Address:</strong> ${client.address}, ${client.city}, ${client.state}, ${client.country} - ${client.pincode}</p>
            </div>
            <div class="qrContainer">
              <img src="${qrBase64}" alt="QR Code" style="width: 70px; height: 70px;" />
            </div>
          </div>
          <hr class="row" />
          <div class="project-details-row">
            <p><strong>${projectDetails.project_name.replace(/&/g, "&amp;")}</strong></p>
            <p><strong>Project Weight:</strong> ${ProjectWeight.project_weight} ${weight}</p>
          </div>
          <div class="table-container">
            <table>
              <tr>
                <th>Sr No.</th>
                <th>Box Name</th>
                <th>Items Count</th>
                <th>Weight</th>
              </tr>
              ${boxes
                .map(
                  (box: any, index: number) => `
                    <tr>
                      <td style="width: 8%;">${index + 1}</td>
                      <td style="width: 52%;">${box.box_name.replace(/&/g, "&amp;")}</td>
                      <td style="width: 10%;">${box.total_items}</td>
                      <td style="width: 10%;">${boxesWithWeights[index]?.box_weight ?? "N/A"} ${weight}</td>
                    </tr>
                  `
                )
                .join("")}
            </table>
          </div>
        </body>
      </html>
    `;

    const safeProjectName = projectDetails.project_name.replace(
      /[^a-zA-Z0-9-_]/g,
      "_"
    );
    const fileName = `${safeProjectName}-Boxes.pdf`;

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });
    const newPath = FileSystem.documentDirectory + fileName;

    await FileSystem.moveAsync({ from: uri, to: newPath });

    await Sharing.shareAsync(newPath, {
      mimeType: "application/pdf",
      dialogTitle: `Share ${fileName}`,
      UTI: "com.adobe.pdf",
    });
  } catch (err) {
    console.error("❌ Failed to generate or share PDF:", err);
    throw err;
  }
}