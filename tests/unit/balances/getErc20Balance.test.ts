import { getErc20Balance } from "../../../src";
import { createPublicClient, http, type Address } from "viem";
import { base, mainnet } from "viem/chains";

describe("getErc20Balance", () => {
  const baseClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL ?? "https://localhost:8545")
  });

  const ethClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.ETH_RPC_URL ?? "https://localhost:8545")
  });

  it("should return the balance for the owner", async () => {
    const tokenAddress: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const ownerAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const balance = await getErc20Balance(
      baseClient,
      tokenAddress,
      ownerAddress
    );
    expect(balance).toBeDefined();
    expect(balance.toString()).toBe("8600000");
  }, 120000);

  it("[vyper] should return the balance for the owner", async () => {
    const tokenAddress: Address = "0xD533a949740bb3306d119CC777fa900bA034cd52";
    const ownerAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const balance = await getErc20Balance(
      ethClient,
      tokenAddress,
      ownerAddress
    );
    expect(balance).toBeDefined();
    expect(balance.toString()).toBe("45868293345383087538");
  }, 120000);
});