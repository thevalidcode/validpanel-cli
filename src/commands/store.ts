import shell from "shelljs";
import Logger from "../utils/Logger";
import {
  createZone,
  deleteZone,
  addDnsRecord,
  deleteDnsRecord,
  getZone,
} from "./dns";
import {
  createCaddyConfig,
  deleteCaddyConfig,
  reloadCaddy,
  validateCaddyConfig,
} from "./caddy";
import { env } from "../config/env.config";

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
  "social-media-store": env.SOCIAL_MEDIA_STORE_PORT,
  shop: env.SHOP_PORT,
} as const;

type StoreType = keyof typeof storeConfigs;

/**
 * Add a new store (DNS + Caddy)
 */
export async function addStore(domain: string, storeType: StoreType) {
  Logger.info(`🚀 Adding ${storeType} store for domain: ${domain}`);

  const port = storeConfigs[storeType];

  // 1. Determine if domain is a subdomain of an existing zone or needs its own zone
  const domainZone = getZone(domain);
  const isSubdomain = domain !== domainZone;

  if (!isSubdomain) {
    // Only create zone if it's a root domain, not a subdomain
    try {
      createZone(domain);
    } catch (err: any) {
      if (err.message.includes("exists")) {
        Logger.warn(`Zone already exists for ${domain}, skipping creation`);
      } else {
        throw err;
      }
    }
  } else {
    Logger.info(
      `Subdomain detected (${domain} -> zone: ${domainZone}), skipping zone creation`
    );
  }

  // 2. Add DNS records (A + www)
  addDnsRecord(domain, "A", SERVER_IP);
  addDnsRecord(`www.${domain}`, "A", SERVER_IP);
  addDnsRecord(`api.${domain}`, "A", SERVER_IP);

  // 3. Create Caddy config
  await createCaddyConfig(domain, storeType, port);

  // 4. Reload Caddy if config is valid
  if (validateCaddyConfig()) reloadCaddy();

  Logger.success(`✅ Store added: ${domain} (${storeType}) → ports ${port}}`);
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
