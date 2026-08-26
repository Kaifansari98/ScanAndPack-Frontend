import axios from "@/lib/axios";
import { handlePdfOrPrintResponse } from "./projectPdfUtils";

export interface BoxDetailsInput {
  vendor_id: number;
  project_id: number;
  id: number; // box_id
}

export const fetchBoxDetailsAndShare = async ({
  vendor_id,
  project_id,
  id,
}: BoxDetailsInput): Promise<void> => {
  try {
    const res = await axios.get(
      `/boxes/boxes/pdf/${id}/${project_id}/${vendor_id}`
    );

    await handlePdfOrPrintResponse(res.data, `box_${id}_label.pdf`);
  } catch (err) {
    console.error("Failed to fetch or share box PDF:", err);
    throw err;
  }
};

// Backward-compatible alias
export const fetchBoxtDetailsAndShare = fetchBoxDetailsAndShare;
