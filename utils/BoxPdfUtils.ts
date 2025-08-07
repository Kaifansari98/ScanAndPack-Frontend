import axios from "@/lib/axios";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { ScanAndPackUrl } from "@/utils/getAssetUrls";
import { getBoxWeight } from "./BoxWeight";
import { weight } from "@/data/generic";

export interface BoxDetailsInput {
  vendor_id: number;
  client_id: number;
  project_id: number;
  id: number;
}

export const fetchBoxtDetailsAndShare = async ({
  vendor_id,
  project_id,
  client_id,
  id,
}: BoxDetailsInput, qrBase64: string) => {
  try {
    const permissionResponse = await Sharing.isAvailableAsync();
    if (!permissionResponse) {
      console.error("❌ Sharing is not available on this device");
      return;
    }

    const res = await axios.get(
      `/boxes/details/vendor/${vendor_id}/project/${project_id}/client/${client_id}/box/${id}`
    );

    const { vendor, box: boxDetails, items, client } = res.data;

    console.log(ScanAndPackUrl(vendor.logo));

    const boxWeight = await getBoxWeight(vendor_id, project_id, id);
    console.log("Box Weight: ", boxWeight.box_weight);
    // HTML content for PDF
    const htmlContent = `
  <html>
    <head>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .logo { width: 100px; }
        .vendor-details { text-align: right; }
        .vendor-details h2 { margin: 0; font-size: 18px; }
        .vendor-details p { margin: 5px 0; font-size: 14px; }
        .details { margin-bottom: 20px; }
        .details p { margin: 5px 0; font-size: 16px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
        th { background-color: #3b3b3b; font-weight: bold; color: #fff }
        .table-container { margin-top: 20px; }
        .row { background-color: #000000; height: 1px; border: none; margin: 5px 0px 5px 0px }
        .client-section p { font-size: 14px; margin: 2px 0; }
        .info-qr-container { display: flex; flex-direction: row; justify-content: space-between; width: 100%; align-items: end; margin-bottom: 10px;}
        .qrContainer { height: 80px; width: 80px; border: 1px solid black; display: flex; align-items: center; justify-content: center; }
        .project-info { margin: 10px 0; }
        .project-name { text-align: center; font-size: 16px; font-weight: bold; }
        .box-name { text-align: left; font-size: 14px; font-weight: bold; }
        .project-summary {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
            align-items: center;

          }
         .project-title {
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 4px 0;
          }
          .box-name {
            font-size: 14px;
            font-weight: 600;
            color: #444;
          }
          p {
            margin: 0px;
            }
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

        <div class="project-summary">
          <div class="left-section">
            <h2 class="project-title">${boxDetails.project.project_name.replace(/&/g, "&amp;")} - ${boxDetails.box_name.replace(/&/g, "&amp;")}</h2>
     
          </div>
          <div class="right-section">
            <p><strong>Box Weight:</strong> ${boxWeight.box_weight} ${weight}</p>
          </div>
        </div>

      <div class="table-container">
        <table>
          <tr>
            <th style="width: 8%;">Sr No.</th>
            <th style="width: 60%;">Item Name</th>
            <th style="width: 20%;">Category</th>
            <th style="width: 12%;">Qty</th>
          </tr>
          ${items
            .map(
              (item: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.projectItem.item_name.replace(/&/g, "&amp;")}</td>
                  <td>${item.projectItem.category.replace(/&/g, "&amp;")}</td>
                  <td>${item.qty}</td>
                </tr>
              `
            )
            .join("")}
        </table>
      </div>
    </body>
  </html>
`;

    const safeProjectName = boxDetails.project.project_name.replace(
      /[^a-zA-Z0-9-_]/g,
      "_"
    );
    const safeBoxName = boxDetails.box_name.replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName = `${safeProjectName}-${safeBoxName}.pdf`;

    // Generate PDF (still lands in cacheDirectory)
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    console.log("Original PDF location:", uri); // Will show something in Cache

    // Construct path in DocumentDirectory
    const newPath = FileSystem.documentDirectory + fileName;
    console.log("Moving to:", newPath); // This MUST be in documentDirectory

    // Move it
    await FileSystem.moveAsync({
      from: uri,
      to: newPath,
    });

    // Share it
    await Sharing.shareAsync(newPath, {
      mimeType: "application/pdf",
      dialogTitle: `Share ${fileName}`,
      UTI: "com.adobe.pdf",
    });
  } catch (err) {
    console.error("❌ Failed to fetch box details or generate PDF:", err);
  }
};
