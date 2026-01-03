import ejs from "ejs";
import fs from "fs";
import path from "path";
import shell from "shelljs";
import Logger from "../utils/Logger";

// Path to your templates and config dir
const templatePath = path.join(__dirname, "../templates/caddy.ejs");
const sitesDir = "/etc/caddy/sites"; // we’ll store individual domain configs here

// Ensure sites directory exists
if (!fs.existsSync(sitesDir)) {
  fs.mkdirSync(sitesDir, { recursive: true });
}

/**
 * Render a config from template
 */
async function renderConfig(
  domain: string,
  storeType: "shop" | "social-media-store",
  primaryPort: number,
  secondaryPort: number
): Promise<string> {
  return ejs.renderFile(templatePath, {
    domain,
    storeType,
    primaryPort,
    secondaryPort,
  });
}

/**
 * Reload Caddy service
 */
export function reloadCaddy() {
  Logger.info("Reloading Caddy...");
  const result = shell.exec("sudo systemctl reload caddy", { silent: true });
  if (result.code !== 0) {
    Logger.error(`Failed to reload Caddy: ${result.stderr}`);
    throw new Error(result.stderr);
  }
  Logger.success("Caddy reloaded successfully");
}

/**
 * Validate Caddyfile before reload
 */
export function validateCaddyConfig(): boolean {
  Logger.info("Validating Caddyfile...");
  const result = shell.exec("caddy validate --config /etc/caddy/Caddyfile", {
    silent: true,
  });
  if (result.code !== 0) {
    Logger.error(`Caddy config validation failed: ${result.stderr}`);
    return false;
  }
  Logger.success("Caddy config is valid");
  return true;
}

/**
 * Create new site config
 */
export async function createCaddyConfig(
  domain: string,
  storeType: "shop" | "social-media-store",
  primaryPort: number,
  secondaryPort: number
) {
  Logger.info(`Creating Caddy config for ${domain}`);

  const config = await renderConfig(
    domain,
    storeType,
    primaryPort,
    secondaryPort
  );
  const siteFile = path.join(sitesDir, `${domain}.caddy`);

  fs.writeFileSync(siteFile, config);
  Logger.success(`Config written: ${siteFile}`);

  if (validateCaddyConfig()) reloadCaddy();
}

/**
 * Update site config (same as create but ensures overwrite)
 */
export async function updateCaddyConfig(
  domain: string,
  storeType: "shop" | "social-media-store",
  primaryPort: number,
  secondaryPort: number
) {
  Logger.info(`Updating Caddy config for ${domain}`);
  await createCaddyConfig(domain, storeType, primaryPort, secondaryPort);
  Logger.success(`Caddy config updated for ${domain}`);
}

/**
 * Delete a site config
 */
export function deleteCaddyConfig(domain: string) {
  Logger.info(`Deleting Caddy config for ${domain}`);

  const siteFile = path.join(sitesDir, `${domain}.caddy`);
  if (fs.existsSync(siteFile)) {
    fs.unlinkSync(siteFile);
    Logger.success(`Config removed: ${siteFile}`);
  } else {
    Logger.warn(`No config found for ${domain}`);
  }

  if (validateCaddyConfig()) reloadCaddy();
}

/**
 * List all site configs
 */
export function listCaddyConfigs(): string[] {
  Logger.info("Listing all Caddy site configs...");
  const files = fs.readdirSync(sitesDir).filter((f) => f.endsWith(".caddy"));
  Logger.success(`Found ${files.length} site configs`);
  return files;
}

/**
 * Enable site (symlink to main config if using sites-enabled style)
 */
export function enableSite(domain: string) {
  Logger.info(`Enabling site: ${domain}`);
  // in our case we rebuild Caddyfile from sitesDir, so enabling = exists
  if (!fs.existsSync(path.join(sitesDir, `${domain}.caddy`))) {
    Logger.error(`Site ${domain} does not exist`);
    throw new Error(`Site not found: ${domain}`);
  }
  if (validateCaddyConfig()) reloadCaddy();
  Logger.success(`Site enabled: ${domain}`);
}

/**
 * Disable site (remove its config temporarily)
 */
export function disableSite(domain: string) {
  Logger.info(`Disabling site: ${domain}`);
  const siteFile = path.join(sitesDir, `${domain}.caddy`);
  if (fs.existsSync(siteFile)) {
    fs.renameSync(siteFile, `${siteFile}.disabled`);
    Logger.success(`Site disabled: ${domain}`);
    if (validateCaddyConfig()) reloadCaddy();
  } else {
    Logger.warn(`Site config not found for ${domain}`);
  }
}
