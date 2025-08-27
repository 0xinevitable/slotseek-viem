import { generateMockApprovalData } from "../../../src";
import { createPublicClient, http, type Address, getAddress } from "viem";
import { base, mainnet } from "viem/chains";

describe("generateMockApprovalData", () => {
  const baseClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL ?? "https://localhost:8545")
  });
  const ethClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.ETH_RPC_URL ?? "https://localhost:8545")
  });

  const mockAddress: Address = getAddress(`0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`);

  it("should generate mock approval data", async () => {
    const tokenAddress: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const ownerAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const spenderAddress: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const mockApprovalAmount = "1000000";
    const maxSlots = 30;

    const data = await generateMockApprovalData(baseClient, {
      tokenAddress,
      ownerAddress,
      spenderAddress,
      mockAddress,
      mockApprovalAmount,
      maxSlots,
    });
    expect(data).toBeDefined();
    expect(data.slot).toBeDefined();
    expect(data.approval).toBeDefined();
    expect(data.isVyper).toBe(false);
  }, 120000);

  it("[vyper] should generate mock approval data", async () => {
    const tokenAddress: Address = "0xD533a949740bb3306d119CC777fa900bA034cd52";
    const ownerAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const spenderAddress: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const mockAddress: Address = getAddress(`0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`);
    const mockApprovalAmount = "1000000";
    const maxSlots = 30;

    const data = await generateMockApprovalData(ethClient, {
      tokenAddress,
      ownerAddress,
      spenderAddress,
      mockAddress,
      mockApprovalAmount,
      maxSlots,
    });
    expect(data).toBeDefined();
    expect(data.slot).toBeDefined();
    expect(data.approval).toBeDefined();
    expect(data.isVyper).toBe(true);
  }, 120000);
});
