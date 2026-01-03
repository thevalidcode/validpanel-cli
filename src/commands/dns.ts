import shell from "shelljs";
import Logger from "../utils/Logger";
import { parse } from "tldts";

/**
 * Utility function to run a pdnsutil command safely
 * @param command The pdnsutil command to run (without `pdnsutil`)
 * @returns stdout from the command
 */
function runPdnsCommand(command: string): string {
  Logger.info(`Running: pdnsutil ${command}`);

  const result = shell.exec(`sudo pdnsutil ${command}`, { silent: true });

  if (result.code !== 0) {
    Logger.error(`pdnsutil failed: ${result.stderr}`);
    throw new Error(result.stderr || "Unknown pdnsutil error");
  }

  return result.stdout.trim();
}

export function getZone(domain: string): string {
  // Extract the registrable domain (handles subdomains and complex TLDs)
  // e.g., "www.example.com" -> "example.com"
  // e.g., "api.mystore.validpanel.com" -> "validpanel.com"
  // e.g., "example.validplug.com.ng" -> "validplug.com.ng"
  const parsed = parse(domain);
  if (!parsed.domain) {
    throw new Error(`Invalid domain: ${domain}`);
  }
  return parsed.domain;
}

/**
 * Add a new DNS record
 * @param domain FQDN (e.g., www.example.com)
 * @param type Record type (A, AAAA, TXT, MX, etc.)
 * @param value Record value (IP, text, etc.)
 * @param ttl Time to live in seconds
 */
export function addDnsRecord(
  domain: string,
  type: string,
  value: string,
  ttl = 300
) {
  const zone = getZone(domain); // validpanel.com

  let recordName = domain
    .replace(new RegExp(`\\.?${zone}$`), "") // remove ".validpanel.com"
    .replace(/\.$/, ""); // safety cleanup

  if (!recordName) {
    recordName = "@";
  }

  Logger.info(
    `Adding DNS record: zone=${zone}, name=${recordName}, type=${type}, value=${value}`
  );

  runPdnsCommand(
    `add-record ${zone} ${recordName} ${type} ${ttl} ${value}`
  );

  Logger.success(
    `DNS record added: ${recordName}.${zone} ${type} ${value}`
  );
}

/**
 * Delete a DNS record
 * @param domain FQDN
 * @param type Record type to delete
 */
export function deleteDnsRecord(domain: string, type: string) {
  const zone = getZone(domain); // validpanel.com

  let recordName = domain
    .replace(new RegExp(`\\.?${zone}$`), "")
    .replace(/\.$/, "");

  if (!recordName) {
    recordName = "@";
  }

  Logger.info(
    `Deleting DNS record: zone=${zone}, name=${recordName}, type=${type}`
  );

  runPdnsCommand(
    `delete-rrset ${zone} ${recordName} ${type}`
  );

  Logger.success(
    `DNS record deleted: ${recordName}.${zone} ${type}`
  );
}


/**
 * Update a DNS record by deleting and re-adding it
 * @param domain FQDN
 * @param type Record type
 * @param newValue New record value
 * @param ttl TTL (default 300)
 */
export function updateDnsRecord(
  domain: string,
  type: string,
  newValue: string,
  ttl = 300
) {
  const zone = getZone(domain);
  let recordName = domain.replace(new RegExp(`\\.?${zone}$`), "").replace(/\.$/, "");
  if (!recordName) recordName = "@";

  Logger.info(`Updating DNS record: ${recordName}.${zone} ${type} -> ${newValue}`);

  // Step 1: Fetch all existing records in zone
  const zoneRecords = runPdnsCommand(`list-zone ${zone}`).split("\n");

  // Step 2: Extract current values for this record name + type
  const existingValues: string[] = [];
  const recordRegex = new RegExp(`^${recordName}\\s+${type}\\s+`, "i");

  for (const line of zoneRecords) {
    if (recordRegex.test(line)) {
      const parts = line.trim().split(/\s+/);
      existingValues.push(parts[2]); // value is always the 3rd column
    }
  }

  // Step 3: If newValue already exists, do nothing
  if (existingValues.includes(newValue)) {
    Logger.info(`Record already exists with same value. No changes made.`);
    return;
  }

  // Step 4: Delete old RRSET if it exists
  if (existingValues.length > 0) {
    runPdnsCommand(`delete-rrset ${zone} ${recordName} ${type}`);
    Logger.info(`Deleted old ${type} records for ${recordName}.${zone}`);
  }

  // Step 5: Add back all previous values except duplicates + new value
  for (const val of existingValues) {
    runPdnsCommand(`add-record ${zone} ${recordName} ${type} ${ttl} ${val}`);
  }

  // Step 6: Add the new value
  runPdnsCommand(`add-record ${zone} ${recordName} ${type} ${ttl} ${newValue}`);

  Logger.success(`DNS record updated safely: ${recordName}.${zone} ${type} ${newValue}`);
}

/**
 * List all records in a zone
 * @param zone The zone to list (e.g., example.com)
 */
export function listZoneRecords(zone: string): string {
  Logger.info(`Listing records for zone: ${zone}`);

  const output = runPdnsCommand(`list-zone ${zone}`);

  Logger.success(`Zone records retrieved for: ${zone}`);
  return output;
}

/**
 * Create a new zone with two default nameservers (ns1 & ns2)
 * @param zone The domain name of the zone (e.g., example.com)
 */
export function createZone(zone: string) {
  const ns1 = "ns1.validpanel.com";
  const ns2 = "ns2.validpanel.com";

  Logger.info(`Creating new zone: ${zone} with NS: ${ns1}, ${ns2}`);

  // Create zone with first NS
  runPdnsCommand(`create-zone ${zone} ${ns1}`);

  // Add second NS at zone apex
  runPdnsCommand(`add-record ${zone} @ NS ${ns2}`);

  Logger.success(`Zone created: ${zone} with NS: ${ns1}, ${ns2}`);
}


/**
 * Delete a zone
 * @param zone Zone to delete
 */
export function deleteZone(zone: string) {
  Logger.info(`Deleting zone: ${zone}`);

  runPdnsCommand(`delete-zone ${zone}`);

  Logger.success(`Zone deleted: ${zone}`);
}
