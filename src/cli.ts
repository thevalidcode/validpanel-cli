#!/usr/bin/env ts-node

import { Command } from "commander";
import { addDnsRecord } from "./commands/dns";
import { setupApacheVhost } from "./commands/apache";
import { issueSslCertificate } from "./commands/ssl";
import { version } from "../package.json";

const program = new Command();

program
  .name("validpanel-cli")
  .description("CLI for managing DNS, Apache vhosts, and SSL")
  .version(version);

program
  .command("dns:add")
  .description("Add a DNS record")
  .argument("<domain>", "Domain name")
  .argument("<type>", "Record type (A, CNAME, MX, etc.)")
  .argument("<value>", "Record value")
  .action(addDnsRecord);

program
  .command("apache:vhost")
  .description("Create Apache vhost")
  .argument("<domain>", "Domain name")
  .argument("<proxyPass>", "Proxy backend (e.g. http://127.0.0.1:5000)")
  .action(setupApacheVhost);

program
  .command("ssl:issue")
  .description("Issue SSL certificate with acme.sh")
  .argument("<domain>", "Domain name")
  .action(issueSslCertificate);

program.parse();
