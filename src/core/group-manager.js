/**
 * DemicubeOS User Groups & Registry System
 * Handles parsing, serialization, and membership logic for /etc/group/system_groups.reg
 */

export const SYSTEM_GROUPS_REG_PATH = "/etc/group/system_groups.reg";

/**
 * Standard registry header and formatting
 * Generates an authentic .reg / INI configuration file
 */
export function serializeSystemGroups(groups) {
  const lines = [
    "; DemicubeOS System Groups Registry",
    "; File: /etc/group/system_groups.reg",
    ""
  ];

  for (const group of groups) {
    if (!group || !group.name) continue;
    lines.push(`[${group.name}]`);
    lines.push(`sudo=${group.sudo ? "true" : "false"}`);
    lines.push(`users=${(group.users || []).join(",")}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

/**
 * Parses INI/REG format from /etc/group/system_groups.reg
 */
export function parseSystemGroups(content) {
  if (!content || typeof content !== "string") {
    return [];
  }

  const groups = [];
  let currentGroup = null;

  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) {
      continue;
    }

    const sectionMatch = line.match(/^\[(?:group\.)?([a-zA-Z0-9_\-]+)\]$/i);
    if (sectionMatch) {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        name: sectionMatch[1],
        sudo: false,
        users: []
      };
      continue;
    }

    if (currentGroup) {
      const eqIdx = line.indexOf("=");
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim().toLowerCase();
        const val = line.slice(eqIdx + 1).trim();

        if (key === "sudo") {
          currentGroup.sudo = val.toLowerCase() === "true" || val === "1";
        } else if (key === "users" || key === "members") {
          const userList = val
            .split(/[,;\s]+/)
            .map((u) => u.trim())
            .filter(Boolean);
          currentGroup.users = Array.from(new Set([...currentGroup.users, ...userList]));
        }
      }
    }
  }

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Generates default group definitions from a list of user objects or user names
 */
export function generateDefaultGroups(users = []) {
  const groups = [
    {
      name: "admin",
      sudo: true,
      users: ["admin"]
    }
  ];

  for (const user of users) {
    const uname = typeof user === "string" ? user : user?.username || user?.id;
    if (!uname || uname === "admin" || uname === "root") continue;

    if (!groups.some((g) => g.name === uname)) {
      groups.push({
        name: uname,
        sudo: false,
        users: [uname]
      });
    }
  }

  return groups;
}

/**
 * Retrieves all group names that the user belongs to.
 * Invariant: Every user is ALWAYS a member of their own primary group.
 */
export function getUserGroups(groups, username) {
  if (!username) return [];
  const user = username.trim();
  const matched = new Set();

  // Primary group: each user is always part of their own name's group
  matched.add(user);

  if (Array.isArray(groups)) {
    for (const g of groups) {
      if (Array.isArray(g.users) && g.users.includes(user)) {
        matched.add(g.name);
      }
    }
  }

  // Root always possesses administrative privileges
  if (user === "root") {
    matched.add("root");
    matched.add("admin");
    matched.add("wheel");
    matched.add("sudo");
  }

  return Array.from(matched);
}

/**
 * Checks if the user has sudo privilege according to system_groups.reg definitions
 */
export function isUserSudoer(groups, username) {
  if (!username) return false;
  if (username === "root") return true;

  const userGroups = getUserGroups(groups, username);
  if (Array.isArray(groups)) {
    for (const g of groups) {
      if (g.sudo && userGroups.includes(g.name)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Appends an additional group to a user (usermod -aG <group> <user>)
 */
export function appendGroupToUser(groups, groupName, username) {
  if (!groupName || !username) {
    return { success: false, error: "missing group or username argument" };
  }

  let targetGroup = groups.find((g) => g.name.toLowerCase() === groupName.toLowerCase());
  if (!targetGroup) {
    return { success: false, error: `group '${groupName}' does not exist` };
  }

  if (!Array.isArray(targetGroup.users)) {
    targetGroup.users = [];
  }

  if (!targetGroup.users.includes(username)) {
    targetGroup.users.push(username);
  }

  return { success: true, group: targetGroup };
}

/**
 * Removes a user from an additional group (usermod -rm <group> <user>)
 * Invariant: Users must not be able to be removed from their own group!
 */
export function removeGroupFromUser(groups, groupName, username) {
  if (!groupName || !username) {
    return { success: false, error: "missing group or username argument" };
  }

  // Mandatory invariant: cannot remove user from their own primary group
  if (groupName.toLowerCase() === username.toLowerCase()) {
    return {
      success: false,
      error: `cannot remove user '${username}' from their primary group '${groupName}'`
    };
  }

  let targetGroup = groups.find((g) => g.name.toLowerCase() === groupName.toLowerCase());
  if (!targetGroup) {
    return { success: false, error: `group '${groupName}' does not exist` };
  }

  if (!Array.isArray(targetGroup.users) || !targetGroup.users.includes(username)) {
    return { success: false, error: `user '${username}' is not a member of '${groupName}'` };
  }

  targetGroup.users = targetGroup.users.filter((u) => u !== username);
  return { success: true, group: targetGroup };
}
