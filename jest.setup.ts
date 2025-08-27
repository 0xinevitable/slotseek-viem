import dotenv from "dotenv";

dotenv.config({ path: ".env" });

if (!process.env.BASE_RPC_URL || !process.env.ETH_RPC_URL) {
  throw new Error("RPC_URL is not set in the environment");
}

// Increase the Jest timeout for tests that make RPC calls
jest.setTimeout(120000);