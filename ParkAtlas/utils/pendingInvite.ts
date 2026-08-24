let pendingInviteCode: string | null = null;

export function setPendingInviteCode(inviteCode: string): void {
  const normalized = inviteCode.trim();
  pendingInviteCode = normalized.length > 0 ? normalized : null;
}

export function consumePendingInviteCode(): string | null {
  const value = pendingInviteCode;
  pendingInviteCode = null;
  return value;
}

export function peekPendingInviteCode(): string | null {
  return pendingInviteCode;
}
