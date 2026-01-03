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
  const parsed = parse(domain);
  if (!parsed.domain) {
    throw new Error(`Invalid domain: ${domain}`);
  }
  return parsed.domain; // e.g., validplug.com.ng
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
  const zone = getZone(domain); // example.com from www.example.com
  Logger.info(`Adding DNS record: ${domain} ${type} ${value}`);

  runPdnsCommand(`add-record ${zone} ${domain} ${type} ${ttl} ${value}`);

  Logger.success(`DNS record added: ${domain} ${type} ${value}`);
}

/**
 * Delete a DNS record
 * @param domain FQDN
 * @param type Record type to delete
 */
export function deleteDnsRecord(domain: string, type: string) {
  const zone = getZone(domain);
  Logger.info(`Deleting DNS record: ${domain} ${type}`);

  runPdnsCommand(`delete-rrset ${zone} ${domain} ${type}`);

  Logger.success(`DNS record deleted: ${domain} ${type}`);
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
  Logger.info(`Updating DNS record: ${domain} ${type} -> ${newValue}`);

  deleteDnsRecord(domain, type); // Remove old one
  addDnsRecord(domain, type, newValue, ttl); // Add new one

  Logger.success(`DNS record updated: ${domain} ${type} ${newValue}`);
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

  // Step 1: Create the zone with the primary NS
  runPdnsCommand(`create-zone ${zone} ${ns1}`);

  // Step 2: Add secondary NS record
  runPdnsCommand(`add-record ${zone} ${zone}. NS ${ns2}`);

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
