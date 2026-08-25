import Loader from "@/components/generic/Loader";
import { useToast } from "@/components/Notification/ToastProvider";
import { colors } from "@/components/theme/colors";
import { commonStyles } from "@/components/theme/commonStyles";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
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
  Save,
  Search,
} from "lucide-react-native";
import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from "react-redux";

interface ManualSiteInItem {
  mapping_id: number;
  cut_list_id: number;

  item_name: string;
  description: string | null;

  unique_code: string | null;
  unique_code_2: string | null;

  category_name: string | null;
  group_name: string | null;

  length: number | string | null;
  width: number | string | null;
  thickness: number | string | null;

  packed_qty: number;

  received_qty:
    number | null;

  suggested_received_qty:
    number;

  pending_qty: number;

  is_verified:
    boolean;

  is_fully_received:
    boolean;

  per_item_weight:
    number;

  packed_weight:
    number;

  received_weight:
    number;

  site_in_at:
    string | null;

  site_in_by:
    number | null;

  site_in_by_name:
    string | null;

  row_created_source:
    string | null;
}

interface ManualSiteInResponse {
  box: {
    id: number;
    box_name: string;
    box_status: string;
    site_in_at: string | null;
    factory_out_at: string | null;
  };

  summary: {
    total_products: number;
    total_qty: number;
    received_qty: number;
    pending_qty: number;
    verified_products: number;
    fully_received_products: number;
    progress_pct: number;
  };

  items:
    ManualSiteInItem[];
}

