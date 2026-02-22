import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { trpc } from "@/lib/trpc";
import { MaterialIcons } from "@expo/vector-icons";

type ModuleType = "kpis" | "dofa" | "interacciones" | "proyectos" | "organigrama";

interface AdminNotificationBannerProps {
  module: ModuleType;
}

/**
 * Banner that shows unread admin notifications for a specific module.
 * Displays in user views when admin has modified their data.
 * User can dismiss all notifications for that module.
 */
export function AdminNotificationBanner({ module }: AdminNotificationBannerProps) {
  const notificationsQuery = trpc.notification.list.useQuery({ module });
  const dismissAllMut = trpc.notification.dismissAll.useMutation({
    onSuccess: () => notificationsQuery.refetch(),
  });

  const notifications = notificationsQuery.data ?? [];

  if (notifications.length === 0) return null;

  const latestNotif = notifications[0];
  const count = notifications.length;

  return (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="notifications-active" size={20} color="#CC2229" />
          {count > 1 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.bannerTitle}>
            Cambios realizados por el administrador
          </Text>
          <Text style={styles.bannerMessage} numberOfLines={2}>
            {latestNotif.message}
            {count > 1 ? ` (+${count - 1} cambio${count - 1 > 1 ? "s" : ""} más)` : ""}
          </Text>
          {latestNotif.adminName && (
            <Text style={styles.bannerAdmin}>Por: {latestNotif.adminName}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => dismissAllMut.mutate({ module })}
          disabled={dismissAllMut.isPending}
        >
          {dismissAllMut.isPending ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <MaterialIcons name="close" size={18} color="#6B7280" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    overflow: "hidden",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    gap: 10,
  },
  iconContainer: {
    position: "relative",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#CC2229",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "700",
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 12,
    color: "#7F1D1D",
    lineHeight: 16,
  },
  bannerAdmin: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    fontStyle: "italic",
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
});
