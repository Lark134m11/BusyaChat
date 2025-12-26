import { ServerRole } from '@prisma/client';

export type ServerPermission =
  | 'MANAGE_SERVER'
  | 'MANAGE_ROLES'
  | 'MANAGE_CHANNELS'
  | 'KICK_MEMBERS'
  | 'BAN_MEMBERS'
  | 'VIEW_CHANNEL'
  | 'SEND_MESSAGES';

const ROLE_PRIORITY: Record<ServerRole, number> = {
  MEMBER: 0,
  MOD: 1,
  ADMIN: 2,
  OWNER: 3,
};

const ROLE_PERMISSIONS: Record<ServerRole, ServerPermission[]> = {
  OWNER: [
    'MANAGE_SERVER',
    'MANAGE_ROLES',
    'MANAGE_CHANNELS',
    'KICK_MEMBERS',
    'BAN_MEMBERS',
    'VIEW_CHANNEL',
    'SEND_MESSAGES',
  ],
  ADMIN: [
    'MANAGE_SERVER',
    'MANAGE_ROLES',
    'MANAGE_CHANNELS',
    'KICK_MEMBERS',
    'BAN_MEMBERS',
    'VIEW_CHANNEL',
    'SEND_MESSAGES',
  ],
  MOD: ['MANAGE_CHANNELS', 'KICK_MEMBERS', 'BAN_MEMBERS', 'VIEW_CHANNEL', 'SEND_MESSAGES'],
  MEMBER: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
};

export function hasAtLeastRole(role: ServerRole, minRole: ServerRole): boolean {
  return ROLE_PRIORITY[role] >= ROLE_PRIORITY[minRole];
}

export function roleHasPermission(role: ServerRole, permission: ServerPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isHigherRole(actor: ServerRole, target: ServerRole): boolean {
  return ROLE_PRIORITY[actor] > ROLE_PRIORITY[target];
}
