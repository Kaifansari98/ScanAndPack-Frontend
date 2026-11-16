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
  project_id?: number | string | null;
  vendor_id?: number | string | null;
  mappedItem?: any;
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
  const scheduledBoxIdsRef = useRef<Set<number>>(new Set<number>());
  const printedBoxIdsRef = useRef<Set<number>>(new Set<number>());
  const printChainRef = useRef<Promise<void>>(Promise.resolve());

  const queueCompletedBoxPrint = useCallback(
    (
      responseOrData:
        | { data?: CompletedPackagingScan | any }
        | CompletedPackagingScan
        | any,
    ) => {
      let rawData: any =
        responseOrData && "data" in responseOrData && responseOrData.data
          ? responseOrData.data
          : responseOrData;

      if (rawData?.mappedItem && typeof rawData.mappedItem === "object") {
        rawData = rawData.mappedItem?.mappedItem ?? rawData.mappedItem;
      }

      const scanData = rawData as CompletedPackagingScan | undefined;
      const isBoxCompleted = Boolean(
        scanData?.box_completed ||
        (responseOrData as any)?.data?.box_completed ||
        (responseOrData as any)?.data?.mappedItem?.box_completed ||
        (responseOrData as any)?.box_completed
      );

      const boxId = Number(
        scanData?.box_id ??
        (responseOrData as any)?.data?.box_id ??
        (responseOrData as any)?.data?.mappedItem?.box_id
      );

      const resolvedProjectId = Number(
        scanData?.project_id ??
        (responseOrData as any)?.data?.project_id ??
        (responseOrData as any)?.data?.mappedItem?.project_id ??
        projectId
      );

      const resolvedVendorId = Number(
        scanData?.vendor_id ??
        (responseOrData as any)?.data?.vendor_id ??
        (responseOrData as any)?.data?.mappedItem?.vendor_id ??
        vendorId
      );

      // A completed box is always eligible to print
      const isEligibleToPrint = enabled || isBoxCompleted;

      if (
        !isEligibleToPrint ||
        !isBoxCompleted ||
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
      const boxLabel = String(scanData?.box_name || boxId)
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
