import Loader from "@/components/generic/Loader";
import { useToast } from "@/components/Notification/ToastProvider";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Package,
  ScanLine,
} from "lucide-react-native";
import {
  useCallback,
  useState,
} from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface BoxSiteInItem {
  id: number;
  box_name: string;
  box_status: string;

  site_in_at: string | null;
  factory_out_at: string | null;

  total_items: number;
  received_items: number;
  pending_items: number;

  scanned_total_items: number;
  scanned_received_items: number;
  scanned_pending_items: number;

  manual_total_items: number;
  manual_received_items: number;
  manual_pending_items: number;

  has_manual_items: boolean;
  manual_complete: boolean;
}

export default function BoxSiteInScreen() {
  const router =
    useRouter();

  const {
    showToast,
  } =
    useToast();

  const {
    project_id,
    vendor_id,
    project_name,
  } =
    useLocalSearchParams<{
      project_id: string;
      vendor_id: string;
      project_name: string;
    }>();

  const [
    boxes,
    setBoxes,
  ] =
    useState<
      BoxSiteInItem[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Fetch boxes + site-in quantity status
  |--------------------------------------------------------------------------
  */

  const fetchBoxes =
    useCallback(
      async () => {
        try {
          const res =
            await axios.get(
              `/boxes/vendor/${vendor_id}/project/${project_id}`
            );

          const allBoxes:
            BoxSiteInItem[] =
            await Promise.all(
              res.data
                .filter(
                  (
                    box: any
                  ) =>
                    box.site_in_at !==
                      null &&
                    box.site_in_at !==
                      undefined
                )
                .map(
                  async (
                    box: any
                  ) => {
                    try {
                      const statusRes =
                        await axios.get(
                          `/boxes/boxes/${box.id}/site-in-status?project_id=${project_id}&vendor_id=${vendor_id}`
                        );

                      const data =
                        statusRes
                          .data
                          ?.data;

                      return {
                        id:
                          box.id,

                        box_name:
                          box.box_name,

                        box_status:
                          box.box_status,

                        site_in_at:
                          box.site_in_at,

                        factory_out_at:
                          box.factory_out_at,

                        total_items:
                          Number(
                            data?.total_items ??
                              0
                          ),

                        received_items:
                          Number(
                            data?.received_items ??
                              0
                          ),

                        pending_items:
                          Number(
                            data?.pending_items ??
                              0
                          ),

                        scanned_total_items:
                          Number(
                            data?.scanned_total_items ??
                              0
                          ),

                        scanned_received_items:
                          Number(
                            data?.scanned_received_items ??
                              0
                          ),

                        scanned_pending_items:
                          Number(
                            data?.scanned_pending_items ??
                              0
                          ),

                        manual_total_items:
                          Number(
                            data?.manual_total_items ??
                              0
                          ),

                        manual_received_items:
                          Number(
                            data?.manual_received_items ??
                              0
                          ),

                        manual_pending_items:
                          Number(
                            data?.manual_pending_items ??
                              0
                          ),

                        has_manual_items:
                          Boolean(
                            data?.has_manual_items
                          ),

                        manual_complete:
                          Boolean(
                            data?.manual_complete
                          ),
                      };
                    } catch {
                      return {
                        id:
                          box.id,

                        box_name:
                          box.box_name,

                        box_status:
                          box.box_status,

                        site_in_at:
                          box.site_in_at,

                        factory_out_at:
                          box.factory_out_at,

                        total_items:
                          Number(
                            box.items_count ??
                              0
                          ),

                        received_items:
                          0,

                        pending_items:
                          Number(
                            box.items_count ??
                              0
                          ),

                        scanned_total_items:
                          Number(
                            box.items_count ??
                              0
                          ),

                        scanned_received_items:
                          0,

                        scanned_pending_items:
                          Number(
                            box.items_count ??
                              0
                          ),

                        manual_total_items:
                          0,

                        manual_received_items:
                          0,

                        manual_pending_items:
                          0,

                        has_manual_items:
                          false,

                        manual_complete:
                          false,
                      };
                    }
                  }
                )
            );

          setBoxes(
            allBoxes
          );
        } catch (
          error
        ) {
          //console.error("Failed to fetch boxes:",error);

          showToast(
            "error",
            "Failed to fetch boxes"
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        project_id,
        vendor_id,
        showToast,
      ]
    );

  useFocusEffect(
    useCallback(
      () => {
        fetchBoxes();
      },
      [
        fetchBoxes,
      ]
    )
  );

  const onRefresh =
    () => {
      setRefreshing(
        true
      );

      fetchBoxes();
    };

  /*
  |--------------------------------------------------------------------------
  | Existing QR scan flow
  |--------------------------------------------------------------------------
  */

  const handleScanItems =
    (
      box:
        BoxSiteInItem
    ) => {
      router.push({
        pathname:
          "/scanner",

        params: {
          scan_type:
            "ITEM_SITE_IN",

          box_id:
            String(
              box.id
            ),

          project_id:
            String(
              project_id
            ),

          vendor_id:
            String(
              vendor_id
            ),
        },
      });
    };

  /*
  |--------------------------------------------------------------------------
  | NEW manual verification flow
  |--------------------------------------------------------------------------
  */

  const handleVerifyManualItems =
    (
      box:
        BoxSiteInItem
    ) => {
      router.push({
        pathname:
          "/manualSiteInItemsScreen",

        params: {
          box_id:
            String(
              box.id
            ),

          box_name:
            box.box_name,

          project_id:
            String(
              project_id
            ),

          vendor_id:
            String(
              vendor_id
            ),

          project_name:
            String(
              project_name ??
                ""
            ),
        },
      });
    };

  if (loading) {
    return (
      <View
        style={
          styles.center
        }
      >
        <Loader />
      </View>
    );
  }

  return (
    <View
      style={
        styles.root
      }
    >
      {/* Navbar */}
      <View
        style={
          commonStyles.navbar
        }
      >
        <TouchableOpacity
          style={
            commonStyles.navbarBackBtn
          }
          onPress={() =>
            router.back()
          }
          activeOpacity={
            0.8
          }
        >
          <ArrowLeft
            size={20}
            color={
              colors.white
            }
          />
        </TouchableOpacity>

        <View
          style={
            commonStyles.navbarTitleBlock
          }
        >
          <Text
            style={
              commonStyles.navbarTitle
            }
            numberOfLines={
              1
            }
          >
            {project_name ??
              "Project"}
          </Text>

          <Text
            style={
              commonStyles.navbarSubtitle
            }
          >
            Boxes at Site
          </Text>
        </View>

        <View
          style={{
            width:
              40,
          }}
        />
      </View>

      <FlatList
        data={
          boxes
        }
        keyExtractor={(
          item
        ) =>
          String(
            item.id
          )
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              onRefresh
            }
          />
        }
        ListEmptyComponent={
          <View
            style={
              styles.emptyState
            }
          >
            <Package
              size={48}
              color="#D1D5DB"
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              No boxes at
              site yet
            </Text>

            <Text
              style={
                styles.emptySubtitle
              }
            >
              Boxes will
              appear here
              once marked
              as site in
            </Text>
          </View>
        }
        renderItem={({
          item,
        }) => {
          const allReceived =
            item.total_items >
              0 &&
            item.received_items >=
              item.total_items;

          const pct =
            item.total_items >
            0
              ? Math.round(
                  (
                    item.received_items /
                    item.total_items
                  ) *
                    100
                )
              : 0;

          const hasScannedPending =
            item.scanned_pending_items >
            0;

          const hasManual =
            item.manual_total_items >
            0;

          const manualDone =
            hasManual &&
            item.manual_pending_items ===
              0;

          return (
            <View
              style={
                styles.card
              }
            >
              <View
                style={[
                  styles.accentStrip,
                  {
                    backgroundColor:
                      allReceived
                        ? "#2A9D8F"
                        : "#6366F1",
                  },
                ]}
              />

              <View
                style={
                  styles.cardBody
                }
              >
                {/* Header */}
                <View
                  style={
                    styles.headerRow
                  }
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor:
                          allReceived
                            ? "#E6F7F5"
                            : "#EEF2FF",
                      },
                    ]}
                  >
                    <Package
                      size={18}
                      color={
                        allReceived
                          ? "#2A9D8F"
                          : "#6366F1"
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.boxName
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {
                      item.box_name
                    }
                  </Text>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          allReceived
                            ? "#E6F7F5"
                            : "#EEF2FF",
                      },
                    ]}
                  >
                    {allReceived && (
                      <CheckCircle2
                        size={11}
                        color="#1A7A70"
                      />
                    )}

                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            allReceived
                              ? "#1A7A70"
                              : "#6366F1",
                        },
                      ]}
                    >
                      {allReceived
                        ? "Complete"
                        : "Pending"}
                    </Text>
                  </View>
                </View>

                {/* Progress */}
                <View
                  style={
                    styles.progressRow
                  }
                >
                  <View
                    style={
                      styles.progressTrack
                    }
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width:
                            `${Math.min(
                              100,
                              pct
                            )}%` as any,
                        },
                        allReceived && {
                          backgroundColor:
                            "#2A9D8F",
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.progressPct,
                      allReceived && {
                        color:
                          "#2A9D8F",
                      },
                    ]}
                  >
                    {pct}%
                  </Text>
                </View>

                {/* Overall stats */}
                <View
                  style={
                    styles.statsWrap
                  }
                >
                  <View
                    style={
                      styles.statChip
                    }
                  >
                    <Text
                      style={
                        styles.statLabel
                      }
                    >
                      Total
                    </Text>

                    <Text
                      style={
                        styles.statValue
                      }
                    >
                      {
                        item.total_items
                      }
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statChip,
                      {
                        backgroundColor:
                          "#E6F7F5",

                        borderColor:
                          "#2A9D8F",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statLabel,
                        {
                          color:
                            "#1A7A70",
                        },
                      ]}
                    >
                      Received
                    </Text>

                    <Text
                      style={[
                        styles.statValue,
                        {
                          color:
                            "#1A7A70",
                        },
                      ]}
                    >
                      {
                        item.received_items
                      }
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statChip,
                      {
                        backgroundColor:
                          "#FFF8EE",

                        borderColor:
                          "#F4A261",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statLabel,
                        {
                          color:
                            "#C15C0A",
                        },
                      ]}
                    >
                      Pending
                    </Text>

                    <Text
                      style={[
                        styles.statValue,
                        {
                          color:
                            "#C15C0A",
                        },
                      ]}
                    >
                      {
                        item.pending_items
                      }
                    </Text>
                  </View>
                </View>

                {/* Flow breakdown */}
                {(item.scanned_total_items >
                  0 ||
                  hasManual) && (
                  <View
                    style={
                      styles.breakdownRow
                    }
                  >
                    {item.scanned_total_items >
                      0 && (
                      <View
                        style={
                          styles.breakdownChip
                        }
                      >
                        <ScanLine
                          size={11}
                          color="#4F46E5"
                        />

                        <Text
                          style={
                            styles.breakdownText
                          }
                        >
                          Scan{" "}
                          {
                            item.scanned_received_items
                          }
                          /
                          {
                            item.scanned_total_items
                          }
                        </Text>
                      </View>
                    )}

                    {hasManual && (
                      <View
                        style={[
                          styles.breakdownChip,
                          {
                            backgroundColor:
                              manualDone
                                ? "#E6F7F5"
                                : "#F5F3FF",
                          },
                        ]}
                      >
                        <ClipboardCheck
                          size={11}
                          color={
                            manualDone
                              ? "#1A7A70"
                              : "#7C3AED"
                          }
                        />

                        <Text
                          style={[
                            styles.breakdownText,
                            {
                              color:
                                manualDone
                                  ? "#1A7A70"
                                  : "#7C3AED",
                            },
                          ]}
                        >
                          Manual{" "}
                          {
                            item.manual_received_items
                          }
                          /
                          {
                            item.manual_total_items
                          }
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Actions */}
                <View
                  style={
                    styles.actionsRow
                  }
                >
                  {hasScannedPending && (
                    <TouchableOpacity
                      style={
                        styles.scanBtn
                      }
                      onPress={() =>
                        handleScanItems(
                          item
                        )
                      }
                      activeOpacity={
                        0.85
                      }
                    >
                      <ScanLine
                        size={14}
                        color="white"
                      />

                      <Text
                        style={
                          styles.scanBtnText
                        }
                      >
                        Scan Items
                      </Text>
                    </TouchableOpacity>
                  )}

                  {hasManual && (
                    <TouchableOpacity
                      style={[
                        styles.manualBtn,
                        manualDone &&
                          styles.manualBtnDone,
                      ]}
                      onPress={() =>
                        handleVerifyManualItems(
                          item
                        )
                      }
                      activeOpacity={
                        0.85
                      }
                    >
                      <ClipboardCheck
                        size={14}
                        color={
                          manualDone
                            ? "#1A7A70"
                            : "white"
                        }
                      />

                      <Text
                        style={[
                          styles.manualBtnText,
                          manualDone &&
                            styles.manualBtnTextDone,
                        ]}
                      >
                        {manualDone
                          ? "Manual Verified"
                          : "Verify Manual"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {!hasScannedPending &&
                    !hasManual &&
                    allReceived && (
                      <View
                        style={
                          styles.completedTextWrap
                        }
                      >
                        <CheckCircle2
                          size={14}
                          color="#1A7A70"
                        />

                        <Text
                          style={
                            styles.completedText
                          }
                        >
                          All items
                          received
                        </Text>
                      </View>
                    )}
                </View>

                {/* Site-in date */}
                {item.site_in_at && (
                  <Text
                    style={
                      styles.dateText
                    }
                  >
                    Arrived:{" "}
                    {new Date(
                      item.site_in_at
                    ).toLocaleDateString(
                      "en-GB",
                      {
                        day:
                          "2-digit",

                        month:
                          "short",

                        year:
                          "numeric",
                      }
                    )}
                  </Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor:
        colors.cardBg,
    },

    center: {
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    listContent: {
      padding: 16,
      paddingBottom:
        40,
      gap: 10,
    },

    emptyState: {
      marginTop:
        80,
      alignItems:
        "center",
      gap: 12,
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight:
        "700",
      color:
        "#111827",
    },

    emptySubtitle: {
      fontSize: 13,
      color:
        "#9CA3AF",
      textAlign:
        "center",
      paddingHorizontal:
        32,
    },

    card: {
      flexDirection:
        "row",

      backgroundColor:
        "white",

      borderRadius:
        16,

      overflow:
        "hidden",

      shadowColor:
        "#000",

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.06,

      shadowRadius:
        8,

      elevation: 3,
    },

    accentStrip: {
      width: 4,
    },

    cardBody: {
      flex: 1,
      padding: 14,
      gap: 10,
    },

    headerRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
    },

    iconWrap: {
      width: 34,
      height: 34,
      borderRadius:
        10,
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    boxName: {
      flex: 1,
      fontSize: 14,
      fontWeight:
        "700",
      color:
        "#111827",
    },

    statusPill: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      paddingHorizontal:
        10,
      paddingVertical:
        3,
      borderRadius:
        20,
    },

    statusText: {
      fontSize: 11,
      fontWeight:
        "700",
    },

    progressRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
    },

    progressTrack: {
      flex: 1,
      height: 5,
      backgroundColor:
        "#F3F4F6",
      borderRadius:
        99,
      overflow:
        "hidden",
    },

    progressFill: {
      height:
        "100%",
      backgroundColor:
        "#6366F1",
      borderRadius:
        99,
    },

    progressPct: {
      fontSize: 11,
      fontWeight:
        "800",
      color:
        "#6366F1",
      minWidth: 32,
      textAlign:
        "right",
    },

    statsWrap: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 6,
    },

    statChip: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      paddingHorizontal:
        8,
      paddingVertical:
        3,
      borderRadius:
        20,
      backgroundColor:
        "#F3F4F6",
      borderWidth:
        1,
      borderColor:
        "#E5E7EB",
    },

    statLabel: {
      fontSize: 10,
      fontWeight:
        "600",
      color:
        "#6B7280",
    },

    statValue: {
      fontSize: 11,
      fontWeight:
        "800",
      color:
        "#6B7280",
    },

    breakdownRow: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 6,
    },

    breakdownChip: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      paddingHorizontal:
        8,
      paddingVertical:
        4,
      borderRadius:
        8,
      backgroundColor:
        "#EEF2FF",
    },

    breakdownText: {
      fontSize: 10,
      fontWeight:
        "700",
      color:
        "#4F46E5",
    },

    actionsRow: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      alignItems:
        "center",
      gap: 8,
    },

    scanBtn: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      backgroundColor:
        "#6366F1",
      borderRadius:
        20,
      paddingHorizontal:
        12,
      paddingVertical:
        8,
    },

    scanBtnText: {
      fontSize: 12,
      fontWeight:
        "700",
      color:
        "white",
    },

    manualBtn: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      backgroundColor:
        "#7C3AED",
      borderRadius:
        20,
      paddingHorizontal:
        12,
      paddingVertical:
        8,
    },

    manualBtnDone: {
      backgroundColor:
        "#E6F7F5",
      borderWidth:
        1,
      borderColor:
        "#2A9D8F",
    },

    manualBtnText: {
      fontSize: 12,
      fontWeight:
        "700",
      color:
        "white",
    },

    manualBtnTextDone: {
      color:
        "#1A7A70",
    },

    completedTextWrap: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
    },

    completedText: {
      fontSize: 12,
      fontWeight:
        "700",
      color:
        "#1A7A70",
    },

    dateText: {
      fontSize: 11,
      color:
        "#9CA3AF",
    },
  });
