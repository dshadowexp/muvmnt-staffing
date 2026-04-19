import { Permissions, ROLES, RolesWithPermissions, Todo,User } from "./rules"



export function hasPermission<Resource extends keyof Permissions>(
    user: User,
    resource: Resource,
    action: Permissions[Resource]["action"],
    data?: Permissions[Resource]["dataType"]
  ) {
    return user.roles.some(role => {
      const permission = (ROLES as RolesWithPermissions)[role][resource]?.[action]
      if (permission == null) return false
  
      if (typeof permission === "boolean") return permission
      return data != null && permission(user, data)
    })
  }
  
  // USAGE:
  const user: User = { blockedBy: ["2"], id: "1", roles: ["client"] }
  const todo: Todo = {
    completed: false,
    id: "3",
    invitedUsers: [],
    title: "Test Todo",
    userId: "1",
  }
  
  // Can create a comment
  hasPermission(user, "comments", "create")
  
  // Can view the `todo` Todo
  hasPermission(user, "todos", "view", todo)
  
  // Can view all todos
  hasPermission(user, "todos", "view")