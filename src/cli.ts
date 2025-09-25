#!/usr/bin/env node

import { Command } from "commander";
import { version } from "../package.json";
import { addStore, rebuildStores, removeStore } from "./commands/store";

const program = new Command();

program
  .name("validpanel-cli")
  .description("Validpanel CLI for managing DNS and caddy configs for stores")
  .version(version);

program
  .command("stores:add")
  .description("Add a store")
  .argument("<domain>", "Domain name")
  .argument("<storeType>", "Type of store (e.g., 'social-media-store', 'shop')")
  .action(addStore);

program
  .command("stores:delete")
  .description("Delete a store")
  .argument("<domain>", "Domain name")
  .argument("<storeType>", "Type of store (e.g., 'social-media-store', 'shop')")
  .action(removeStore);

program
  .command("stores:rebuild")
  .description("Rebuild all stores (if needed after crash/migration)")
  .argument("<stores>", "JSON array of stores with domain and type")
  .action(rebuildStores);

program.parse();
