// lib/pdfUtils.ts
import axios from "@/lib/axios";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { ScanAndPackUrl } from "@/utils/getAssetUrls";
import { ProjectData } from "@/components/ItemCards/ProjectCard";
import { getProjectWeight } from "./ProjectWeight";
import { getBoxWeight } from "./BoxWeight";

export async function fetchProjectDetailsAndShare(project: ProjectData) {
  try {
    const permissionResponse = await Sharing.isAvailableAsync();
    if (!permissionResponse) {
      console.error("❌ Sharing is not available on this device");
      return;
    }

    const res = await axios.get(
      `/boxes/details/vendor/${project.vendor_id}/project/${project.id}/client/${project.client_id}/boxes`
    );
    console.log(res.data);

    const ProjectWeight = await getProjectWeight(project.vendor_id, project.id);
  

    const { vendor, project: projectDetails, boxes, client } = res.data;

    const boxesWithWeights = await Promise.all(
      boxes.map(async (box: any) => {
        const { box_weight } = await getBoxWeight(
          project.vendor_id,
          project.id,
          box.box_id
        );
        return {
          box_weight,
        };
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
            td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px;  }
            th { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; color:#fff  }
            th { background-color: #3b3b3b; font-weight: bold; }
            .table-container { margin-top: 10px; }
            .row { background-color: #000000; height: 1px; border: none }
            .project-name {text-align: center} 
            .client-section { margin-top: 20px; margin-bottom: 10px; }
            .client-section p { font-size: 14px; margin: 2px 0; }
            .info-qr-container { display: flex;flex-direction: row; justify-content: space-between; width: 100%;}
            .qrContainer {height: 100px; width: 120px; border: 1px solid black; }
            .project-details-row { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: bold; }
             p {margin: 0;}
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
            </div>
          </div>
          <hr class="row" />
            <div class="project-details-row">
                <p><strong>${projectDetails.project_name.replace(/&/g, "&amp;")}</strong></p>
                <p><strong>Project Weight:</strong> ${ProjectWeight.project_weight}</p>
            </div>
          <div class="table-container">
            <table>
              <tr>
                <th>Sr No.</th>
                <th>Box Name</th>
                <th>Items</th>
                <th>Weight</th>
              </tr>
              ${boxes
                .map(
                  (box: any, index: number) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${box.box_name.replace(/&/g, "&amp;")}</td>
                      <td>${box.total_items}</td>
                      <td>${boxesWithWeights[index]?.box_weight ?? "N/A"}</td>
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

    await FileSystem.moveAsync({
      from: uri,
      to: newPath,
    });

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
