/** Account link + label for the signed-in role (sidebar + header menus). */
export function dashboardAccountHrefForRole(
  role: string | null | undefined,
): string {
  switch (role?.toLowerCase()) {
    case "worker":
      return "/worker/profile";
    case "client":
      return "/client/account";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

export function dashboardAccountLabelForRole(
  role: string | null | undefined,
): string {
  if (role?.toLowerCase() === "worker") return "Profile";
  return "Account";
}
