import shell from "shelljs";
import Logger from "../utils/Logger";

export async function addDnsRecord(domain: string, type: string, value: string) {
  Logger.info(`Adding DNS record: ${domain} ${type} ${value}`);

  const keyPath = "/etc/bind/tsig/validpanel-key.private";
  const zone = domain.split(".").slice(-2).join(".");

  const updateScript = `
server 127.0.0.1
zone ${zone}
update add ${domain}. 300 ${type} ${value}
send
`;

  shell.exec(`echo "${updateScript}" | nsupdate -k ${keyPath}`);

  Logger.success(`DNS record added: ${domain} ${type} ${value}`);
}
