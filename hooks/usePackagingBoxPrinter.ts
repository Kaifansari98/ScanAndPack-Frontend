import { useToast } from "@/components/Notification/ToastProvider";
import { printBoxLabel } from "@/utils/BoxPdfUtils";
import { useCallback, useRef } from "react";

interface PackagingBoxPrinterOptions {
  enabled: boolean;
  projectId?: number | null;
  vendorId?: number | null;
}

interface CompletedPackagingScan {
  box_completed?: boolean;
  box_id?: number | string | null;
  box_name?: string | null;
}

const getPrintErrorMessage = (error: unknown) => {
  const printError = error as {
    message?: string;
    response?: { data?: { message?: string; error?: string } };
  };

  return (
    printError.response?.data?.message ||
    printError.response?.data?.error ||
    printError.message ||
    "Unable to print the box label"
  );
};

/**
 * Queues completed packaging boxes for printing. A single chain prevents
 * multiple native print dialogs from opening on top of each other when a
 * hardware scanner completes several boxes quickly.
 */
export const usePackagingBoxPrinter = ({
  enabled,
  projectId,
  vendorId,
}: PackagingBoxPrinterOptions) => {
  const { showToast } = useToast();
  const scheduledBoxIdsRef = useRef(new Set<number>());
  const printedBoxIdsRef = useRef(new Set<number>());
  const printChainRef = useRef<Promise<void>>(Promise.resolve());

  const queueCompletedBoxPrint = useCallback(
    (
      responseOrData:
        | { data?: CompletedPackagingScan }
        | CompletedPackagingScan,
    ) => {
      const scanData =
        "data" in responseOrData && responseOrData.data
          ? responseOrData.data
          : (responseOrData as CompletedPackagingScan);
      const boxId = Number(scanData?.box_id);
      const resolvedProjectId = Number(projectId);
      const resolvedVendorId = Number(vendorId);

      if (
        !enabled ||
        scanData?.box_completed !== true ||
        !Number.isInteger(boxId) ||
        boxId <= 0 ||
        !Number.isInteger(resolvedProjectId) ||
        resolvedProjectId <= 0 ||
        !Number.isInteger(resolvedVendorId) ||
        resolvedVendorId <= 0 ||
        scheduledBoxIdsRef.current.has(boxId) ||
        printedBoxIdsRef.current.has(boxId)
      ) {
        return false;
      }

      scheduledBoxIdsRef.current.add(boxId);
      const boxLabel = String(scanData.box_name || boxId)
        .replace(/^box\s*/i, "")
        .trim();

      printChainRef.current = printChainRef.current.then(async () => {
        try {
          await printBoxLabel({
            id: boxId,
            project_id: resolvedProjectId,
            vendor_id: resolvedVendorId,
          });
          printedBoxIdsRef.current.add(boxId);
          showToast(
            "success",
            `Box ${boxLabel || boxId} completed. Label sent to print.`,
          );
        } catch (error: unknown) {
          showToast(
            "error",
            `Box completed, but label printing failed: ${getPrintErrorMessage(error)}`,
          );
        } finally {
          scheduledBoxIdsRef.current.delete(boxId);
        }
      });

      return true;
    },
    [enabled, projectId, showToast, vendorId],
  );

  return { queueCompletedBoxPrint };
};
