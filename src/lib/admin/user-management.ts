import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppUserRole, UserRole } from "../auth/user-shared";
import {
  ACCOUNT_STATUSES,
  APP_USER_ROLES,
  USER_ROLES,
  type AccountStatus,
} from "../auth/user-shared";
import type { Database } from "@/types/database.types";
import { getPageCount, pageToOffset, PAGE_SIZE } from "../workspace/pagination";

type Supabase = SupabaseClient<Database>;

export const ADMIN_USER_ROLES = USER_ROLES;
export const ADMIN_USER_STATUSES = ACCOUNT_STATUSES;
export const ADMIN_USER_SORT_OPTIONS = ["newest", "oldest"] as const;

export type AdminUserStatusFilter = AccountStatus | "all";
export type AdminUserRoleFilter = UserRole | "all";
export type AdminUserSort = (typeof ADMIN_USER_SORT_OPTIONS)[number];

export type AdminUserSearchParams = {
  page?: readonly string[] | string;
  q?: readonly string[] | string;
  role?: readonly string[] | string;
  sort?: readonly string[] | string;
  status?: readonly string[] | string;
};

export type AdminUserRow =
  Database["public"]["Functions"]["admin_list_users"]["Returns"][number];
export type AdminUserDetail =
  Database["public"]["Functions"]["admin_get_user"]["Returns"][number];
export type AdminUserBusinessHistory =
  Database["public"]["Functions"]["admin_user_business_history"]["Returns"][number];

export type AdminUserQuery = {
  page: number;
  q: string | null;
  role: AdminUserRoleFilter;
  sort: AdminUserSort;
  status: AdminUserStatusFilter;
};

export type AdminUserListResult = {
  error: boolean;
  page: number;
  pageCount: number;
  totalCount: number;
  users: AdminUserRow[];
};

export type AdminUserUpdateInput = {
  accountStatus: AccountStatus;
  fullName: string | null;
  role: AppUserRole;
  username: string | null;
};

export function firstParam(value: readonly string[] | string | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function sanitizeAdminUserSearch(value: string | undefined) {
  const normalized = value
    ?.trim()
    .slice(0, 100)
    .replace(/[^\p{L}\p{N} @.+_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized && normalized.length > 0 ? normalized : null;
}

export function normalizeAdminUserRoleFilter(
  value: string | undefined,
): AdminUserRoleFilter {
  return ADMIN_USER_ROLES.includes(value as UserRole)
    ? (value as UserRole)
    : "all";
}

export function normalizeAdminUserStatusFilter(
  value: string | undefined,
): AdminUserStatusFilter {
  return ADMIN_USER_STATUSES.includes(value as AccountStatus)
    ? (value as AccountStatus)
    : "all";
}

export function normalizeAdminUserSort(value: string | undefined): AdminUserSort {
  return value === "oldest" ? "oldest" : "newest";
}

export function parseAdminUserQuery(
  params: AdminUserSearchParams,
): AdminUserQuery {
  const rawPage = firstParam(params.page);
  const parsedPage = Number.parseInt(rawPage ?? "1", 10);

  return {
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    q: sanitizeAdminUserSearch(firstParam(params.q)),
    role: normalizeAdminUserRoleFilter(firstParam(params.role)),
    sort: normalizeAdminUserSort(firstParam(params.sort)),
    status: normalizeAdminUserStatusFilter(firstParam(params.status)),
  };
}

export function adminUserSearchParamsForPagination(query: AdminUserQuery) {
  const params = new URLSearchParams();

  if (query.q) {
    params.set("q", query.q);
  }
  if (query.role !== "all") {
    params.set("role", query.role);
  }
  if (query.status !== "all") {
    params.set("status", query.status);
  }
  if (query.sort !== "newest") {
    params.set("sort", query.sort);
  }

  return params;
}

export function normalizeProfileUpdateInput(input: {
  accountStatus: string;
  fullName: string;
  role: string;
  username: string;
}): AdminUserUpdateInput | null {
  const role = APP_USER_ROLES.includes(input.role as AppUserRole)
    ? (input.role as AppUserRole)
    : null;
  const accountStatus = ACCOUNT_STATUSES.includes(input.accountStatus as AccountStatus)
    ? (input.accountStatus as AccountStatus)
    : null;
  const fullName = input.fullName.trim() || null;
  const username = input.username.trim().toLowerCase() || null;

  if (!role || !accountStatus) {
    return null;
  }

  if (fullName && fullName.length > 120) {
    return null;
  }

  if (
    username &&
    (username.length < 3 ||
      username.length > 40 ||
      !/^[a-z0-9][a-z0-9_.-]*$/.test(username))
  ) {
    return null;
  }

  return {
    accountStatus,
    fullName,
    role,
    username,
  };
}

export function canMutateAdminTarget(role: UserRole) {
  return role !== "admin";
}

export function canHardDeleteUser({
  hasHistory,
  role,
}: {
  hasHistory: boolean;
  role: UserRole;
}) {
  return role !== "admin" && !hasHistory;
}

export async function getAdminUsers(
  supabase: Supabase,
  query: AdminUserQuery,
): Promise<AdminUserListResult> {
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_limit: PAGE_SIZE,
    p_offset: pageToOffset(query.page),
    p_q: query.q,
    p_role: query.role === "all" ? null : query.role,
    p_sort: query.sort,
    p_status: query.status === "all" ? null : query.status,
  });

  if (error) {
    return {
      error: true,
      page: query.page,
      pageCount: 1,
      totalCount: 0,
      users: [],
    };
  }

  const users = data ?? [];
  const totalCount = users[0]?.total_count ?? 0;

  return {
    error: false,
    page: query.page,
    pageCount: getPageCount(totalCount),
    totalCount,
    users,
  };
}

export async function getAdminUser(
  supabase: Supabase,
  userId: string,
): Promise<AdminUserDetail | null> {
  const { data, error } = await supabase.rpc("admin_get_user", {
    p_user_id: userId,
  });

  if (error) {
    return null;
  }

  return data?.[0] ?? null;
}

export async function getAdminUserBusinessHistory(
  supabase: Supabase,
  userId: string,
): Promise<AdminUserBusinessHistory> {
  const { data, error } = await supabase.rpc("admin_user_business_history", {
    p_user_id: userId,
  });

  if (error) {
    return {
      has_history: true,
      protected_reference_count: 1,
    };
  }

  return (
    data?.[0] ?? {
      has_history: true,
      protected_reference_count: 1,
    }
  );
}
