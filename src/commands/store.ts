import shell from "shelljs";
import Logger from "../utils/Logger";
import { createZone, deleteZone, addDnsRecord, deleteDnsRecord } from "./dns";
import {
  createCaddyConfig,
  deleteCaddyConfig,
  reloadCaddy,
  validateCaddyConfig,
} from "./caddy";

/**
 * Detect server's public IP once at startup
 */
function getPublicIp(): string {
  const result = shell.exec("curl -s ifconfig.me", { silent: true });
  if (result.code !== 0 || !result.stdout.trim()) {
    throw new Error("Failed to detect public IP");
  }
  return result.stdout.trim();
}

const SERVER_IP = getPublicIp();

/**
 * Store configuration map
 */
const storeConfigs = {
  "social-media-store": { primary: 6060, secondary: 4040 },
  shop: { primary: 7030, secondary: 5020 },
} as const;

type StoreType = keyof typeof storeConfigs;

/**
 * Add a new store (DNS + Caddy)
 */
export async function addStore(domain: string, storeType: StoreType) {
  Logger.info(`🚀 Adding ${storeType} store for domain: ${domain}`);

  const { primary, secondary } = storeConfigs[storeType];

  // 1. Create zone if it doesn’t exist
  try {
    createZone(domain);
  } catch (err: any) {
    if (err.message.includes("exists")) {
      Logger.warn(`Zone already exists for ${domain}, skipping creation`);
    } else {
      throw err;
    }
  }

  // 2. Add DNS records (A + www)
  addDnsRecord(domain, "A", SERVER_IP);
  addDnsRecord(`www.${domain}`, "A", SERVER_IP);

  // 3. Create Caddy config
  await createCaddyConfig(domain, storeType, primary, secondary);

  // 4. Reload Caddy if config is valid
  if (validateCaddyConfig()) reloadCaddy();

  Logger.success(
    `✅ Store added: ${domain} (${storeType}) → ports ${primary}/${secondary}`
  );
}

/**
 * Remove an existing store (DNS + Caddy)
 */
export function removeStore(domain: string, storeType: StoreType) {
  Logger.info(`🗑️ Removing ${storeType} store for domain: ${domain}`);

  // 1. Delete DNS records
  try {
    deleteDnsRecord(domain, "A");
    deleteDnsRecord(`www.${domain}`, "A");
  } catch (err) {
    Logger.warn(`DNS records may not exist for ${domain}`);
  }

  // 2. Delete zone
  try {
    deleteZone(domain);
  } catch (err) {
    Logger.warn(`Zone may not exist for ${domain}`);
  }

  // 3. Delete Caddy config
  deleteCaddyConfig(domain);

  Logger.success(`❌ Store removed: ${domain} (${storeType})`);
}

/**
 * Rebuild all stores (if needed after crash/migration)
 */
export function rebuildStores(stores: { domain: string; type: StoreType }[]) {
  Logger.info(`🔄 Rebuilding ${stores.length} stores...`);

  for (const store of stores) {
    addStore(store.domain, store.type);
  }

  Logger.success("🎉 All stores rebuilt successfully");
}
