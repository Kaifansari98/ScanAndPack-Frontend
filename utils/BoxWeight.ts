import axios from "@/lib/axios";

export interface BoxWeightResponse {
  project_id: number;
  box_id: number;
  project_weight: number;
  box_weight: number;
}

export const getBoxWeight = async (
  venderId: number,
  projectId: number,
  boxId: number
): Promise<BoxWeightResponse> => {
  try {
    const response = await axios.get<BoxWeightResponse>(
      `/projects/${venderId}/${projectId}/boxes/${boxId}/weight`
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Failed to fetch box weight:",
      error?.response?.data || error.message
    );
    throw error;
  }
};
