"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  canHardDeleteUser,
  canMutateAdminTarget,
  getAdminUser,
  getAdminUserBusinessHistory,
  normalizeProfileUpdateInput,
} from "@/lib/admin/user-management";
import { isUserRole, type AccountStatus } from "@/lib/auth/user-shared";
import { logAdminUserAudit } from "@/lib/observability/server-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function userRedirect(userId: string, params: Record<string, string>): never {
  const searchParams = new URLSearchParams(params);

  redirect(`/admin/users/${userId}?${searchParams.toString()}`);
}

function usersRedirect(params: Record<string, string>): never {
  const searchParams = new URLSearchParams(params);

  redirect(`/admin/users?${searchParams.toString()}`);
}

async function requireMutableTarget(userId: string) {
  const adminContext = await requireAdmin();
  const target = await getAdminUser(adminContext.supabase, userId);

  if (!target || !isUserRole(target.role)) {
    userRedirect(userId, {
      error: "We could not load that user account.",
    });
  }

  if (!canMutateAdminTarget(target.role)) {
    userRedirect(userId, {
      error: "Admin accounts cannot be changed through generic user management.",
    });
  }

  return {
    actorUserId: adminContext.userId,
    target,
  };
}

export async function updateAdminUser(formData: FormData) {
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const parsed = normalizeProfileUpdateInput({
    accountStatus: String(formData.get("accountStatus") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    role: String(formData.get("role") ?? ""),
    username: String(formData.get("username") ?? ""),
  });

  if (!targetUserId) {
    usersRedirect({
      error: "We could not update that user account.",
    });
  }

  if (!parsed) {
    userRedirect(targetUserId, {
      error: "Check the profile details and try again.",
    });
  }

  const { actorUserId, target } = await requireMutableTarget(targetUserId);
  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({
      account_status: parsed.accountStatus,
      full_name: parsed.fullName,
      role: parsed.role,
      username: parsed.username,
    })
    .eq("id", target.id);

  if (error) {
    userRedirect(target.id, {
      error: "We could not update that user account.",
    });
  }

  logAdminUserAudit({
    actorUserId,
    event:
      parsed.accountStatus === "deactivated" &&
      target.account_status !== "deactivated"
        ? "admin_user_deactivated"
        : parsed.accountStatus === "active" && target.account_status !== "active"
          ? "admin_user_reactivated"
          : "admin_user_updated",
    targetUserId: target.id,
  });

  userRedirect(target.id, {
    message: "User account updated.",
  });
}

async function setAdminUserStatus({
  status,
  targetUserId,
}: {
  status: AccountStatus;
  targetUserId: string;
}) {
  const { actorUserId, target } = await requireMutableTarget(targetUserId);
  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({
      account_status: status,
    })
    .eq("id", target.id);

  if (error) {
    userRedirect(target.id, {
      error: "We could not update that user account.",
    });
  }

  logAdminUserAudit({
    actorUserId,
    event:
      status === "deactivated"
        ? "admin_user_deactivated"
        : "admin_user_reactivated",
    targetUserId: target.id,
  });

  userRedirect(target.id, {
    message:
      status === "deactivated"
        ? "User account deactivated."
        : "User account reactivated.",
  });
}

export async function deactivateAdminUser(formData: FormData) {
  const targetUserId = String(formData.get("targetUserId") ?? "");

  if (!targetUserId) {
    usersRedirect({
      error: "We could not update that user account.",
    });
  }

  await setAdminUserStatus({
    status: "deactivated",
    targetUserId,
  });
}

export async function reactivateAdminUser(formData: FormData) {
  const targetUserId = String(formData.get("targetUserId") ?? "");

  if (!targetUserId) {
    usersRedirect({
      error: "We could not update that user account.",
    });
  }

  await setAdminUserStatus({
    status: "active",
    targetUserId,
  });
}

export async function deleteAdminUser(formData: FormData) {
  const targetUserId = String(formData.get("targetUserId") ?? "");

  if (!targetUserId) {
    usersRedirect({
      error: "We could not delete that user account.",
    });
  }

  const adminContext = await requireAdmin();
  const target = await getAdminUser(adminContext.supabase, targetUserId);

  if (!target || !isUserRole(target.role)) {
    userRedirect(targetUserId, {
      error: "We could not load that user account.",
    });
  }

  const history = await getAdminUserBusinessHistory(
    adminContext.supabase,
    target.id,
  );

  if (
    !canHardDeleteUser({
      hasHistory: history.has_history,
      role: target.role,
    })
  ) {
    userRedirect(target.id, {
      error:
        target.role === "admin"
          ? "Admin accounts cannot be deleted."
          : "This user has business history. Deactivate the account instead.",
    });
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(target.id);

  if (error) {
    userRedirect(target.id, {
      error: "We could not delete that user account.",
    });
  }

  logAdminUserAudit({
    actorUserId: adminContext.userId,
    event: "admin_user_deleted",
    targetUserId: target.id,
  });

  usersRedirect({
    message: "User account deleted.",
  });
}
