import axios from "@/lib/axios";

export interface ProjectWightResponse {
  project_id: number;
  project_weight: number;
}

export const getProjectWeight = async (
  venderId: number,
  projectId: number
): Promise<ProjectWightResponse> => {
  try {
    const response = await axios.get<ProjectWightResponse>(
      `/projects/${venderId}/${projectId}/weight`
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Failed to fetch project weight:",
      error?.response?.data || error.message
    );
    throw error;
  }
};
