/** Account link + label key for the signed-in role (sidebar + header menus). */
export function dashboardAccountHrefForRole(
  role: string | null | undefined,
): string {
  switch (role?.toLowerCase()) {
    case "worker":
      return "/dashboard/profile";
    case "client":
      return "/dashboard/account";
    case "admin":
      return "/dashboard/admin";
    default:
      return "/";
  }
}

/**
 * Returns a translation key (under the `dashboard.accountMenu` namespace) for
 * the account link label; client components localize it.
 */
export function dashboardAccountLabelKeyForRole(
  role: string | null | undefined,
): "profileLabel" | "accountLabel" {
  return role?.toLowerCase() === "worker" ? "profileLabel" : "accountLabel";
}
