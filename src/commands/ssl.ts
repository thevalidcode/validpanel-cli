import shell from "shelljs";
import Logger from "../utils/Logger";

export async function issueSslCertificate(domain: string) {
  Logger.info(`Issuing SSL certificate for ${domain}`);

  const result = shell.exec(`acme.sh --issue -d ${domain} -w /var/www/${domain}/public`);
  if (result.code !== 0) {
    Logger.error("SSL issuance failed");
    process.exit(1);
  }

  shell.exec(`acme.sh --install-cert -d ${domain} \
    --key-file /etc/ssl/private/${domain}.key \
    --fullchain-file /etc/ssl/certs/${domain}.crt \
    --reloadcmd "systemctl reload apache2"`);

  Logger.success(`SSL certificate installed for ${domain}`);
}
