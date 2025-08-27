import { generateMockBalanceData } from "../../../src";
import { createPublicClient, http, type Address, getAddress } from "viem";
import { base, mainnet } from "viem/chains";

describe("generateMockBalanceData", () => {
  const baseClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL ?? "https://localhost:8545")
  });

  const ethClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.ETH_RPC_URL ?? "https://localhost:8545")
  });

  it("should generate mock balance data", async () => {
    const tokenAddress: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const holderAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const mockAddress: Address = "0x3e34b27a9bf37D8424e1a58aC7fc4D06914B76B9";
    const mockBalanceAmount = "9600000";
    const maxSlots = 30;

    const data = await generateMockBalanceData(baseClient, {
      tokenAddress,
      holderAddress,
      mockAddress,
      mockBalanceAmount,
      maxSlots,
    });
    expect(data).toBeDefined();
    expect(data.slot).toBeDefined();
    expect(data.balance).toBeDefined();
  }, 120000);

  it("[vyper] should generate mock balance data", async () => {
    const tokenAddress: Address = "0xD533a949740bb3306d119CC777fa900bA034cd52";
    const holderAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const mockAddress: Address = getAddress(`0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`);
    const mockBalanceAmount = "1000000";
    const maxSlots = 30;

    const data = await generateMockBalanceData(ethClient, {
      tokenAddress,
      holderAddress,
      mockAddress,
      mockBalanceAmount,
      maxSlots,
    });
    expect(data).toBeDefined();
    expect(data.slot).toBeDefined();
    expect(data.balance).toBeDefined();
    expect(data.isVyper).toBe(true);
  }, 120000);
});
