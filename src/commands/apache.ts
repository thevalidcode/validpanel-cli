import ejs from "ejs";
import fs from "fs";
import path from "path";
import shell from "shelljs";
import Logger from "../utils/Logger";

export async function setupApacheVhost(domain: string, proxyPass: string) {
  const templatePath = path.join(__dirname, "../templates/vhost.ejs");
  const vhostConfig = await ejs.renderFile(templatePath, { domain, proxyPass });

  const vhostFile = `/etc/apache2/sites-available/${domain}.conf`;
  fs.writeFileSync(vhostFile, vhostConfig);

  Logger.info(`Created vhost config for ${domain}`);

  shell.exec(`a2ensite ${domain}.conf`);
  shell.exec("systemctl reload apache2");

  Logger.success(`Apache vhost for ${domain} is live`);
}