export default function ManualSiteInItemsScreen() {
  const router =
    useRouter();

  const {
    showToast,
  } =
    useToast();

  const user =
    useSelector(
      (
        state:
          RootState
      ) =>
        state.auth.user
    );

  const userId =
    user?.id
      ? Number(
          user.id
        )
      : 0;

  const {
    box_id,
    box_name,
    project_id,
    vendor_id,
    project_name,
  } =
    useLocalSearchParams<{
      box_id: string;
      box_name?: string;
      project_id: string;
      vendor_id: string;
      project_name?: string;
    }>();

  const resolvedBoxId =
    Number(
      box_id
    );

  const resolvedProjectId =
    Number(
      project_id
    );

  const resolvedVendorId =
    Number(
      vendor_id
    );

  const [
    data,
    setData,
  ] =
    useState<
      ManualSiteInResponse | null
    >(null);

  const [
    qtyInputs,
    setQtyInputs,
  ] =
    useState<
      Record<
        number,
        string
      >
    >({});

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

  const [
    savingId,
    setSavingId,
  ] =
    useState<
      number | null
    >(null);

  const [
    search,
    setSearch,
  ] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Load manually packed items
  |--------------------------------------------------------------------------
  */

  const fetchItems =
    useCallback(
      async () => {
        try {
          const response =
            await axios.get(
              `/boxes/boxes/${resolvedBoxId}/items/manual-site-in`,
              {
                params: {
                  project_id:
                    resolvedProjectId,

                  vendor_id:
                    resolvedVendorId,
                },
              }
            );

          const responseData:
            ManualSiteInResponse =
            response.data
              ?.data;

          setData(
            responseData
          );

          /*
          |--------------------------------------------------------------------------
          | Prefill qty:
          |
          | Never verified -> packed qty
          | Already saved  -> saved received qty
          |--------------------------------------------------------------------------
          */

          const nextInputs:
            Record<
              number,
              string
            > = {};

          for (
            const item
            of responseData
              ?.items ??
            []
          ) {
            nextInputs[
              item.mapping_id
            ] =
              String(
                item.suggested_received_qty
              );
          }

          setQtyInputs(
            nextInputs
          );
        } catch (
          error: any
        ) {
          //console.error("Failed to fetch manual site-in items:",error);

          showToast(
            "error",
            error?.response
              ?.data
              ?.message ??
              "Failed to fetch manual items"
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
        resolvedBoxId,
        resolvedProjectId,
        resolvedVendorId,
        showToast,
      ]
    );

  useFocusEffect(
    useCallback(
      () => {
        fetchItems();
      },
      [
        fetchItems,
      ]
    )
  );

  const onRefresh =
    () => {
      setRefreshing(
        true
      );

      fetchItems();
    };

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const filteredItems =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return (
            data?.items ??
            []
          );
        }

        return (
          data?.items ??
          []
        ).filter(
          (item) => {
            const haystack =
              [
                item.item_name,
                item.description,
                item.unique_code,
                item.unique_code_2,
                item.category_name,
                item.group_name,
              ]
                .map(
                  (
                    value
                  ) =>
                    String(
                      value ??
                        ""
                    )
                      .toLowerCase()
                )
                .join(
                  " "
                );

            return haystack.includes(
              query
            );
          }
        );
      },
      [
        data?.items,
        search,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Quantity input
  |--------------------------------------------------------------------------
  */

  const updateQtyInput =
    (
      mappingId:
        number,
      value:
        string
    ) => {
      const numericOnly =
        value.replace(
          /[^0-9]/g,
          ""
        );

      setQtyInputs(
        (
          previous
        ) => ({
          ...previous,

          [mappingId]:
            numericOnly,
        })
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Save one item at a time
  |--------------------------------------------------------------------------
  */

  const saveItem =
    async (
      item:
        ManualSiteInItem
    ) => {
      if (
        !userId
      ) {
        showToast(
          "error",
          "User not found"
        );

        return;
      }

      const rawValue =
        qtyInputs[
          item.mapping_id
        ];

      if (
        rawValue ===
          undefined ||
        rawValue ===
          ""
      ) {
        showToast(
          "error",
          "Enter received quantity"
        );

        return;
      }

      const receivedQty =
        Number(
          rawValue
        );

      if (
        !Number.isInteger(
          receivedQty
        ) ||
        receivedQty <
          0
      ) {
        showToast(
          "error",
          "Received quantity must be a whole number"
        );

        return;
      }

      if (
        receivedQty >
        item.packed_qty
      ) {
        showToast(
          "error",
          `Received quantity cannot be greater than packed quantity (${item.packed_qty})`
        );

        return;
      }

      try {
        setSavingId(
          item.mapping_id
        );

        const response =
          await axios.patch(
            `/boxes/boxes/${resolvedBoxId}/items/manual-site-in/${item.mapping_id}`,
            {
              project_id:
                resolvedProjectId,

              vendor_id:
                resolvedVendorId,

              user_id:
                userId,

              received_qty:
                receivedQty,
            }
          );

        showToast(
          "success",
          response.data
            ?.message ??
            "Manual item verified"
        );

        await fetchItems();
      } catch (
        error: any
      ) {
        //console.error("Failed to verify manual item:",error);

        showToast(
          "error",
          error?.response
            ?.data
            ?.message ??
            "Failed to verify item"
        );
      } finally {
        setSavingId(
          null
        );
      }
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

  const summary =
    data?.summary;

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
            {box_name ??
              data?.box
                ?.box_name ??
              "Box"}
          </Text>

          <Text
            style={
              commonStyles.navbarSubtitle
            }
            numberOfLines={
              1
            }
          >
            Manual Site
            Verification
            {project_name
              ? ` · ${project_name}`
              : ""}
          </Text>
        </View>

        <View
          style={{
            width:
              40,
          }}
        />
      </View>

      {/* Summary */}
      <View
        style={
          styles.summaryCard
        }
      >
        <View
          style={
            styles.summaryHeader
          }
        >
          <View
            style={
              styles.summaryIcon
            }
          >
            <ClipboardCheck
              size={18}
              color="#7C3AED"
            />
          </View>

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                styles.summaryTitle
              }
            >
              Manual Items
            </Text>

            <Text
              style={
                styles.summarySubtitle
              }
            >
              Verify the
              physical
              quantity
              received at
              site
            </Text>
          </View>

          <Text
            style={
              styles.summaryPct
            }
          >
            {summary?.progress_pct ??
              0}
            %
          </Text>
        </View>

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
                    summary?.progress_pct ??
                      0
                  )}%` as any,
              },
            ]}
          />
        </View>

        <View
          style={
            styles.summaryStats
          }
        >
          <View
            style={
              styles.summaryStat
            }
          >
            <Text
              style={
                styles.summaryStatLabel
              }
            >
              Packed
            </Text>

            <Text
              style={
                styles.summaryStatValue
              }
            >
              {summary?.total_qty ??
                0}
            </Text>
          </View>

          <View
            style={[
              styles.summaryStat,
              styles.summaryStatReceived,
            ]}
          >
            <Text
              style={[
                styles.summaryStatLabel,
                styles.receivedText,
              ]}
            >
              Received
            </Text>

            <Text
              style={[
                styles.summaryStatValue,
                styles.receivedText,
              ]}
            >
              {summary?.received_qty ??
                0}
            </Text>
          </View>

          <View
            style={[
              styles.summaryStat,
              styles.summaryStatPending,
            ]}
          >
            <Text
              style={[
                styles.summaryStatLabel,
                styles.pendingText,
              ]}
            >
              Pending
            </Text>

            <Text
              style={[
                styles.summaryStatValue,
                styles.pendingText,
              ]}
            >
              {summary?.pending_qty ??
                0}
            </Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View
        style={
          styles.searchWrap
        }
      >
        <Search
          size={16}
          color="#9CA3AF"
        />

        <TextInput
          value={
            search
          }
          onChangeText={
            setSearch
          }
          placeholder="Search manual items..."
          placeholderTextColor="#9CA3AF"
          style={
            styles.searchInput
          }
        />
      </View>

      <FlatList
        data={
          filteredItems
        }
        keyExtractor={(
          item
        ) =>
          String(
            item.mapping_id
          )
        }
        contentContainerStyle={
          styles.listContent
        }
        showsVerticalScrollIndicator={
          false
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
              size={46}
              color="#D1D5DB"
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              No manually
              packed items
            </Text>

            <Text
              style={
                styles.emptySubtitle
              }
            >
              This box has
              no items added
              through manual
              packing.
            </Text>
          </View>
        }
        renderItem={({
          item,
        }) => {
          const inputValue =
            qtyInputs[
              item.mapping_id
            ] ??
            "";

          const inputNumber =
            inputValue ===
            ""
              ? 0
              : Number(
                  inputValue
                );

          const inputPending =
            Math.max(
              item.packed_qty -
                (
                  Number.isFinite(
                    inputNumber
                  )
                    ? inputNumber
                    : 0
                ),
              0
            );

          const saving =
            savingId ===
            item.mapping_id;

          const savedReceived =
            Number(
              item.received_qty ??
                0
            );

          return (
            <View
              style={[
                styles.itemCard,
                item.is_fully_received &&
                  styles.itemCardComplete,
              ]}
            >
              {/* Header */}
              <View
                style={
                  styles.itemHeader
                }
              >
                <View
                  style={[
                    styles.itemIcon,
                    item.is_fully_received &&
                      styles.itemIconComplete,
                  ]}
                >
                  {item.is_fully_received
                    ? (
                        <CheckCircle2
                          size={
                            17
                          }
                          color="#1A7A70"
                        />
                      )
                    : (
                        <Package
                          size={
                            17
                          }
                          color="#7C3AED"
                        />
                      )}
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.itemName
                    }
                    numberOfLines={
                      2
                    }
                  >
                    {
                      item.item_name
                    }
                  </Text>

                  <Text
                    style={
                      styles.itemMeta
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {item.category_name ||
                      "No category"}
                    {" · "}
                    {item.group_name ||
                      "No group"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.verifyBadge,
                    item.is_fully_received
                      ? styles.verifyBadgeComplete
                      : item.is_verified
                        ? styles.verifyBadgePartial
                        : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.verifyBadgeText,
                      item.is_fully_received
                        ? styles.verifyBadgeTextComplete
                        : item.is_verified
                          ? styles.verifyBadgeTextPartial
                          : null,
                    ]}
                  >
                    {item.is_fully_received
                      ? "Complete"
                      : item.is_verified
                        ? "Verified"
                        : "Pending"}
                  </Text>
                </View>
              </View>

              {/* Code + size */}
              <View
                style={
                  styles.detailRow
                }
              >
                <Text
                  style={
                    styles.detailLabel
                  }
                >
                  Code
                </Text>

                <Text
                  style={
                    styles.detailValue
                  }
                >
                  {item.unique_code ||
                    "—"}
                </Text>
              </View>

              <View
                style={
                  styles.detailRow
                }
              >
                <Text
                  style={
                    styles.detailLabel
                  }
                >
                  Size
                </Text>

                <Text
                  style={
                    styles.detailValue
                  }
                >
                  {item.length ??
                    "—"}
                  ×
                  {item.width ??
                    "—"}
                  ×
                  {item.thickness ??
                    "—"}
                </Text>
              </View>

              {/* Qty stats */}
              <View
                style={
                  styles.qtyStats
                }
              >
                <View
                  style={
                    styles.qtyStat
                  }
                >
                  <Text
                    style={
                      styles.qtyStatLabel
                    }
                  >
                    Packed
                  </Text>

                  <Text
                    style={
                      styles.qtyStatValue
                    }
                  >
                    {
                      item.packed_qty
                    }
                  </Text>
                </View>

                <View
                  style={[
                    styles.qtyStat,
                    styles.qtyStatReceived,
                  ]}
                >
                  <Text
                    style={[
                      styles.qtyStatLabel,
                      styles.receivedText,
                    ]}
                  >
                    Saved
                  </Text>

                  <Text
                    style={[
                      styles.qtyStatValue,
                      styles.receivedText,
                    ]}
                  >
                    {
                      savedReceived
                    }
                  </Text>
                </View>

                <View
                  style={[
                    styles.qtyStat,
                    styles.qtyStatPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.qtyStatLabel,
                      styles.pendingText,
                    ]}
                  >
                    Pending
                  </Text>

                  <Text
                    style={[
                      styles.qtyStatValue,
                      styles.pendingText,
                    ]}
                  >
                    {
                      item.pending_qty
                    }
                  </Text>
                </View>
              </View>

              {/* Verify quantity */}
              <View
                style={
                  styles.verifySection
                }
              >
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.inputLabel
                    }
                  >
                    Received
                    Quantity
                  </Text>

                  <Text
                    style={
                      styles.inputHint
                    }
                  >
                    Max{" "}
                    {
                      item.packed_qty
                    }
                    . Decrease
                    this if fewer
                    units arrived.
                  </Text>
                </View>

                <TextInput
                  value={
                    inputValue
                  }
                  onChangeText={(
                    value
                  ) =>
                    updateQtyInput(
                      item.mapping_id,
                      value
                    )
                  }
                  keyboardType="number-pad"
                  selectTextOnFocus={
                    true
                  }
                  maxLength={
                    6
                  }
                  style={
                    styles.qtyInput
                  }
                />
              </View>

              {/* Preview */}
              <View
                style={
                  styles.previewRow
                }
              >
                <Text
                  style={
                    styles.previewText
                  }
                >
                  After save:
                  received{" "}
                  {Number.isFinite(
                    inputNumber
                  )
                    ? inputNumber
                    : 0}
                  , pending{" "}
                  {
                    inputPending
                  }
                </Text>
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  saving &&
                    styles.saveBtnDisabled,
                ]}
                onPress={() =>
                  saveItem(
                    item
                  )
                }
                disabled={
                  saving
                }
                activeOpacity={
                  0.85
                }
              >
                {saving
                  ? (
                      <ActivityIndicator
                        size="small"
                        color="white"
                      />
                    )
                  : (
                      <Save
                        size={15}
                        color="white"
                      />
                    )}

                <Text
                  style={
                    styles.saveBtnText
                  }
                >
                  {saving
                    ? "Saving..."
                    : item.is_verified
                      ? "Update Verification"
                      : "Verify Item"}
                </Text>
              </TouchableOpacity>

              {item.site_in_at && (
                <Text
                  style={
                    styles.verifiedAt
                  }
                >
                  Last verified:{" "}
                  {new Date(
                    item.site_in_at
                  ).toLocaleString(
                    "en-IN",
                    {
                      day:
                        "2-digit",
                      month:
                        "short",
                      year:
                        "numeric",
                      hour:
                        "2-digit",
                      minute:
                        "2-digit",
                    }
                  )}
                  {item.site_in_by_name
                    ? ` by ${item.site_in_by_name}`
                    : ""}
                </Text>
              )}
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

    summaryCard: {
      margin: 16,
      marginBottom: 10,
      backgroundColor:
        "white",
      borderRadius: 16,
      padding: 14,
      gap: 12,

      shadowColor:
        "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity:
        0.05,
      shadowRadius:
        8,
      elevation: 2,
    },

    summaryHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
    },

    summaryIcon: {
      width: 38,
      height: 38,
      borderRadius:
        11,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#F5F3FF",
    },

    summaryTitle: {
      fontSize: 15,
      fontWeight:
        "800",
      color:
        "#111827",
    },

    summarySubtitle: {
      marginTop: 2,
      fontSize: 11,
      color:
        "#6B7280",
    },

    summaryPct: {
      fontSize: 18,
      fontWeight:
        "900",
      color:
        "#7C3AED",
    },

    progressTrack: {
      height: 6,
      borderRadius:
        99,
      backgroundColor:
        "#F3F4F6",
      overflow:
        "hidden",
    },

    progressFill: {
      height:
        "100%",
      borderRadius:
        99,
      backgroundColor:
        "#7C3AED",
    },

    summaryStats: {
      flexDirection:
        "row",
      gap: 8,
    },

    summaryStat: {
      flex: 1,
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
      backgroundColor:
        "#F9FAFB",
      borderRadius:
        10,
      paddingVertical:
        8,
      alignItems:
        "center",
    },

    summaryStatReceived: {
      backgroundColor:
        "#E6F7F5",
      borderColor:
        "#B7E4DD",
    },

    summaryStatPending: {
      backgroundColor:
        "#FFF8EE",
      borderColor:
        "#FAD7A8",
    },

    summaryStatLabel: {
      fontSize: 10,
      color:
        "#6B7280",
      fontWeight:
        "600",
    },

    summaryStatValue: {
      marginTop: 2,
      fontSize: 16,
      color:
        "#111827",
      fontWeight:
        "900",
    },

    receivedText: {
      color:
        "#1A7A70",
    },

    pendingText: {
      color:
        "#C15C0A",
    },

    searchWrap: {
      marginHorizontal:
        16,
      marginBottom:
        10,
      height: 44,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
      paddingHorizontal:
        12,
      borderRadius:
        12,
      backgroundColor:
        "white",
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
    },

    searchInput: {
      flex: 1,
      fontSize: 13,
      color:
        "#111827",
    },

    listContent: {
      paddingHorizontal:
        16,
      paddingBottom:
        50,
      gap: 10,
    },

    emptyState: {
      marginTop:
        70,
      alignItems:
        "center",
      gap: 10,
      paddingHorizontal:
        30,
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight:
        "800",
      color:
        "#111827",
    },

    emptySubtitle: {
      fontSize: 12,
      lineHeight: 18,
      textAlign:
        "center",
      color:
        "#9CA3AF",
    },

    itemCard: {
      backgroundColor:
        "white",
      borderRadius:
        16,
      padding: 14,
      gap: 10,
      borderWidth: 1,
      borderColor:
        "#E5E7EB",

      shadowColor:
        "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity:
        0.04,
      shadowRadius:
        6,
      elevation: 2,
    },

    itemCardComplete: {
      borderColor:
        "#B7E4DD",
    },

    itemHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
    },

    itemIcon: {
      width: 34,
      height: 34,
      borderRadius:
        10,
      justifyContent:
        "center",
      alignItems:
        "center",
      backgroundColor:
        "#F5F3FF",
    },

    itemIconComplete: {
      backgroundColor:
        "#E6F7F5",
    },

    itemName: {
      fontSize: 14,
      fontWeight:
        "800",
      color:
        "#111827",
    },

    itemMeta: {
      marginTop: 2,
      fontSize: 10,
      color:
        "#9CA3AF",
    },

    verifyBadge: {
      paddingHorizontal:
        8,
      paddingVertical:
        4,
      borderRadius:
        20,
      backgroundColor:
        "#FFF8EE",
    },

    verifyBadgePartial: {
      backgroundColor:
        "#F5F3FF",
    },

    verifyBadgeComplete: {
      backgroundColor:
        "#E6F7F5",
    },

    verifyBadgeText: {
      fontSize: 10,
      fontWeight:
        "800",
      color:
        "#C15C0A",
    },

    verifyBadgeTextPartial: {
      color:
        "#7C3AED",
    },

    verifyBadgeTextComplete: {
      color:
        "#1A7A70",
    },

    detailRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      gap: 12,
    },

    detailLabel: {
      fontSize: 11,
      color:
        "#9CA3AF",
    },

    detailValue: {
      flex: 1,
      textAlign:
        "right",
      fontSize: 11,
      fontWeight:
        "700",
      color:
        "#4B5563",
    },

    qtyStats: {
      flexDirection:
        "row",
      gap: 7,
    },

    qtyStat: {
      flex: 1,
      borderRadius:
        10,
      borderWidth: 1,
      borderColor:
        "#E5E7EB",
      backgroundColor:
        "#F9FAFB",
      paddingVertical:
        7,
      alignItems:
        "center",
    },

    qtyStatReceived: {
      backgroundColor:
        "#E6F7F5",
      borderColor:
        "#B7E4DD",
    },

    qtyStatPending: {
      backgroundColor:
        "#FFF8EE",
      borderColor:
        "#FAD7A8",
    },

    qtyStatLabel: {
      fontSize: 9,
      fontWeight:
        "600",
      color:
        "#6B7280",
    },

    qtyStatValue: {
      marginTop: 2,
      fontSize: 15,
      fontWeight:
        "900",
      color:
        "#111827",
    },

    verifySection: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 12,
      borderTopWidth:
        1,
      borderTopColor:
        "#F3F4F6",
      paddingTop:
        10,
    },

    inputLabel: {
      fontSize: 12,
      fontWeight:
        "800",
      color:
        "#111827",
    },

    inputHint: {
      marginTop: 2,
      fontSize: 10,
      lineHeight: 14,
      color:
        "#9CA3AF",
    },

    qtyInput: {
      width: 76,
      height: 44,
      borderRadius:
        10,
      borderWidth: 1,
      borderColor:
        "#C4B5FD",
      backgroundColor:
        "#FAF5FF",
      textAlign:
        "center",
      fontSize: 17,
      fontWeight:
        "900",
      color:
        "#7C3AED",
    },

    previewRow: {
      borderRadius:
        8,
      backgroundColor:
        "#F9FAFB",
      paddingHorizontal:
        10,
      paddingVertical:
        7,
    },

    previewText: {
      fontSize: 10,
      color:
        "#6B7280",
      fontWeight:
        "600",
    },

    saveBtn: {
      height: 42,
      borderRadius:
        11,
      backgroundColor:
        "#7C3AED",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 7,
    },

    saveBtnDisabled: {
      opacity: 0.65,
    },

    saveBtnText: {
      fontSize: 12,
      color:
        "white",
      fontWeight:
        "800",
    },

    verifiedAt: {
      textAlign:
        "center",
      fontSize: 9,
      color:
        "#9CA3AF",
    },
  });
